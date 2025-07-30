-- cruise 테이블에 필요한 모든 컬럼이 있는지 확인하고 누락된 컬럼 추가

-- 1. 기본 cruise 테이블이 없다면 생성
CREATE TABLE IF NOT EXISTS cruise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. 올드 페이지 호환성을 위한 추가 컬럼들
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS schedule_code TEXT;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS cruise_code TEXT;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS payment_code TEXT;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS rooms_detail JSONB;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS vehicle_detail JSONB;

-- 3. 테이블 구조 확인 쿼리
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cruise' 
ORDER BY ordinal_position;

-- 4. 테스트 INSERT 쿼리 (실제 실행하지 말고 구조 확인용)
/*
INSERT INTO cruise (
  cruise_name,
  departure_date,
  return_date,
  departure_port,
  room_type,
  adult_count,
  child_count,
  infant_count,
  special_requests,
  base_price,
  schedule_code,
  cruise_code,
  payment_code,
  discount_rate,
  rooms_detail,
  vehicle_detail
) VALUES (
  'TEST_CRUISE',
  '2024-01-01',
  '2024-01-07',
  'TEST_PORT',
  'TEST_ROOM',
  2,
  0,
  0,
  'TEST_REQUEST',
  0,
  'S1',
  'C1',
  'P1',
  0,
  '[]'::jsonb,
  '[]'::jsonb
);
*/
