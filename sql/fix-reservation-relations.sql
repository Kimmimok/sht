-- 예약 시스템 수정 - 견적과 동일한 구조 적용
-- reservation → reservation_airport/reservation_cruise/reservation_room/reservation_car
-- db.csv 파일 기준 실제 스키마에 맞게 작성
-- 신청자 정보 및 신청일시 컬럼 추가

-- 0. 예약 테이블에 신청자 정보 컬럼 추가
DO $$
BEGIN
  -- 신청자 이름 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservation' AND column_name = 'applicant_name'
  ) THEN
    ALTER TABLE reservation ADD COLUMN applicant_name TEXT;
    RAISE NOTICE 'Added applicant_name column to reservation table';
  END IF;

  -- 신청자 이메일 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservation' AND column_name = 'applicant_email'
  ) THEN
    ALTER TABLE reservation ADD COLUMN applicant_email TEXT;
    RAISE NOTICE 'Added applicant_email column to reservation table';
  END IF;

  -- 신청자 연락처 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservation' AND column_name = 'applicant_phone'
  ) THEN
    ALTER TABLE reservation ADD COLUMN applicant_phone TEXT;
    RAISE NOTICE 'Added applicant_phone column to reservation table';
  END IF;

  -- 신청일시 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservation' AND column_name = 'application_datetime'
  ) THEN
    ALTER TABLE reservation ADD COLUMN application_datetime TIMESTAMPTZ;
    RAISE NOTICE 'Added application_datetime column to reservation table';
  END IF;

END $$;

-- 1. 외래키 관계 확인 및 생성
DO $$
BEGIN
  -- reservation 테이블에 users 테이블에 대한 외래키 제약 조건이 있는지 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reservation_re_user_id_fkey' 
    AND table_name = 'reservation'
  ) THEN
    -- 외래키 제약 조건 추가
    ALTER TABLE reservation 
    ADD CONSTRAINT reservation_re_user_id_fkey 
    FOREIGN KEY (re_user_id) REFERENCES users(id);
    
    RAISE NOTICE 'Foreign key constraint added: reservation_re_user_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists: reservation_re_user_id_fkey';
  END IF;

  -- reservation_airport에 reservation에 대한 외래키 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reservation_airport_ra_reservation_id_fkey' 
    AND table_name = 'reservation_airport'
  ) THEN
    ALTER TABLE reservation_airport 
    ADD CONSTRAINT reservation_airport_ra_reservation_id_fkey 
    FOREIGN KEY (ra_reservation_id) REFERENCES reservation(re_id);
    
    RAISE NOTICE 'Foreign key constraint added: reservation_airport_ra_reservation_id_fkey';
  END IF;

  -- reservation_cruise에 reservation에 대한 외래키 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reservation_cruise_reservation_id_fkey' 
    AND table_name = 'reservation_cruise'
  ) THEN
    ALTER TABLE reservation_cruise 
    ADD CONSTRAINT reservation_cruise_reservation_id_fkey 
    FOREIGN KEY (reservation_id) REFERENCES reservation(re_id);
    
    RAISE NOTICE 'Foreign key constraint added: reservation_cruise_reservation_id_fkey';
  END IF;

END $$;

-- 2. 기존 함수 삭제 후 새로 생성
DROP FUNCTION IF EXISTS get_all_reservations_admin();

