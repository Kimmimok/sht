-- 최소한의 Supabase 인증 연결 설정 (오류 방지 버전)
-- 이 스크립트는 Supabase SQL Editor에서 실행하세요

-- 1. 사용자 정보 업데이트 헬퍼 함수 (애플리케이션에서 호출용)
CREATE OR REPLACE FUNCTION upsert_user_profile(
  user_id UUID,
  user_email TEXT,
  user_role TEXT DEFAULT 'guest'
) 
RETURNS void AS $$
BEGIN
  -- 사용자 프로필을 업데이트하거나 생성
  INSERT INTO public.users (id, email, role, created_at)
  VALUES (
    user_id, 
    user_email, 
    user_role,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RLS 정책 설정 - 견적자도 접근 가능하도록
-- 인증된 모든 사용자가 견적 조회 가능
DROP POLICY IF EXISTS "Allow authenticated users to view quotes" ON quote;
CREATE POLICY "Allow authenticated users to view quotes"
  ON quote FOR SELECT
  TO authenticated
  USING (true);

-- 견적 생성은 인증된 사용자만 가능
DROP POLICY IF EXISTS "Allow authenticated users to create quotes" ON quote;
CREATE POLICY "Allow authenticated users to create quotes"
  ON quote FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 본인 견적만 수정 가능
DROP POLICY IF EXISTS "Allow users to update own quotes" ON quote;
CREATE POLICY "Allow users to update own quotes"
  ON quote FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. quote_item 테이블 RLS 정책
DROP POLICY IF EXISTS "Allow authenticated users to view quote items" ON quote_item;
CREATE POLICY "Allow authenticated users to view quote items"
  ON quote_item FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote 
      WHERE quote.id = quote_item.quote_id
    )
  );

-- quote_item 생성/수정은 견적 소유자만 가능
DROP POLICY IF EXISTS "Allow users to manage own quote items" ON quote_item;
CREATE POLICY "Allow users to manage own quote items"
  ON quote_item FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote 
      WHERE quote.id = quote_item.quote_id 
      AND quote.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quote 
      WHERE quote.id = quote_item.quote_id 
      AND quote.user_id = auth.uid()
    )
  );

-- 5. 예약 관련 RLS 정책
DROP POLICY IF EXISTS "Allow members to view own reservations" ON reservation;
CREATE POLICY "Allow members to view own reservations"
  ON reservation FOR SELECT
  TO authenticated
  USING (re_user_id = auth.uid());

DROP POLICY IF EXISTS "Allow members to create reservations" ON reservation;
CREATE POLICY "Allow members to create reservations"
  ON reservation FOR INSERT
  TO authenticated
  WITH CHECK (
    re_user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('member', 'manager', 'admin')
    )
  );

-- 6. users 테이블 RLS 정책 업데이트
-- 본인 정보만 조회/수정 가능, 관리자는 모든 사용자 조회 가능
DROP POLICY IF EXISTS "Allow users to view own profile or admin view all" ON users;
CREATE POLICY "Allow users to view own profile or admin view all"
  ON users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role IN ('admin', 'manager')
    )
  );

-- 본인 정보 수정
DROP POLICY IF EXISTS "Allow users to update own profile" ON users;
CREATE POLICY "Allow users to update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 새 사용자 등록 (예약시 자동 등록용)
DROP POLICY IF EXISTS "Allow authenticated users to insert profile" ON users;
CREATE POLICY "Allow authenticated users to insert profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

COMMENT ON FUNCTION upsert_user_profile(UUID, TEXT, TEXT) IS '사용자 프로필 생성/업데이트 (애플리케이션에서 호출)';
