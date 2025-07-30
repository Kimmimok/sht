-- 렌트카 가격(rentcar_price) 테이블 생성
CREATE TABLE IF NOT EXISTS rentcar_price (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,                    -- 구분 (일반, 프리미엄, VIP 등)
  car_category_code TEXT NOT NULL,           -- 분류 (왕복, 편도, 공항픽업 등)
  route TEXT NOT NULL,                       -- 경로 (하노이-하롱베이, 공항-시내 등)
  vehicle_type TEXT NOT NULL,                -- 차량종류 (세단, SUV, 버스 등)
  price INTEGER DEFAULT 0,                   -- 가격
  description TEXT,                          -- 설명
  is_active BOOLEAN DEFAULT TRUE,            -- 활성화 여부
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 기본 데이터 삽입 예시
INSERT INTO rentcar_price (category, car_category_code, route, vehicle_type, price, description) VALUES
  ('일반', '왕복', '하노이-하롱베이', '세단', 80, '4인승 세단 왕복'),
  ('일반', '왕복', '하노이-하롱베이', 'SUV', 120, '7인승 SUV 왕복'),
  ('일반', '편도', '공항-시내', '세단', 25, '공항에서 시내까지 세단'),
  ('프리미엄', '왕복', '하노이-하롱베이', '프리미엄세단', 150, '고급 세단 왕복'),
  ('VIP', '왕복', '하노이-하롱베이', '리무진', 300, 'VIP 리무진 서비스')
ON CONFLICT DO NOTHING;

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_rentcar_price_category ON rentcar_price(category);
CREATE INDEX IF NOT EXISTS idx_rentcar_price_car_category ON rentcar_price(car_category_code);
CREATE INDEX IF NOT EXISTS idx_rentcar_price_route ON rentcar_price(route);
CREATE INDEX IF NOT EXISTS idx_rentcar_price_vehicle_type ON rentcar_price(vehicle_type);
