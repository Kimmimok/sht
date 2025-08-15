-- 매니저가 예약이 있는 사용자 정보를 조회할 수 있도록 RLS 정책 추가
-- 적용 전제: users 테이블에 RLS 활성화됨, 역할 컬럼(users.role)에 'admin' | 'manager' 사용
-- 효과: 관리자/매니저는 예약이 존재하는 사용자(rows)만 SELECT 가능

-- 참고: 기존 정책과 충돌하지 않도록 PERMISSIVE 정책으로 추가
-- PostgREST 오류 방지: 정책명은 고유해야 함

BEGIN;

-- 정책이 이미 있으면 먼저 삭제 (반복 적용 안전성)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'manager_can_select_users_with_reservations'
  ) THEN
    EXECUTE 'DROP POLICY manager_can_select_users_with_reservations ON users';
  END IF;
END$$;

CREATE POLICY manager_can_select_users_with_reservations ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users me
      WHERE me.id = auth.uid()
        AND me.role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1
      FROM reservation r
      WHERE r.re_user_id = users.id
    )
  );

COMMIT;
