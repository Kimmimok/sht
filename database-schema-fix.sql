-- 데이터베이스 스키마 수정 SQL
-- 크루즈 예약 시스템 데이터베이스 스키마 완성

-- 1. 누락된 필수 테이블들 생성
CREATE TABLE IF NOT EXISTS quote_room_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quote(id) ON DELETE CASCADE,
  quote_room_id UUID REFERENCES quote_room(id) ON DELETE CASCADE,
  room_code TEXT REFERENCES room_info(code),
  vehicle_code TEXT REFERENCES car_info(code),
  category TEXT NOT NULL,
  passenger_type TEXT,
  person_count INTEGER DEFAULT 1,
  car_count INTEGER DEFAULT 1,
  room_price_code TEXT,
  car_price_code TEXT,
  room_unit_price INTEGER DEFAULT 0,
  room_total_price INTEGER DEFAULT 0,
  car_unit_price INTEGER DEFAULT 0,
  car_total_price INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_price_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quote(id) ON DELETE CASCADE UNIQUE,
  checkin DATE,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  total_room_price INTEGER DEFAULT 0,
  total_car_price INTEGER DEFAULT 0,
  final_total INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 기본 테이블들에 누락된 컬럼 추가
ALTER TABLE quote ADD COLUMN IF NOT EXISTS schedule_code TEXT REFERENCES schedule_info(code);
ALTER TABLE quote ADD COLUMN IF NOT EXISTS cruise_code TEXT REFERENCES cruise_info(code);
ALTER TABLE quote ADD COLUMN IF NOT EXISTS payment_code TEXT;
ALTER TABLE quote ADD COLUMN IF NOT EXISTS vehicle_category_code TEXT;
ALTER TABLE quote ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE quote ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE quote ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;

ALTER TABLE quote_room ADD COLUMN IF NOT EXISTS room_code TEXT REFERENCES room_info(code);
ALTER TABLE quote_room ADD COLUMN IF NOT EXISTS vehicle_code TEXT REFERENCES car_info(code);
ALTER TABLE quote_room ADD COLUMN IF NOT EXISTS vehicle_category_code TEXT;
ALTER TABLE quote_room ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE quote_room ADD COLUMN IF NOT EXISTS person_count INTEGER DEFAULT 1;
ALTER TABLE quote_room ADD COLUMN IF NOT EXISTS room_price_code TEXT;
ALTER TABLE quote_room ADD COLUMN IF NOT EXISTS room_unit_price INTEGER DEFAULT 0;
ALTER TABLE quote_room ADD COLUMN IF NOT EXISTS room_total_price INTEGER DEFAULT 0;

ALTER TABLE quote_car ADD COLUMN IF NOT EXISTS vehicle_code TEXT REFERENCES car_info(code);
ALTER TABLE quote_car ADD COLUMN IF NOT EXISTS car_category_code TEXT;
ALTER TABLE quote_car ADD COLUMN IF NOT EXISTS passenger_type TEXT;
ALTER TABLE quote_car ADD COLUMN IF NOT EXISTS car_count INTEGER DEFAULT 1;
ALTER TABLE quote_car ADD COLUMN IF NOT EXISTS car_price_code TEXT;
ALTER TABLE quote_car ADD COLUMN IF NOT EXISTS car_unit_price INTEGER DEFAULT 0;
ALTER TABLE quote_car ADD COLUMN IF NOT EXISTS car_total_price INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- 3. 가격 테이블 스키마 정의 (이미 존재하면 스킵)
ALTER TABLE room_price ADD COLUMN IF NOT EXISTS schedule_code TEXT REFERENCES schedule_info(code);
ALTER TABLE room_price ADD COLUMN IF NOT EXISTS cruise_code TEXT REFERENCES cruise_info(code);
ALTER TABLE room_price ADD COLUMN IF NOT EXISTS payment_code TEXT;
ALTER TABLE room_price ADD COLUMN IF NOT EXISTS room_code TEXT REFERENCES room_info(code);
ALTER TABLE room_price ADD COLUMN IF NOT EXISTS room_category_code TEXT;
ALTER TABLE room_price ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE room_price ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE room_price ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0;

ALTER TABLE car_price ADD COLUMN IF NOT EXISTS schedule_code TEXT REFERENCES schedule_info(code);
ALTER TABLE car_price ADD COLUMN IF NOT EXISTS cruise_code TEXT REFERENCES cruise_info(code);
ALTER TABLE car_price ADD COLUMN IF NOT EXISTS car_code TEXT REFERENCES car_info(code);
ALTER TABLE car_price ADD COLUMN IF NOT EXISTS car_category_code TEXT;
ALTER TABLE car_price ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0;

-- 4. 추가 마스터 테이블들
CREATE TABLE IF NOT EXISTS payment_info (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS category_info (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- 5. 기본 데이터 삽입
INSERT INTO payment_info (code, name) VALUES 
  ('CARD', '카드결제'),
  ('CASH', '현금결제'),
  ('BANK', '계좌이체')
ON CONFLICT (code) DO NOTHING;

INSERT INTO category_info (code, name) VALUES
  ('ROUND', '왕복'),
  ('ONE_WAY', '편도'),
  ('EXTRA', '추가')
ON CONFLICT (code) DO NOTHING;
