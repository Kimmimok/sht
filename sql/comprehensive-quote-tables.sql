-- 종합 견적 시스템을 위한 추가 테이블 생성
-- ComprehensiveQuoteForm에서 사용할 테이블들

-- 1. 견적에 크루즈, 호텔, 투어, 공항 서비스 정보 추가
ALTER TABLE quote ADD COLUMN IF NOT EXISTS quote_type TEXT DEFAULT 'basic'; -- basic, comprehensive
ALTER TABLE quote ADD COLUMN IF NOT EXISTS checkout DATE;
ALTER TABLE quote ADD COLUMN IF NOT EXISTS customer_info JSONB;
ALTER TABLE quote ADD COLUMN IF NOT EXISTS special_requests TEXT;

-- 2. 크루즈 상세 정보 테이블
CREATE TABLE IF NOT EXISTS quote_cruise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quote(id) ON DELETE CASCADE,
  cruise_code TEXT REFERENCES cruise_info(code),
  room_type TEXT,
  passenger_count INTEGER DEFAULT 2,
  special_requests TEXT,
  unit_price INTEGER DEFAULT 0,
  total_price INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. 호텔 정보 테이블
CREATE TABLE IF NOT EXISTS quote_hotel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quote(id) ON DELETE CASCADE,
  hotel_name TEXT NOT NULL,
  room_type TEXT,
  room_count INTEGER DEFAULT 1,
  guest_count INTEGER DEFAULT 2,
  special_requests TEXT,
  unit_price INTEGER DEFAULT 0,
  total_price INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. 공항 서비스 테이블
CREATE TABLE IF NOT EXISTS quote_airport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quote(id) ON DELETE CASCADE,
  service_type TEXT CHECK (service_type IN ('pickup', 'dropoff', 'both')),
  flight_number TEXT,
  arrival_time TIMESTAMP,
  departure_time TIMESTAMP,
  terminal TEXT,
  unit_price INTEGER DEFAULT 0,
  total_price INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. 투어 정보 테이블
CREATE TABLE IF NOT EXISTS quote_tour (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quote(id) ON DELETE CASCADE,
  tour_type TEXT,
  duration TEXT,
  participant_count INTEGER DEFAULT 2,
  preferred_language TEXT DEFAULT 'korean',
  special_requests TEXT,
  unit_price INTEGER DEFAULT 0,
  total_price INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. 차량 서비스 테이블 업데이트 (기존 quote_car 테이블 확장)
ALTER TABLE quote_car ADD COLUMN IF NOT EXISTS pickup_location TEXT;
ALTER TABLE quote_car ADD COLUMN IF NOT EXISTS dropoff_location TEXT;
ALTER TABLE quote_car ADD COLUMN IF NOT EXISTS pickup_time TIME;

-- 7. 호텔 마스터 테이블 (선택사항)
CREATE TABLE IF NOT EXISTS hotel_info (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  star_rating INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. 투어 마스터 테이블
CREATE TABLE IF NOT EXISTS tour_info (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  duration TEXT,
  description TEXT,
  max_participants INTEGER DEFAULT 20,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. 공항 서비스 마스터 테이블
CREATE TABLE IF NOT EXISTS airport_service_info (
  code TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  service_type TEXT,
  base_price INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 10. 기본 데이터 삽입
-- hotel_info 테이블이 이미 존재하는 경우를 위한 컬럼 추가
ALTER TABLE hotel_info ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE hotel_info ADD COLUMN IF NOT EXISTS star_rating INTEGER;
ALTER TABLE hotel_info ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO hotel_info (code, name, location, star_rating) VALUES
  ('H001', '하노이 힐튼', '하노이 시내', 5),
  ('H002', '롯데 호텔 하노이', '하노이 시내', 5),
  ('H003', '인터컨티넨탈 하노이', '하노이 시내', 5),
  ('H004', '하롱베이 리조트', '하롱베이', 4),
  ('H005', '에메랄드 베이 리조트', '하롱베이', 4)
ON CONFLICT (code) DO NOTHING;

INSERT INTO tour_info (code, name, type, duration, max_participants) VALUES
  ('T001', '하노이 시내 관광', 'city', 'half', 15),
  ('T002', '하롱베이 선셋 크루즈', 'nature', 'half', 20),
  ('T003', '베트남 요리 클래스', 'culture', 'half', 10),
  ('T004', '사파 트래킹 투어', 'adventure', 'multi', 8),
  ('T005', '메콩델타 투어', 'nature', 'full', 12)
ON CONFLICT (code) DO NOTHING;

INSERT INTO airport_service_info (code, service_name, service_type, base_price) VALUES
  ('AS001', '노이바이 공항 픽업', 'pickup', 25),
  ('AS002', '노이바이 공항 배송', 'dropoff', 25),
  ('AS003', '공항 왕복 서비스', 'both', 40),
  ('AS004', 'VIP 공항 서비스', 'both', 80)
ON CONFLICT (code) DO NOTHING;
