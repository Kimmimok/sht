-- ========================================
-- cruise 테이블 완전 수정 스크립트
-- ========================================

-- 1. 기존 cruise 테이블 백업 (데이터가 있다면)
-- CREATE TABLE cruise_backup AS SELECT * FROM cruise;

-- 2. cruise 테이블 삭제 후 재생성 (신중하게!)
-- DROP TABLE IF EXISTS cruise CASCADE;

-- 3. cruise 테이블 완전 재생성
CREATE TABLE IF NOT EXISTS cruise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 기본 크루즈 정보 (필수)
  cruise_name VARCHAR(255) NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  departure_port VARCHAR(100),
  room_type VARCHAR(50),
  adult_count INTEGER DEFAULT 0,
  child_count INTEGER DEFAULT 0,
  infant_count INTEGER DEFAULT 0,
  special_requests TEXT,
  base_price DECIMAL(10,2) DEFAULT 0,
  
  -- 올드 페이지 호환 필드들
  schedule_code TEXT,
  cruise_code TEXT,
  payment_code TEXT,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  rooms_detail JSONB,
  vehicle_detail JSONB,
  
  -- 시스템 필드
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. 안전한 방법: 기존 테이블에 컬럼 추가 (존재하지 않을 경우만)
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS schedule_code TEXT;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS cruise_code TEXT;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS payment_code TEXT;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS rooms_detail JSONB;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS vehicle_detail JSONB;

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_cruise_schedule_code ON cruise(schedule_code);
CREATE INDEX IF NOT EXISTS idx_cruise_cruise_code ON cruise(cruise_code);
CREATE INDEX IF NOT EXISTS idx_cruise_departure_date ON cruise(departure_date);

-- 6. 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cruise' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. 테스트 데이터 (실행 후 삭제)
/*
INSERT INTO cruise (
  cruise_name, departure_date, return_date, departure_port, 
  room_type, adult_count, child_count, infant_count, 
  special_requests, base_price, schedule_code, cruise_code, 
  payment_code, discount_rate, rooms_detail, vehicle_detail
) VALUES (
  'TEST_CRUISE', '2024-01-01', '2024-01-07', 'TEST_PORT',
  'TEST_ROOM', 2, 0, 0,
  'TEST_REQUEST', 0, 'S1', 'C1',
  'P1', 0, '[]'::jsonb, '[]'::jsonb
) RETURNING *;
*/
