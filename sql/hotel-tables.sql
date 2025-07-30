-- 호텔 예약 시스템을 위한 테이블 생성 및 수정

-- 1. hotel_price 테이블에 schedule_code 컬럼 추가 (필터링용)
-- 일정(schedule_code) 컬럼은 더 이상 사용하지 않음. (필터링에서 제외)
-- ALTER TABLE hotel_price ADD COLUMN IF NOT EXISTS schedule_code TEXT;

-- 2. hotel_price 테이블 샘플 데이터 (일정, 체크인 날짜 기준 필터링을 위해)
INSERT INTO hotel_price (code, hotel_name, room_name, room_type, price, start_date, end_date, weekday) VALUES
('HP001', '그랜드 호텔 도쿄', '디럭스 룸', 'deluxe', 250000, '2025-01-01', '2025-03-31', 'weekday'),
('HP002', '그랜드 호텔 도쿄', '스탠다드 룸', 'standard', 180000, '2025-01-01', '2025-03-31', 'weekday'),
('HP003', '오사카 로얄 호텔', '스위트 룸', 'suite', 400000, '2025-02-01', '2025-04-30', 'weekday'),
('HP004', '오사카 로얄 호텔', '디럭스 룸', 'deluxe', 300000, '2025-02-01', '2025-04-30', 'weekday'),
('HP005', '부산 시티 호텔', '스탠다드 룸', 'standard', 120000, '2025-01-15', '2025-06-15', 'weekday'),
('HP006', '부산 시티 호텔', '디럭스 룸', 'deluxe', 200000, '2025-01-15', '2025-06-15', 'weekday');

-- 3. hotel_info 테이블 샘플 데이터 보완
INSERT INTO hotel_info (code, name, location, star_rating, description) VALUES
('H001', '그랜드 호텔 도쿄', '도쿄 신주쿠', 5, '도쿄 중심가의 최고급 호텔'),
('H002', '오사카 로얄 호텔', '오사카 우메다', 4, '오사카의 프리미엄 비즈니스 호텔'),
('H003', '부산 시티 호텔', '부산 해운대', 4, '해운대 해변가의 모던 호텔')
ON CONFLICT (code) DO NOTHING;


-- 4-1. quote_car 테이블에 사용일시(usage_datetime) 컬럼 추가
ALTER TABLE quote_car ADD COLUMN IF NOT EXISTS usage_datetime TIMESTAMP;
-- 사용일시: 차량 이용 시작일시(예: 2025-08-01 10:00:00)

-- 5. 필요한 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_hotel_price_date ON hotel_price(start_date, end_date);
-- 호텔명 목록 필터링 예시 (SQL)
-- 체크인 날짜 기준으로만 호텔명 목록을 추출 (일정(schedule_code)와 무관)
-- 예시: 체크인 날짜가 '2025-02-15'인 경우
SELECT DISTINCT hotel_name FROM hotel_price WHERE '2025-02-15' BETWEEN start_date AND end_date;
CREATE INDEX IF NOT EXISTS idx_hotel_price_hotel_name ON hotel_price(hotel_name);
CREATE INDEX IF NOT EXISTS idx_quote_hotel_quote_id ON quote_hotel(quote_id);

-- 6. RLS (Row Level Security) 정책 설정
ALTER TABLE quote_hotel ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 견적에 연결된 호텔 정보만 조회 가능
CREATE POLICY "Users can view their own hotel quotes" ON quote_hotel
  FOR SELECT USING (
    quote_id IN (
      SELECT id FROM quote WHERE user_id = auth.uid()
    )
  );

-- 사용자는 자신의 견적에 호텔 정보 추가 가능
CREATE POLICY "Users can insert hotel quotes for their quotes" ON quote_hotel
  FOR INSERT WITH CHECK (
    quote_id IN (
      SELECT id FROM quote WHERE user_id = auth.uid()
    )
  );

-- 관리자는 모든 호텔 견적 조회/수정 가능
CREATE POLICY "Admins can manage all hotel quotes" ON quote_hotel
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
