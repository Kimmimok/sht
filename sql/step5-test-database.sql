-- 5. 데이터베이스 상태 확인 및 테스트
DO $$
DECLARE
  reservation_count INTEGER;
  user_count INTEGER;
  sample_data RECORD;
BEGIN
  SELECT COUNT(*) INTO reservation_count FROM reservation;
  SELECT COUNT(*) INTO user_count FROM users;
  
  RAISE NOTICE 'Database status check:';
  RAISE NOTICE '- Total reservations: %', reservation_count;
  RAISE NOTICE '- Total users: %', user_count;
  
  -- 외래키 관계 및 함수 테스트
  IF reservation_count > 0 THEN
    RAISE NOTICE 'Testing reservation-user relationship:';
    
    -- 샘플 데이터 조회
    SELECT r.re_id, r.re_type, r.re_status, u.name, u.email
    INTO sample_data
    FROM reservation r
    LEFT JOIN users u ON u.id = r.re_user_id
    LIMIT 1;
    
    RAISE NOTICE 'Sample: ID=%, Type=%, Status=%, User=%', 
      sample_data.re_id, sample_data.re_type, sample_data.re_status, sample_data.name;
    
    -- 관리자 함수 테스트
    RAISE NOTICE 'Testing get_all_reservations_admin function...';
    PERFORM * FROM get_all_reservations_admin() LIMIT 1;
    RAISE NOTICE 'Function test completed successfully';
  END IF;
END $$;
