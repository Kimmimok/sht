-- 가격 계산 및 base_price 업데이트 SQL 스크립트
-- 각 서비스 타입별로 base_price를 계산하고 quote_item을 업데이트

-- 1. 객실(room) 가격 계산 및 업데이트
WITH room_calculations AS (
  SELECT 
    qi.id as quote_item_id,
    qi.quote_id,
    qi.service_ref_id,
    r.room_code,
    -- room_price에서 첫 번째 매칭되는 가격을 기본값으로 사용
    COALESCE(rp.price, rp.base_price, 0) as calculated_price,
    qi.quantity
  FROM quote_item qi
  JOIN room r ON qi.service_ref_id = r.id
  LEFT JOIN room_price rp ON r.room_code = rp.room_code
  WHERE qi.service_type = 'room'
)
UPDATE quote_item 
SET 
  unit_price = rc.calculated_price,
  total_price = rc.calculated_price * rc.quantity,
  updated_at = NOW()
FROM room_calculations rc
WHERE quote_item.id = rc.quote_item_id;

-- 2. 차량(car) 가격 계산 및 업데이트  
WITH car_calculations AS (
  SELECT 
    qi.id as quote_item_id,
    qi.quote_id,
    qi.service_ref_id,
    c.car_code,
    COALESCE(cp.price, cp.base_price, 0) as calculated_price,
    qi.quantity
  FROM quote_item qi
  JOIN car c ON qi.service_ref_id = c.id
  LEFT JOIN car_price cp ON c.car_code = cp.car_code
  WHERE qi.service_type = 'car'
)
UPDATE quote_item 
SET 
  unit_price = cc.calculated_price,
  total_price = cc.calculated_price * cc.quantity,
  updated_at = NOW()
FROM car_calculations cc
WHERE quote_item.id = cc.quote_item_id;

-- 3. 공항(airport) 가격 계산 및 업데이트
WITH airport_calculations AS (
  SELECT 
    qi.id as quote_item_id,
    qi.quote_id,
    qi.service_ref_id,
    a.airport_code,
    COALESCE(ap.price, ap.base_price, 0) as calculated_price,
    qi.quantity
  FROM quote_item qi
  JOIN airport a ON qi.service_ref_id = a.id
  LEFT JOIN airport_price ap ON a.airport_code = ap.airport_code
  WHERE qi.service_type = 'airport'
)
UPDATE quote_item 
SET 
  unit_price = ac.calculated_price,
  total_price = ac.calculated_price * ac.quantity,
  updated_at = NOW()
FROM airport_calculations ac
WHERE quote_item.id = ac.quote_item_id;

-- 4. 호텔(hotel) 가격 계산 및 업데이트
WITH hotel_calculations AS (
  SELECT 
    qi.id as quote_item_id,
    qi.quote_id,
    qi.service_ref_id,
    h.hotel_code,
    COALESCE(hp.price, hp.base_price, 0) as calculated_price,
    qi.quantity
  FROM quote_item qi
  JOIN hotel h ON qi.service_ref_id = h.id
  LEFT JOIN hotel_price hp ON h.hotel_code = hp.hotel_code
  WHERE qi.service_type = 'hotel'
)
UPDATE quote_item 
SET 
  unit_price = hc.calculated_price,
  total_price = hc.calculated_price * hc.quantity,
  updated_at = NOW()
FROM hotel_calculations hc
WHERE quote_item.id = hc.quote_item_id;

-- 5. 렌트카(rentcar) 가격 계산 및 업데이트
WITH rentcar_calculations AS (
  SELECT 
    qi.id as quote_item_id,
    qi.quote_id,
    qi.service_ref_id,
    rc.rentcar_code,
    COALESCE(rp.price, rp.base_price, 0) as calculated_price,
    qi.quantity
  FROM quote_item qi
  JOIN rentcar rc ON qi.service_ref_id = rc.id
  LEFT JOIN rent_price rp ON rc.rentcar_code = rp.rent_code
  WHERE qi.service_type = 'rentcar'
)
UPDATE quote_item 
SET 
  unit_price = rcc.calculated_price,
  total_price = rcc.calculated_price * rcc.quantity,
  updated_at = NOW()
FROM rentcar_calculations rcc
WHERE quote_item.id = rcc.quote_item_id;

-- 6. 투어(tour) 가격 계산 및 업데이트
WITH tour_calculations AS (
  SELECT 
    qi.id as quote_item_id,
    qi.quote_id,
    qi.service_ref_id,
    t.tour_code,
    COALESCE(tp.price, tp.base_price, 0) as calculated_price,
    qi.quantity
  FROM quote_item qi
  JOIN tour t ON qi.service_ref_id = t.id
  LEFT JOIN tour_price tp ON t.tour_code = tp.tour_code
  WHERE qi.service_type = 'tour'
)
UPDATE quote_item 
SET 
  unit_price = tc.calculated_price,
  total_price = tc.calculated_price * tc.quantity,
  updated_at = NOW()
FROM tour_calculations tc
WHERE quote_item.id = tc.quote_item_id;

-- 7. 견적 총액 업데이트
UPDATE quote 
SET 
  total_price = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM quote_item 
    WHERE quote_item.quote_id = quote.id
  ),
  updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT quote_id 
  FROM quote_item 
  WHERE updated_at >= NOW() - INTERVAL '1 minute'
);

-- 결과 확인용 쿼리
SELECT 
  '가격 계산 완료' as status,
  COUNT(*) as updated_items
FROM quote_item 
WHERE updated_at >= NOW() - INTERVAL '1 minute';
