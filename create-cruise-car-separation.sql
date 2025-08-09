-- 🚗 크루즈 차량 분리 시스템 구축 SQL 스크립트
-- 날짜: 2025.08.09
-- 목적: 크루즈 예약에서 차량을 별도 테이블로 분리하여 관리

-- 1. 새로운 크루즈 차량 예약 테이블 생성
CREATE TABLE IF NOT EXISTS public.reservation_cruise_car (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL,
    car_price_code TEXT,
    car_count INTEGER DEFAULT 0,
    passenger_count INTEGER DEFAULT 0,
    pickup_datetime TIMESTAMP WITHOUT TIME ZONE,
    pickup_location TEXT,
    dropoff_location TEXT,
    car_total_price NUMERIC(10,2) DEFAULT 0,
    request_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 외래키 제약조건
    CONSTRAINT fk_cruise_car_reservation 
        FOREIGN KEY (reservation_id) 
        REFERENCES public.reservation(re_id) 
        ON DELETE CASCADE
);

-- 2. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_cruise_car_reservation_id 
    ON public.reservation_cruise_car(reservation_id);
CREATE INDEX IF NOT EXISTS idx_cruise_car_created_at 
    ON public.reservation_cruise_car(created_at);

-- 3. RLS 정책 설정 (Row Level Security)
ALTER TABLE public.reservation_cruise_car ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 예약에 연결된 차량만 접근 가능
CREATE POLICY "cruise_car_owner_access" ON public.reservation_cruise_car
    FOR ALL 
    TO authenticated
    USING (
        reservation_id IN (
            SELECT re_id 
            FROM public.reservation 
            WHERE re_user_id = auth.uid()
        )
    );

-- 매니저와 관리자는 모든 크루즈 차량 예약 접근 가능
CREATE POLICY "cruise_car_manager_admin_access" ON public.reservation_cruise_car
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('manager', 'admin')
        )
    );

-- 4. 기존 데이터 마이그레이션 (차량 데이터가 있는 경우)
-- 크루즈 예약에서 차량 정보를 새 테이블로 이동
INSERT INTO public.reservation_cruise_car (
    reservation_id,
    car_price_code,
    car_count,
    passenger_count,
    pickup_datetime,
    pickup_location,
    dropoff_location,
    car_total_price,
    request_note
)
SELECT DISTINCT ON (reservation_id)
    reservation_id,
    car_price_code,
    car_count,
    passenger_count,
    pickup_datetime,
    pickup_location,
    dropoff_location,
    car_total_price,
    CASE 
        WHEN car_price_code IS NOT NULL 
        THEN CONCAT('크루즈 연계 차량: ', car_count, '대 - ', passenger_count, '명')
        ELSE NULL 
    END as request_note
FROM public.reservation_cruise
WHERE car_price_code IS NOT NULL
  AND car_count > 0;

-- 5. 크루즈 테이블에서 차량 관련 컬럼 삭제
-- 주의: 데이터 백업 후 실행하세요!
ALTER TABLE public.reservation_cruise 
    DROP COLUMN IF EXISTS car_price_code,
    DROP COLUMN IF EXISTS car_count,
    DROP COLUMN IF EXISTS passenger_count,
    DROP COLUMN IF EXISTS pickup_datetime,
    DROP COLUMN IF EXISTS pickup_location,
    DROP COLUMN IF EXISTS dropoff_location,
    DROP COLUMN IF EXISTS car_total_price;

-- 6. 트리거 생성 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_reservation_cruise_car_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER trigger_update_cruise_car_updated_at
    BEFORE UPDATE ON public.reservation_cruise_car
    FOR EACH ROW
    EXECUTE FUNCTION update_reservation_cruise_car_updated_at();

-- 7. 테이블 코멘트 추가
COMMENT ON TABLE public.reservation_cruise_car IS '크루즈 예약 연계 차량 서비스 테이블 - 크루즈와 별도 관리';
COMMENT ON COLUMN public.reservation_cruise_car.reservation_id IS '메인 예약 ID (reservation.re_id 참조)';
COMMENT ON COLUMN public.reservation_cruise_car.car_price_code IS '차량 가격 코드 (car_price 테이블 참조)';
COMMENT ON COLUMN public.reservation_cruise_car.car_count IS '예약 차량 대수';
COMMENT ON COLUMN public.reservation_cruise_car.passenger_count IS '총 승객 수';
COMMENT ON COLUMN public.reservation_cruise_car.pickup_datetime IS '픽업 일시';
COMMENT ON COLUMN public.reservation_cruise_car.pickup_location IS '픽업 장소';
COMMENT ON COLUMN public.reservation_cruise_car.dropoff_location IS '드롭오프 장소';
COMMENT ON COLUMN public.reservation_cruise_car.car_total_price IS '차량 총 금액';
COMMENT ON COLUMN public.reservation_cruise_car.request_note IS '차량 서비스 요청사항';

-- 8. 권한 설정
GRANT ALL ON public.reservation_cruise_car TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 실행 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ 크루즈 차량 분리 시스템 구축 완료!';
    RAISE NOTICE '📋 새 테이블: reservation_cruise_car';
    RAISE NOTICE '🔄 데이터 마이그레이션: 기존 차량 데이터 이동 완료';
    RAISE NOTICE '🗑️ 크루즈 테이블: 차량 관련 컬럼 삭제 완료';
    RAISE NOTICE '🔒 RLS 정책: 사용자/매니저/관리자 권한 설정 완료';
END $$;
