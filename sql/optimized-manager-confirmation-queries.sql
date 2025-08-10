-- 📋 매니저 확인서 데이터 조회용 최적화된 SQL

-- 🎯 옵션 1: 단일 CTE 쿼리 (가장 효율적)
-- 하나의 쿼리로 모든 정보를 조회
WITH quote_with_user AS (
    SELECT 
        q.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
    FROM quote q
    LEFT JOIN users u ON q.user_id = u.id
    WHERE q.id = 'a98e1c30-bce0-4a18-8f12-df9ad8baa973'
),
reservation_details AS (
    SELECT 
        r.re_id,
        r.re_type,
        r.re_status,
        r.re_created_at,
        -- 서비스별 상세 정보와 금액을 하나의 JSON으로 결합
        CASE 
            WHEN r.re_type = 'cruise' THEN json_build_object(
                'room_price_code', rc.room_price_code,
                'checkin', rc.checkin,
                'guest_count', rc.guest_count,
                'unit_price', rc.unit_price,
                'room_total_price', rc.room_total_price,
                'request_note', rc.request_note,
                'amount', COALESCE(rc.room_total_price, rc.unit_price, 0)
            )
            WHEN r.re_type = 'airport' THEN json_build_object(
                'airport_price_code', ra.airport_price_code,
                'ra_airport_location', ra.ra_airport_location,
                'ra_flight_number', ra.ra_flight_number,
                'ra_datetime', ra.ra_datetime,
                'ra_passenger_count', ra.ra_passenger_count,
                'ra_luggage_count', ra.ra_luggage_count,
                'unit_price', ra.unit_price,
                'total_price', ra.total_price,
                'amount', COALESCE(ra.total_price, ra.unit_price, 0)
            )
            WHEN r.re_type = 'hotel' THEN json_build_object(
                'hotel_price_code', rh.hotel_price_code,
                'hotel_name', rh.hotel_name,
                'checkin_date', rh.checkin_date,
                'nights', rh.nights,
                'guest_count', rh.guest_count,
                'total_price', rh.total_price,
                'amount', COALESCE(rh.total_price, 0)
            )
            WHEN r.re_type = 'rentcar' THEN json_build_object(
                'rentcar_price_code', rr.rentcar_price_code,
                'car_type', rr.car_type,
                'pickup_date', rr.pickup_date,
                'rental_days', rr.rental_days,
                'total_price', rr.total_price,
                'amount', COALESCE(rr.total_price, 0)
            )
            WHEN r.re_type = 'tour' THEN json_build_object(
                'tour_price_code', rt.tour_price_code,
                'tour_name', rt.tour_name,
                'tour_date', rt.tour_date,
                'participant_count', rt.participant_count,
                'total_price', rt.total_price,
                'amount', COALESCE(rt.total_price, 0)
            )
            WHEN r.re_type = 'car' THEN json_build_object(
                'vehicle_number', rcar.vehicle_number,
                'seat_number', rcar.seat_number,
                'color_label', rcar.color_label,
                'total_price', rcar.total_price,
                'amount', COALESCE(rcar.total_price, 0)
            )
            ELSE json_build_object('amount', 0)
        END as service_details
    FROM reservation r
    LEFT JOIN reservation_cruise rc ON r.re_id = rc.reservation_id AND r.re_type = 'cruise'
    LEFT JOIN reservation_airport ra ON r.re_id = ra.reservation_id AND r.re_type = 'airport'
    LEFT JOIN reservation_hotel rh ON r.re_id = rh.reservation_id AND r.re_type = 'hotel'
    LEFT JOIN reservation_rentcar rr ON r.re_id = rr.reservation_id AND r.re_type = 'rentcar'
    LEFT JOIN reservation_tour rt ON r.re_id = rt.reservation_id AND r.re_type = 'tour'
    LEFT JOIN reservation_car_sht rcar ON r.re_id = rcar.reservation_id AND r.re_type = 'car'
    WHERE r.re_quote_id = 'a98e1c30-bce0-4a18-8f12-df9ad8baa973'
    ORDER BY r.re_created_at
)
SELECT json_build_object(
    'quote_id', qwu.id,
    'title', COALESCE(qwu.title, '제목 없음'),
    'user_name', COALESCE(qwu.user_name, '알 수 없음'),
    'user_email', COALESCE(qwu.user_email, ''),
    'user_phone', COALESCE(qwu.user_phone, ''),
    'total_price', COALESCE(qwu.total_price, 0),
    'payment_status', COALESCE(qwu.payment_status, 'pending'),
    'created_at', qwu.created_at,
    'confirmed_at', qwu.confirmed_at,
    'reservations', COALESCE(
        (SELECT json_agg(
            json_build_object(
                'reservation_id', re_id,
                'service_type', re_type,
                'status', re_status,
                'created_at', re_created_at,
                'service_details', service_details,
                'amount', (service_details->>'amount')::numeric
            )
        ) FROM reservation_details),
        json_build_array()
    )
) as result
FROM quote_with_user qwu;

-- 🎯 옵션 2: Supabase 함수로 생성하여 재사용
-- CREATE OR REPLACE FUNCTION get_manager_confirmation_data_v2(quote_id_param TEXT)
-- RETURNS JSON AS $$
-- [위의 쿼리를 함수로 감싸기]
-- $$ LANGUAGE SQL SECURITY DEFINER;

-- 🎯 옵션 3: JavaScript/TypeScript에서 사용할 수 있는 간단한 버전
-- 복잡한 JSON 처리 없이 기본 조인만 사용

SELECT 
    q.id as quote_id,
    q.title,
    q.total_price,
    q.payment_status,
    q.created_at,
    q.confirmed_at,
    u.name as user_name,
    u.email as user_email,
    u.phone as user_phone
FROM quote q
LEFT JOIN users u ON q.user_id = u.id
WHERE q.id = 'a98e1c30-bce0-4a18-8f12-df9ad8baa973';

-- 별도로 예약 정보 조회:
-- SELECT * FROM reservation WHERE re_quote_id = 'a98e1c30-bce0-4a18-8f12-df9ad8baa973';
