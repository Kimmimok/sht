-- 테스트용 quote_item 데이터 생성 스크립트
-- 먼저 기존 테스트 데이터를 확인하고 없으면 생성

-- 1. 기존 데이터 확인
SELECT 
  'Current Data Status' as info,
  (SELECT COUNT(*) FROM quote) as quote_count,
  (SELECT COUNT(*) FROM quote_item) as quote_item_count,
  (SELECT COUNT(*) FROM room) as room_count,
  (SELECT COUNT(*) FROM car) as car_count,
  (SELECT COUNT(*) FROM airport) as airport_count,
  (SELECT COUNT(*) FROM hotel) as hotel_count,
  (SELECT COUNT(*) FROM rentcar) as rentcar_count,
  (SELECT COUNT(*) FROM tour) as tour_count;

-- 2. 테스트용 기본 서비스 데이터 생성 (없는 경우에만)

-- 2-1. 객실 데이터
INSERT INTO room (room_code, adult_count, child_count, extra_count) 
SELECT 'TEST_ROOM_001', 2, 1, 0
WHERE NOT EXISTS (SELECT 1 FROM room WHERE room_code = 'TEST_ROOM_001');

INSERT INTO room_price (room_code, schedule, cruise, room_type, room_category, price)
SELECT 'TEST_ROOM_001', 'TEST_SCHEDULE', 'TEST_CRUISE', 'BALCONY', 'STANDARD', 500000
WHERE NOT EXISTS (SELECT 1 FROM room_price WHERE room_code = 'TEST_ROOM_001');

-- 2-2. 차량 데이터
INSERT INTO car (car_code, car_count)
SELECT 'TEST_CAR_001', 1
WHERE NOT EXISTS (SELECT 1 FROM car WHERE car_code = 'TEST_CAR_001');

INSERT INTO car_price (car_code, schedule, cruise, car_type, car_category, price)
SELECT 'TEST_CAR_001', 'TEST_SCHEDULE', 'TEST_CRUISE', 'VAN', 'STANDARD', 100000
WHERE NOT EXISTS (SELECT 1 FROM car_price WHERE car_code = 'TEST_CAR_001');

-- 2-3. 공항 데이터
INSERT INTO airport (airport_code, passenger_count)
SELECT 'TEST_AIRPORT_001', 3
WHERE NOT EXISTS (SELECT 1 FROM airport WHERE airport_code = 'TEST_AIRPORT_001');

INSERT INTO airport_price (airport_code, airport_category, airport_route, airport_car_type, price)
SELECT 'TEST_AIRPORT_001', 'PICKUP', 'AIRPORT_TO_HOTEL', 'VAN', 80000
WHERE NOT EXISTS (SELECT 1 FROM airport_price WHERE airport_code = 'TEST_AIRPORT_001');

-- 2-4. 호텔 데이터
INSERT INTO hotel (hotel_code)
SELECT 'TEST_HOTEL_001'
WHERE NOT EXISTS (SELECT 1 FROM hotel WHERE hotel_code = 'TEST_HOTEL_001');

INSERT INTO hotel_price (hotel_code, hotel_name, room_name, room_type, price)
SELECT 'TEST_HOTEL_001', 'Test Hotel', 'Deluxe Room', 'DOUBLE', 200000
WHERE NOT EXISTS (SELECT 1 FROM hotel_price WHERE hotel_code = 'TEST_HOTEL_001');

-- 2-5. 렌트카 데이터
INSERT INTO rentcar (rentcar_code)
SELECT 'TEST_RENT_001'
WHERE NOT EXISTS (SELECT 1 FROM rentcar WHERE rentcar_code = 'TEST_RENT_001');

INSERT INTO rent_price (rent_code, rent_type, rent_category, rent_route, price)
SELECT 'TEST_RENT_001', 'COMPACT', 'ECONOMY', 'DAILY', 60000
WHERE NOT EXISTS (SELECT 1 FROM rent_price WHERE rent_code = 'TEST_RENT_001');

-- 2-6. 투어 데이터
INSERT INTO tour (tour_code, participant_count, tour_date)
SELECT 'TEST_TOUR_001', 3, '2025-08-01'
WHERE NOT EXISTS (SELECT 1 FROM tour WHERE tour_code = 'TEST_TOUR_001');

INSERT INTO tour_price (tour_code, tour_name, tour_capacity, tour_vehicle, price)
SELECT 'TEST_TOUR_001', 'City Tour', 15, 'BUS', 150000
WHERE NOT EXISTS (SELECT 1 FROM tour_price WHERE tour_code = 'TEST_TOUR_001');

-- 3. 테스트용 견적 생성
INSERT INTO quote (
  id, 
  user_id, 
  status, 
  departure_date, 
  return_date, 
  adult_count, 
  child_count, 
  infant_count,
  total_price,
  created_at,
  updated_at
)
SELECT 
  'test-quote-001',
  (SELECT id FROM users LIMIT 1), -- 첫 번째 사용자 ID 사용
  'draft',
  '2025-08-01',
  '2025-08-07',
  2,
  1,
  0,
  0,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM quote WHERE id = 'test-quote-001');

