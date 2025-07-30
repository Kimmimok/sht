-- 예약 시스템 수정 및 함수 생성 (단계별 실행)
-- 외래키가 이미 존재하는 경우를 위한 개별 실행 스크립트

-- 1. 관리자용 예약 조회 함수 생성
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
  -- 모든 예약 데이터 반환 (권한 체크 없이 - 테스트용)
  RETURN QUERY
  SELECT 
    r.re_id,
    r.re_type,
    r.re_status,
    r.re_created_at,
    r.re_user_id,
    u.name as user_name,
    u.email as user_email,
    COALESCE(u.phone, u.phone_number)::TEXT as user_phone  -- 명시적 TEXT 변환
  FROM reservation r
  LEFT JOIN users u ON u.id = r.re_user_id
  ORDER BY r.re_created_at DESC;
END;
$$;
