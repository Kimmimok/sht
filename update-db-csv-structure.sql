-- 🔄 DB 구조 업데이트 스크립트 (db.csv 반영용)
-- 날짜: 2025.08.09
-- 목적: reservation_cruise_car 테이블 정보를 db.csv에 반영하기 위한 참고용

-- ✅ 새로운 테이블: reservation_cruise_car
-- 이 정보를 sql/db.csv 파일에 추가해야 합니다:

/*
public,reservation_cruise_car,id,uuid
public,reservation_cruise_car,reservation_id,uuid
public,reservation_cruise_car,car_price_code,text
public,reservation_cruise_car,car_count,integer
public,reservation_cruise_car,passenger_count,integer
public,reservation_cruise_car,pickup_datetime,timestamp without time zone
public,reservation_cruise_car,pickup_location,text
public,reservation_cruise_car,dropoff_location,text
public,reservation_cruise_car,car_total_price,numeric
public,reservation_cruise_car,request_note,text
public,reservation_cruise_car,created_at,timestamp with time zone
public,reservation_cruise_car,updated_at,timestamp with time zone
*/

-- ❌ reservation_cruise 테이블에서 제거된 컬럼들:
-- 이 컬럼들을 sql/db.csv 파일에서 삭제해야 합니다:
/*
public,reservation_cruise,car_price_code,text          -- 삭제됨
public,reservation_cruise,car_count,integer            -- 삭제됨  
public,reservation_cruise,passenger_count,integer      -- 삭제됨
public,reservation_cruise,pickup_datetime,timestamp without time zone  -- 삭제됨
public,reservation_cruise,pickup_location,text         -- 삭제됨
public,reservation_cruise,dropoff_location,text        -- 삭제됨
public,reservation_cruise,car_total_price,numeric      -- 삭제됨
*/

-- 📋 최종 reservation_cruise 테이블 구조 (차량 컬럼 제거 후):
/*
public,reservation_cruise,reservation_id,uuid
public,reservation_cruise,room_price_code,text
public,reservation_cruise,checkin,date
public,reservation_cruise,guest_count,integer
public,reservation_cruise,unit_price,numeric
public,reservation_cruise,boarding_assist,text
public,reservation_cruise,room_total_price,numeric
public,reservation_cruise,request_note,text
*/

DO $$
BEGIN
    RAISE NOTICE '📝 DB 구조 변경 사항:';
    RAISE NOTICE '✅ 추가된 테이블: reservation_cruise_car (12개 컬럼)';
    RAISE NOTICE '❌ 제거된 컬럼: reservation_cruise 테이블에서 차량 관련 7개 컬럼';
    RAISE NOTICE '🔄 sql/db.csv 파일을 수동으로 업데이트하세요!';
END $$;
