-- ====================================================================
-- 크루즈 예약 시스템 가격 계산 가이드
-- ====================================================================

-- 🔹 1단계: 서비스 테이블 base_price 업데이트
--    각 서비스별 기본 가격을 *_price 테이블에서 조회하여 설정

-- 1-1. Airport 기본 가격 설정
UPDATE airport a
SET base_price = ap.price
FROM airport_price ap
WHERE a.airport_code = ap.airport_code;

-- 1-2. Rentcar 기본 가격 설정 (rentcar_code → rent_price.rent_code)
UPDATE rentcar r
SET base_price = rp.price
FROM rent_price rp
WHERE r.rentcar_code = rp.rent_code;

-- 1-3. Hotel 기본 가격 설정
UPDATE hotel h
SET base_price = hp.price
FROM hotel_price hp
WHERE h.hotel_code = hp.hotel_code;

-- 1-4. Tour 기본 가격 설정
UPDATE tour t
SET base_price = tp.price
FROM tour_price tp
WHERE t.tour_code = tp.tour_code;

-- 1-5. Room 기본 가격 설정 (room_code → room_price.room_code)
UPDATE room r
SET base_price = rp.price
FROM room_price rp
WHERE r.room_code = rp.room_code;

-- 1-6. Car 기본 가격 설정 (car_code → car_price.car_code)
UPDATE car c
SET base_price = cp.price
FROM car_price cp
WHERE c.car_code = cp.car_code;

-- 🔹 2단계: quote_item 단가 업데이트
--    서비스 테이블의 base_price를 quote_item.unit_price에 반영

-- 2-1. Airport → quote_item
UPDATE quote_item qi
SET unit_price = a.base_price,
    total_price = a.base_price * qi.quantity
FROM airport a
WHERE qi.service_type = 'airport' 
  AND qi.service_ref_id = a.id;

-- 2-2. Rentcar → quote_item
UPDATE quote_item qi
SET unit_price = r.base_price,
    total_price = r.base_price * qi.quantity
FROM rentcar r
WHERE qi.service_type = 'rentcar'
  AND qi.service_ref_id = r.id;

-- 2-3. Hotel → quote_item
UPDATE quote_item qi
SET unit_price = h.base_price,
    total_price = h.base_price * qi.quantity
FROM hotel h
WHERE qi.service_type = 'hotel'
  AND qi.service_ref_id = h.id;

-- 2-4. Tour → quote_item
UPDATE quote_item qi
SET unit_price = t.base_price,
    total_price = t.base_price * qi.quantity
FROM tour t
WHERE qi.service_type = 'tour'
  AND qi.service_ref_id = t.id;

-- 2-5. Cruise → quote_item
UPDATE quote_item qi
SET unit_price = c.base_price,
    total_price = c.base_price * qi.quantity
FROM cruise c
WHERE qi.service_type = 'cruise'
  AND qi.service_ref_id = c.id;

-- 2-6. Room → quote_item
UPDATE quote_item qi
SET unit_price = r.base_price,
    total_price = r.base_price * qi.quantity
FROM room r
WHERE qi.service_type = 'room'
  AND qi.service_ref_id = r.id;

-- 2-7. Car → quote_item
UPDATE quote_item qi
SET unit_price = c.base_price,
    total_price = c.base_price * qi.quantity
FROM car c
WHERE qi.service_type = 'car'
  AND qi.service_ref_id = c.id;

-- 🔹 3단계: 동적 가격 코드 기반 세부 가격 계산 (고급)
--    현재 getRoomPriceCode.ts, getCarPriceCode.ts로 구현됨

-- 크루즈 객실 동적 가격 (room_price 테이블 기반)
-- - schedule_code, cruise_code, payment_code 조합
-- - room_code, room_category_code 세부 조건
-- - 날짜 범위 검증 (start_date ≤ checkin ≤ end_date)

-- 차량 동적 가격 (car_price 테이블 기반)  
-- - schedule_code, cruise_code 조합
-- - car_category_code, car_type_code 세부 조건

-- 🔹 4단계: 견적 총액 계산
UPDATE quote q
SET total_price = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM quote_item qi
    WHERE qi.quote_id = q.id
)
WHERE EXISTS (
    SELECT 1 FROM quote_item qi WHERE qi.quote_id = q.id
);

-- ====================================================================
-- 🚀 실행 권장 순서:
-- 1. 1단계 SQL 실행 (base_price 설정 - airport, rentcar, hotel, tour, room, car)
-- 2. 2단계 SQL 실행 (quote_item 단가 업데이트 - 모든 서비스 포함)  
-- 3. 애플리케이션 로직으로 동적 가격 계산 (3단계)
-- 4. 4단계 SQL 실행 (총액 계산)
-- ====================================================================

-- 🔹 3단계: 동적 가격 코드 기반 세부 가격 계산 (고급)
--    현재 getRoomPriceCode.ts, getCarPriceCode.ts로 구현됨

-- 크루즈 객실 동적 가격 (room_price 테이블 기반)
-- - schedule_code, cruise_code, payment_code 조합
-- - room_code, room_category_code 세부 조건
-- - 날짜 범위 검증 (start_date ≤ checkin ≤ end_date)

-- 차량 동적 가격 (car_price 테이블 기반)  
-- - schedule_code, cruise_code 조합
-- - car_category_code, car_type_code 세부 조건

-- 🔹 4단계: 견적 총액 계산
UPDATE quote q
SET total_price = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM quote_item qi
    WHERE qi.quote_id = q.id
)
WHERE EXISTS (
    SELECT 1 FROM quote_item qi WHERE qi.quote_id = q.id
);

-- ====================================================================
-- 🚀 실행 권장 순서:
-- 1. 1단계 SQL 실행 (base_price 설정)
-- 2. 2단계 SQL 실행 (quote_item 단가 업데이트)  
-- 3. 애플리케이션 로직으로 동적 가격 계산 (3단계)
-- 4. 4단계 SQL 실행 (총액 계산)
-- ====================================================================
