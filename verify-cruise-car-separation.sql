-- 🧪 크루즈 차량 분리 시스템 검증 스크립트
-- 날짜: 2025.08.09
-- 목적: 차량 분리 후 시스템 정상 작동 확인

-- 1. 테이블 존재 확인
SELECT 
    'reservation_cruise_car' as table_name,
    EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reservation_cruise_car'
    ) as exists;

-- 2. 차량 데이터 마이그레이션 확인
SELECT 
    'migration_status' as check_type,
    COUNT(*) as migrated_records
FROM public.reservation_cruise_car;

-- 3. 크루즈 테이블 차량 컬럼 삭제 확인
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'reservation_cruise'
  AND column_name LIKE '%car%'
ORDER BY column_name;

-- 4. 외래키 제약조건 확인
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'reservation_cruise_car';

-- 5. RLS 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'reservation_cruise_car';

-- 6. 인덱스 확인
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'reservation_cruise_car'
  AND schemaname = 'public';

-- 7. 트리거 확인
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'reservation_cruise_car';

-- 8. 테스트 데이터 삽입 (선택사항)
-- 주의: 실제 reservation_id가 존재하는 경우에만 실행
/*
INSERT INTO public.reservation_cruise_car (
    reservation_id,
    car_price_code,
    car_count,
    passenger_count,
    pickup_location,
    dropoff_location,
    car_total_price,
    request_note
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- 실제 reservation_id로 변경
    'TEST-CAR-001',
    2,
    8,
    '인천공항',
    '여의도',
    450000,
    '테스트 차량 예약'
) 
ON CONFLICT DO NOTHING;
*/

-- 9. 통합 조회 테스트 (크루즈 + 차량) - 분리된 요청사항 포함
SELECT 
    r.re_id,
    r.re_user_id,
    r.re_quote_id,
    r.re_status,
    rc.room_price_code,
    rc.checkin,
    rc.guest_count,
    rc.room_total_price,
    rc.request_note as room_request_note,
    rcc.car_price_code,
    rcc.car_count,
    rcc.passenger_count,
    rcc.car_total_price,
    rcc.request_note as car_request_note,
    (rc.room_total_price + COALESCE(rcc.car_total_price, 0)) as total_amount
FROM public.reservation r
LEFT JOIN public.reservation_cruise rc ON r.re_id = rc.reservation_id
LEFT JOIN public.reservation_cruise_car rcc ON r.re_id = rcc.reservation_id
WHERE r.re_type = 'cruise'
LIMIT 5;

-- 실행 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '🧪 크루즈 차량 분리 시스템 검증 완료!';
    RAISE NOTICE '✅ 모든 검사 항목을 확인하세요.';
    RAISE NOTICE '🔍 통합 조회 결과로 분리된 구조가 정상 작동하는지 확인하세요.';
    RAISE NOTICE '📝 요청사항도 객실과 차량으로 분리되어 저장되는지 확인하세요.';
END $$;