-- 4. 테스트용 quote_item 데이터 생성
-- 4-1. 객실 아이템
INSERT INTO quote_item (quote_id, service_type, service_ref_id, quantity, unit_price, total_price, created_at, updated_at)
SELECT 
  'test-quote-001',
  'room',
  r.id,
  1,
  0,
  0,
  NOW(),
  NOW()
FROM room r 
WHERE r.room_code = 'TEST_ROOM_001'
AND NOT EXISTS (
  SELECT 1 FROM quote_item 
  WHERE quote_id = 'test-quote-001' 
  AND service_type = 'room' 
  AND service_ref_id = r.id
);

-- 4-2. 차량 아이템
INSERT INTO quote_item (quote_id, service_type, service_ref_id, quantity, unit_price, total_price, created_at, updated_at)
SELECT 
  'test-quote-001',
  'car',
  c.id,
  1,
  0,
  0,
  NOW(),
  NOW()
FROM car c 
WHERE c.car_code = 'TEST_CAR_001'
AND NOT EXISTS (
  SELECT 1 FROM quote_item 
  WHERE quote_id = 'test-quote-001' 
  AND service_type = 'car' 
  AND service_ref_id = c.id
);

-- 4-3. 공항 아이템
INSERT INTO quote_item (quote_id, service_type, service_ref_id, quantity, unit_price, total_price, created_at, updated_at)
SELECT 
  'test-quote-001',
  'airport',
  a.id,
  1,
  0,
  0,
  NOW(),
  NOW()
FROM airport a 
WHERE a.airport_code = 'TEST_AIRPORT_001'
AND NOT EXISTS (
  SELECT 1 FROM quote_item 
  WHERE quote_id = 'test-quote-001' 
  AND service_type = 'airport' 
  AND service_ref_id = a.id
);

-- 4-4. 호텔 아이템
INSERT INTO quote_item (quote_id, service_type, service_ref_id, quantity, unit_price, total_price, created_at, updated_at)
SELECT 
  'test-quote-001',
  'hotel',
  h.id,
  2,
  0,
  0,
  NOW(),
  NOW()
FROM hotel h 
WHERE h.hotel_code = 'TEST_HOTEL_001'
AND NOT EXISTS (
  SELECT 1 FROM quote_item 
  WHERE quote_id = 'test-quote-001' 
  AND service_type = 'hotel' 
  AND service_ref_id = h.id
);

-- 4-5. 렌트카 아이템
INSERT INTO quote_item (quote_id, service_type, service_ref_id, quantity, unit_price, total_price, created_at, updated_at)
SELECT 
  'test-quote-001',
  'rentcar',
  r.id,
  1,
  0,
  0,
  NOW(),
  NOW()
FROM rentcar r 
WHERE r.rentcar_code = 'TEST_RENT_001'
AND NOT EXISTS (
  SELECT 1 FROM quote_item 
  WHERE quote_id = 'test-quote-001' 
  AND service_type = 'rentcar' 
  AND service_ref_id = r.id
);

-- 4-6. 투어 아이템
INSERT INTO quote_item (quote_id, service_type, service_ref_id, quantity, unit_price, total_price, created_at, updated_at)
SELECT 
  'test-quote-001',
  'tour',
  t.id,
  1,
  0,
  0,
  NOW(),
  NOW()
FROM tour t 
WHERE t.tour_code = 'TEST_TOUR_001'
AND NOT EXISTS (
  SELECT 1 FROM quote_item 
  WHERE quote_id = 'test-quote-001' 
  AND service_type = 'tour' 
  AND service_ref_id = t.id
);

-- 5. 결과 확인
SELECT 
  '테스트 데이터 생성 완료' as status,
  (SELECT COUNT(*) FROM quote_item WHERE quote_id = 'test-quote-001') as created_items;

-- 6. 생성된 quote_item 목록 조회
SELECT 
  qi.id,
  qi.quote_id,
  qi.service_type,
  qi.service_ref_id,
  qi.quantity,
  qi.unit_price,
  qi.total_price,
  CASE 
    WHEN qi.service_type = 'room' THEN r.room_code
    WHEN qi.service_type = 'car' THEN c.car_code
    WHEN qi.service_type = 'airport' THEN a.airport_code
    WHEN qi.service_type = 'hotel' THEN h.hotel_code
    WHEN qi.service_type = 'rentcar' THEN rc.rentcar_code
    WHEN qi.service_type = 'tour' THEN t.tour_code
  END as service_code
FROM quote_item qi
LEFT JOIN room r ON qi.service_type = 'room' AND qi.service_ref_id = r.id
LEFT JOIN car c ON qi.service_type = 'car' AND qi.service_ref_id = c.id  
LEFT JOIN airport a ON qi.service_type = 'airport' AND qi.service_ref_id = a.id
LEFT JOIN hotel h ON qi.service_type = 'hotel' AND qi.service_ref_id = h.id
LEFT JOIN rentcar rc ON qi.service_type = 'rentcar' AND qi.service_ref_id = rc.id
LEFT JOIN tour t ON qi.service_type = 'tour' AND qi.service_ref_id = t.id
WHERE qi.quote_id = 'test-quote-001'
ORDER BY qi.service_type;
