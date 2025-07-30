-- room과 car 테이블 가격 업데이트를 위한 저장 프로시저

-- 1. room 테이블 base_price 업데이트 함수
CREATE OR REPLACE FUNCTION update_room_base_prices()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE room r
  SET base_price = rp.price
  FROM room_price rp
  WHERE r.room_code = rp.room_code;
  
  RAISE NOTICE 'Room base_price 업데이트 완료: % 행 영향받음', ROW_COUNT;
END;
$$;

-- 2. room quote_item 가격 업데이트 함수
CREATE OR REPLACE FUNCTION update_room_quote_items()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE quote_item qi
  SET unit_price = r.base_price,
      total_price = r.base_price * qi.quantity
  FROM room r
  WHERE qi.service_type = 'room'
    AND qi.service_ref_id = r.id;
  
  RAISE NOTICE 'Room quote_item 가격 업데이트 완료: % 행 영향받음', ROW_COUNT;
END;
$$;

-- 3. car 테이블 base_price 업데이트 함수
CREATE OR REPLACE FUNCTION update_car_base_prices()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE car c
  SET base_price = cp.price
  FROM car_price cp
  WHERE c.car_code = cp.car_code;
  
  RAISE NOTICE 'Car base_price 업데이트 완료: % 행 영향받음', ROW_COUNT;
END;
$$;

-- 4. car quote_item 가격 업데이트 함수
CREATE OR REPLACE FUNCTION update_car_quote_items()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE quote_item qi
  SET unit_price = c.base_price,
      total_price = c.base_price * qi.quantity
  FROM car c
  WHERE qi.service_type = 'car'
    AND qi.service_ref_id = c.id;
  
  RAISE NOTICE 'Car quote_item 가격 업데이트 완료: % 행 영향받음', ROW_COUNT;
END;
$$;

-- 5. 전체 서비스 가격 업데이트 함수 (기존 + room + car)
CREATE OR REPLACE FUNCTION update_all_service_prices()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Airport 가격 업데이트
  UPDATE airport a
  SET base_price = ap.price
  FROM airport_price ap
  WHERE a.airport_code = ap.airport_code;
  
  -- Rentcar 가격 업데이트
  UPDATE rentcar r
  SET base_price = rp.price
  FROM rent_price rp
  WHERE r.rentcar_code = rp.rent_code;
  
  -- Hotel 가격 업데이트
  UPDATE hotel h
  SET base_price = hp.price
  FROM hotel_price hp
  WHERE h.hotel_code = hp.hotel_code;
  
  -- Tour 가격 업데이트
  UPDATE tour t
  SET base_price = tp.price
  FROM tour_price tp
  WHERE t.tour_code = tp.tour_code;
  
  -- Room 가격 업데이트
  UPDATE room r
  SET base_price = rp.price
  FROM room_price rp
  WHERE r.room_code = rp.room_code;
  
  -- Car 가격 업데이트
  UPDATE car c
  SET base_price = cp.price
  FROM car_price cp
  WHERE c.car_code = cp.car_code;
  
  RAISE NOTICE '모든 서비스 base_price 업데이트 완료';
END;
$$;

-- 6. 전체 quote_item 가격 동기화 함수
CREATE OR REPLACE FUNCTION update_all_quote_item_prices()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Airport quote_item 가격 업데이트
  UPDATE quote_item qi
  SET unit_price = a.base_price,
      total_price = a.base_price * qi.quantity
  FROM airport a
  WHERE qi.service_type = 'airport'
    AND qi.service_ref_id = a.id;
  
  -- Rentcar quote_item 가격 업데이트
  UPDATE quote_item qi
  SET unit_price = r.base_price,
      total_price = r.base_price * qi.quantity
  FROM rentcar r
  WHERE qi.service_type = 'rentcar'
    AND qi.service_ref_id = r.id;
  
  -- Hotel quote_item 가격 업데이트
  UPDATE quote_item qi
  SET unit_price = h.base_price,
      total_price = h.base_price * qi.quantity
  FROM hotel h
  WHERE qi.service_type = 'hotel'
    AND qi.service_ref_id = h.id;
  
  -- Tour quote_item 가격 업데이트
  UPDATE quote_item qi
  SET unit_price = t.base_price,
      total_price = t.base_price * qi.quantity
  FROM tour t
  WHERE qi.service_type = 'tour'
    AND qi.service_ref_id = t.id;
  
  -- Cruise quote_item 가격 업데이트
  UPDATE quote_item qi
  SET unit_price = c.base_price,
      total_price = c.base_price * qi.quantity
  FROM cruise c
  WHERE qi.service_type = 'cruise'
    AND qi.service_ref_id = c.id;
  
  -- Room quote_item 가격 업데이트
  UPDATE quote_item qi
  SET unit_price = r.base_price,
      total_price = r.base_price * qi.quantity
  FROM room r
  WHERE qi.service_type = 'room'
    AND qi.service_ref_id = r.id;
  
  -- Car quote_item 가격 업데이트
  UPDATE quote_item qi
  SET unit_price = c.base_price,
      total_price = c.base_price * qi.quantity
  FROM car c
  WHERE qi.service_type = 'car'
    AND qi.service_ref_id = c.id;
  
  RAISE NOTICE '모든 quote_item 가격 업데이트 완료';
END;
$$;