-- 관리자용 예약 조회 함수 생성 (견적 구조와 동일, 신청자 정보 포함)
CREATE FUNCTION get_all_reservations_admin()
RETURNS TABLE(
  re_id UUID,
  re_type TEXT,
  re_status TEXT,
  re_created_at TIMESTAMPTZ,
  re_user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  -- 신청자 정보 (추가)
  applicant_name TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  application_datetime TIMESTAMPTZ,
  -- 크루즈 서비스 정보
  cruise_checkin DATE,
  cruise_guest_count INTEGER,
  -- 공항 서비스 정보  
  airport_name TEXT,
  airport_direction TEXT,
  airport_datetime TIMESTAMPTZ,
  -- 서비스 개수
  service_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 모든 예약 데이터와 연결된 서비스들 반환 (신청자 정보 포함)
  RETURN QUERY
  SELECT 
    r.re_id,
    r.re_type,
    r.re_status,
    r.re_created_at,
    r.re_user_id,
    u.name as user_name,
    u.email as user_email,
    COALESCE(u.phone, u.phone_number)::TEXT as user_phone,
    -- 신청자 정보 (새로 추가)
    r.applicant_name,
    r.applicant_email,
    r.applicant_phone,
    r.application_datetime,
    -- 크루즈 정보 (첫 번째 크루즈만)
    rc.checkin as cruise_checkin,
    rc.guest_count as cruise_guest_count,
    -- 공항 정보 (첫 번째 공항만)
    ra.ra_airport_name as airport_name,
    ra.ra_direction as airport_direction,
    ra.ra_datetime::TIMESTAMPTZ as airport_datetime,
    -- 전체 서비스 개수 계산
    (
      COALESCE((SELECT COUNT(*) FROM reservation_cruise WHERE reservation_id = r.re_id), 0) +
      COALESCE((SELECT COUNT(*) FROM reservation_airport WHERE ra_reservation_id = r.re_id), 0) +
      COALESCE((SELECT COUNT(*) FROM reservation_room WHERE reservation_id = r.re_id), 0) +
      COALESCE((SELECT COUNT(*) FROM reservation_car WHERE reservation_id = r.re_id), 0)
    )::INTEGER as service_count
  FROM reservation r
  LEFT JOIN users u ON u.id = r.re_user_id
  LEFT JOIN reservation_cruise rc ON rc.reservation_id = r.re_id
  LEFT JOIN reservation_airport ra ON ra.ra_reservation_id = r.re_id
  GROUP BY r.re_id, r.re_type, r.re_status, r.re_created_at, r.re_user_id, 
           u.name, u.email, u.phone, u.phone_number, 
           r.applicant_name, r.applicant_email, r.applicant_phone, r.application_datetime,
           rc.checkin, rc.guest_count,
           ra.ra_airport_name, ra.ra_direction, ra.ra_datetime
  ORDER BY r.re_created_at DESC;
END;
$$;

-- 3. 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_all_reservations_admin() TO authenticated;

-- 4. 테스트용 예약 데이터 확인/생성 (견적 구조와 동일)
DO $$
DECLARE
  test_user_id UUID;
  test_reservation_id UUID;
  existing_reservation_count INTEGER;
BEGIN
  -- 기존 예약 데이터 개수 확인
  SELECT COUNT(*) INTO existing_reservation_count FROM reservation;
  
  IF existing_reservation_count = 0 THEN
    -- 기존 사용자 중 하나 선택 (관리자 우선, 없으면 아무나)
    SELECT id INTO test_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    IF test_user_id IS NULL THEN
      SELECT id INTO test_user_id FROM users LIMIT 1;
    END IF;
    
    IF test_user_id IS NOT NULL THEN
      -- 1. 크루즈 예약 생성
      INSERT INTO reservation (re_id, re_user_id, re_type, re_status, re_created_at)
      VALUES (gen_random_uuid(), test_user_id, 'cruise', 'pending', NOW())
      RETURNING re_id INTO test_reservation_id;
      
      -- 크루즈 서비스 추가
      INSERT INTO reservation_cruise (reservation_id, checkin, guest_count)
      VALUES (test_reservation_id, CURRENT_DATE + INTERVAL '7 days', 2);
      
      -- 2. 공항 예약 생성
      INSERT INTO reservation (re_id, re_user_id, re_type, re_status, re_created_at)
      VALUES (gen_random_uuid(), test_user_id, 'airport', 'confirmed', NOW() - INTERVAL '1 day')
      RETURNING re_id INTO test_reservation_id;
      
      -- 공항 서비스 추가
      INSERT INTO reservation_airport (ra_reservation_id, ra_airport_name, ra_direction, ra_datetime, ra_passenger_count)
      VALUES (test_reservation_id, '인천국제공항', '픽업', NOW() + INTERVAL '3 days', 2);
      
      -- 3. 호텔 예약 생성
      INSERT INTO reservation (re_id, re_user_id, re_type, re_status, re_created_at)
      VALUES (gen_random_uuid(), test_user_id, 'hotel', 'cancelled', NOW() - INTERVAL '2 days');
      
      RAISE NOTICE 'Test reservation data with services created for user: %', test_user_id;
    ELSE
      RAISE NOTICE 'No users found to create test reservation data';
    END IF;
  ELSE
    RAISE NOTICE 'Reservation data already exists: % records', existing_reservation_count;
  END IF;
END $$;

-- 5. RLS 정책 설정 (임시 비활성화)
ALTER TABLE reservation DISABLE ROW LEVEL SECURITY;

-- 6. 예약 데이터 조회 테스트 (서비스 연결 확인)
DO $$
DECLARE
  reservation_count INTEGER;
  user_count INTEGER;
  cruise_service_count INTEGER;
  airport_service_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO reservation_count FROM reservation;
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO cruise_service_count FROM reservation_cruise;
  SELECT COUNT(*) INTO airport_service_count FROM reservation_airport;
  
  RAISE NOTICE 'Database status check:';
  RAISE NOTICE '- Total reservations: %', reservation_count;
  RAISE NOTICE '- Total users: %', user_count;
  RAISE NOTICE '- Cruise services: %', cruise_service_count;
  RAISE NOTICE '- Airport services: %', airport_service_count;
  
  -- 외래키 관계 테스트
  IF reservation_count > 0 THEN
    RAISE NOTICE 'Sample reservation with services:';
    PERFORM r.re_id, r.re_type, u.name, u.email,
            (SELECT COUNT(*) FROM reservation_cruise WHERE reservation_id = r.re_id) as cruise_count,
            (SELECT COUNT(*) FROM reservation_airport WHERE ra_reservation_id = r.re_id) as airport_count
    FROM reservation r
    LEFT JOIN users u ON u.id = r.re_user_id
    LIMIT 1;
    RAISE NOTICE 'Foreign key relationship and services working correctly';
  END IF;
END $$;
