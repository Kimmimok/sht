-- 4. 테스트용 예약 데이터 확인/생성
DO $$
DECLARE
  test_user_id UUID;
  existing_reservation_count INTEGER;
BEGIN
  -- 기존 예약 데이터 개수 확인
  SELECT COUNT(*) INTO existing_reservation_count FROM reservation;
  RAISE NOTICE 'Current reservation count: %', existing_reservation_count;
  
  IF existing_reservation_count = 0 THEN
    -- 기존 사용자 중 하나 선택 (관리자 우선, 없으면 아무나)
    SELECT id INTO test_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    IF test_user_id IS NULL THEN
      SELECT id INTO test_user_id FROM users LIMIT 1;
    END IF;
    
    IF test_user_id IS NOT NULL THEN
      -- 테스트 예약 데이터 생성
      INSERT INTO reservation (re_id, re_user_id, re_type, re_status, re_created_at)
      VALUES 
        (gen_random_uuid(), test_user_id, 'cruise', 'pending', NOW()),
        (gen_random_uuid(), test_user_id, 'airport', 'confirmed', NOW() - INTERVAL '1 day'),
        (gen_random_uuid(), test_user_id, 'hotel', 'cancelled', NOW() - INTERVAL '2 days');
      
      RAISE NOTICE 'Test reservation data created for user: %', test_user_id;
    ELSE
      RAISE NOTICE 'No users found to create test reservation data';
    END IF;
  ELSE
    RAISE NOTICE 'Reservation data already exists: % records', existing_reservation_count;
  END IF;
END $$;
