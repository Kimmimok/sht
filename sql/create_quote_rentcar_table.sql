-- 렌트카 견적(quote_rentcar) 테이블 생성
CREATE TABLE IF NOT EXISTS quote_rentcar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quote(id) ON DELETE CASCADE,
  rc_car_code TEXT REFERENCES car_info(code),      -- 차량코드
  rc_category TEXT,                               -- 구분
  rc_car_category_code TEXT,                      -- 분류
  rc_route TEXT,                                  -- 경로
  rc_vehicle_type TEXT,                           -- 차량종류
  rc_car_count INTEGER DEFAULT 1,                 -- 차량대수
  rc_boarding_date DATE,                          -- 승차일자
  rc_boarding_time TIME,                          -- 승차시간
  rc_pickup_location TEXT,                        -- 승차장소
  rc_carrier_count INTEGER DEFAULT 0,             -- 캐리어갯수
  rc_dropoff_location TEXT,                       -- 목적지
  rc_via_location TEXT,                           -- 경유지
  rc_passenger_count INTEGER DEFAULT 1,           -- 승차인원
  rc_usage_period INTEGER DEFAULT 1,              -- 사용기간(일)
  created_at TIMESTAMP DEFAULT NOW()
);
