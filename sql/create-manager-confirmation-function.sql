-- 매니저 확인서 페이지용 효율적인 SQL 함수 생성
-- 견적, 사용자, 예약, 서비스 상세를 한 번에 조회

CREATE OR REPLACE FUNCTION get_manager_confirmation_data(quote_id_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    quote_record RECORD;
    user_record RECORD;
    reservations_json JSON;
BEGIN
    -- 1. 견적 정보 조회
    SELECT * INTO quote_record
    FROM quote
    WHERE id = quote_id_param::UUID;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', '견적을 찾을 수 없습니다.');
    END IF;
    
    -- 2. 사용자 정보 조회
    SELECT name, email, phone INTO user_record
    FROM users
    WHERE id = quote_record.user_id;
    
    -- 3. 예약 및 서비스 상세 정보 조회
    WITH reservation_details AS (
        SELECT 
            r.re_id,
            r.re_type,
            r.re_status,
            r.re_created_at,
            -- 크루즈 서비스 상세
            CASE WHEN r.re_type = 'cruise' THEN
                json_build_object(
                    'room_price_code', rc.room_price_code,
                    'checkin', rc.checkin,
                    'guest_count', rc.guest_count,
                    'unit_price', rc.unit_price,
                    'room_total_price', rc.room_total_price,
                    'request_note', rc.request_note
                )
            END as cruise_details,
            -- 공항 서비스 상세
            CASE WHEN r.re_type = 'airport' THEN
                json_build_object(
                    'airport_price_code', ra.airport_price_code,
                    'ra_airport_location', ra.ra_airport_location,
                    'ra_flight_number', ra.ra_flight_number,
                    'ra_datetime', ra.ra_datetime,
                    'ra_passenger_count', ra.ra_passenger_count,
                    'ra_luggage_count', ra.ra_luggage_count,
                    'unit_price', ra.unit_price,
                    'total_price', ra.total_price
                )
            END as airport_details,
            -- 호텔 서비스 상세
            CASE WHEN r.re_type = 'hotel' THEN
                json_build_object(
                    'hotel_price_code', rh.hotel_price_code,
                    'hotel_name', rh.hotel_name,
                    'checkin_date', rh.checkin_date,
                    'nights', rh.nights,
                    'guest_count', rh.guest_count,
                    'total_price', rh.total_price
                )
            END as hotel_details,
            -- 렌터카 서비스 상세
            CASE WHEN r.re_type = 'rentcar' THEN
                json_build_object(
                    'rentcar_price_code', rr.rentcar_price_code,
                    'car_type', rr.car_type,
                    'pickup_date', rr.pickup_date,
                    'rental_days', rr.rental_days,
                    'total_price', rr.total_price
                )
            END as rentcar_details,
            -- 투어 서비스 상세
            CASE WHEN r.re_type = 'tour' THEN
                json_build_object(
                    'tour_price_code', rt.tour_price_code,
                    'tour_name', rt.tour_name,
                    'tour_date', rt.tour_date,
                    'participant_count', rt.participant_count,
                    'total_price', rt.total_price
                )
            END as tour_details,
            -- 차량 서비스 상세
            CASE WHEN r.re_type = 'car' THEN
                json_build_object(
                    'vehicle_number', rcar.vehicle_number,
                    'seat_number', rcar.seat_number,
                    'color_label', rcar.color_label,
                    'total_price', rcar.total_price
                )
            END as car_details
        FROM reservation r
        LEFT JOIN reservation_cruise rc ON r.re_id = rc.reservation_id AND r.re_type = 'cruise'
        LEFT JOIN reservation_airport ra ON r.re_id = ra.reservation_id AND r.re_type = 'airport'
        LEFT JOIN reservation_hotel rh ON r.re_id = rh.reservation_id AND r.re_type = 'hotel'
        LEFT JOIN reservation_rentcar rr ON r.re_id = rr.reservation_id AND r.re_type = 'rentcar'
        LEFT JOIN reservation_tour rt ON r.re_id = rt.reservation_id AND r.re_type = 'tour'
        LEFT JOIN reservation_car_sht rcar ON r.re_id = rcar.reservation_id AND r.re_type = 'car'
        WHERE r.re_quote_id = quote_record.id
        ORDER BY r.re_created_at
    )
    SELECT json_agg(
        json_build_object(
            'reservation_id', re_id,
            'service_type', re_type,
            'status', re_status,
            'created_at', re_created_at,
            'service_details', COALESCE(
                cruise_details,
                airport_details,
                hotel_details,
                rentcar_details,
                tour_details,
                car_details,
                json_build_object()
            ),
            'amount', CASE 
                WHEN cruise_details IS NOT NULL THEN (cruise_details->>'room_total_price')::NUMERIC
                WHEN airport_details IS NOT NULL THEN (airport_details->>'total_price')::NUMERIC
                WHEN hotel_details IS NOT NULL THEN (hotel_details->>'total_price')::NUMERIC
                WHEN rentcar_details IS NOT NULL THEN (rentcar_details->>'total_price')::NUMERIC
                WHEN tour_details IS NOT NULL THEN (tour_details->>'total_price')::NUMERIC
                WHEN car_details IS NOT NULL THEN (car_details->>'total_price')::NUMERIC
                ELSE 0
            END
        )
    ) INTO reservations_json
    FROM reservation_details;
    
    -- 4. 최종 결과 구성
    result := json_build_object(
        'quote_id', quote_record.id,
        'title', COALESCE(quote_record.title, '제목 없음'),
        'user_name', COALESCE(user_record.name, '알 수 없음'),
        'user_email', COALESCE(user_record.email, ''),
        'user_phone', COALESCE(user_record.phone, ''),
        'total_price', COALESCE(quote_record.total_price, 0),
        'payment_status', COALESCE(quote_record.payment_status, 'pending'),
        'created_at', quote_record.created_at,
        'confirmed_at', quote_record.confirmed_at,
        'reservations', COALESCE(reservations_json, json_build_array())
    );
    
    RETURN result;
END;
$$;

-- 함수 사용 예시:
-- SELECT get_manager_confirmation_data('a98e1c30-bce0-4a18-8f12-df9ad8baa973');
