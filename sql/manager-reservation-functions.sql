-- 관리자용 예약 데이터 조회 함수
-- RLS 정책을 우회하여 모든 예약 데이터 조회

-- 1. 관리자용 예약 조회 함수
CREATE OR REPLACE FUNCTION get_all_reservations_admin()
RETURNS TABLE(
  re_id UUID,
  re_type TEXT,
  re_status TEXT,
  re_created_at TIMESTAMPTZ,
  re_user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 현재 사용자가 관리자인지 확인
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or Manager role required';
  END IF;

  -- 모든 예약 데이터 반환
  RETURN QUERY
  SELECT 
    r.re_id,
    r.re_type,
    r.re_status,
    r.re_created_at,
    r.re_user_id,
    u.name as user_name,
    u.email as user_email,
    u.phone as user_phone
  FROM reservation r
  LEFT JOIN users u ON u.id = r.re_user_id
  ORDER BY r.re_created_at DESC;
END;
$$;

-- 2. 예약 통계 조회 함수
CREATE OR REPLACE FUNCTION get_reservation_stats_admin()
RETURNS TABLE(
  total_count BIGINT,
  pending_count BIGINT,
  confirmed_count BIGINT,
  cancelled_count BIGINT,
  cruise_count BIGINT,
  airport_count BIGINT,
  hotel_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 현재 사용자가 관리자인지 확인
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or Manager role required';
  END IF;

  -- 예약 통계 반환
  RETURN QUERY
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE re_status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE re_status = 'confirmed') as confirmed_count,
    COUNT(*) FILTER (WHERE re_status = 'cancelled') as cancelled_count,
    COUNT(*) FILTER (WHERE re_type = 'cruise') as cruise_count,
    COUNT(*) FILTER (WHERE re_type = 'airport') as airport_count,
    COUNT(*) FILTER (WHERE re_type = 'hotel') as hotel_count
  FROM reservation;
END;
$$;

-- 3. 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_all_reservations_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_reservation_stats_admin() TO authenticated;

-- 4. 테스트 예약 데이터 생성 (데이터가 없는 경우)
DO $$
DECLARE
  test_user_id UUID;
  test_quote_id UUID;
BEGIN
  -- 테스트용 사용자 확인/생성
  SELECT id INTO test_user_id FROM users WHERE email = 'test@example.com' LIMIT 1;
  
  IF test_user_id IS NULL THEN
    INSERT INTO users (id, email, name, role, created_at)
    VALUES (gen_random_uuid(), 'test@example.com', '테스트 고객', 'member', NOW())
    RETURNING id INTO test_user_id;
  END IF;

  -- 테스트용 견적 생성
  INSERT INTO quote (id, user_id, title, status, created_at)
  VALUES (gen_random_uuid(), test_user_id, '테스트 견적', 'confirmed', NOW())
  RETURNING id INTO test_quote_id;

  -- 테스트용 예약 데이터 생성 (기존에 없다면)
  IF NOT EXISTS (SELECT 1 FROM reservation WHERE re_user_id = test_user_id) THEN
    INSERT INTO reservation (re_id, re_user_id, re_quote_id, re_type, re_status, re_created_at)
    VALUES 
      (gen_random_uuid(), test_user_id, test_quote_id, 'cruise', 'pending', NOW()),
      (gen_random_uuid(), test_user_id, test_quote_id, 'airport', 'confirmed', NOW() - INTERVAL '1 day'),
      (gen_random_uuid(), test_user_id, test_quote_id, 'hotel', 'cancelled', NOW() - INTERVAL '2 days');
  END IF;

  RAISE NOTICE 'Test data created successfully';
END $$;
