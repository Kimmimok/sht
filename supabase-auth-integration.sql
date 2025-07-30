-- Supabase 인증과 users 테이블 연결 설정
-- 이 스크립트는 Supabase SQL Editor에서 실행하세요

-- 1. users 테이블이 Supabase auth.users와 연결되도록 FK 설정 확인
-- (이미 설정되어 있다면 스킵)

-- 2. 자동으로 인증된 사용자를 users 테이블에 등록하는 함수
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- 새로운 사용자가 회원가입하면 자동으로 users 테이블에 추가
  INSERT INTO public.users (id, email, role, created_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    'guest',  -- 기본 역할을 guest로 설정
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- 이미 존재하면 무시
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. auth.users 테이블에서 INSERT 시 자동으로 users 테이블에 추가하는 트리거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. RLS 정책 설정 - 견적자도 접근 가능하도록
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

-- 5. quote_item 테이블 RLS 정책
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

-- 6. 예약 관련 RLS 정책
-- 예약은 users 테이블에 등록된 사용자만 가능
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

-- 7. 서비스 테이블들은 모든 인증된 사용자가 조회 가능
-- (실제로 존재하는 테이블들만 포함)

-- cruise 테이블 (또는 cruise_info)
DROP POLICY IF EXISTS "Allow authenticated users to view cruise" ON cruise;
CREATE POLICY "Allow authenticated users to view cruise"
  ON cruise FOR SELECT
  TO authenticated
  USING (true);

-- hotel 테이블
DROP POLICY IF EXISTS "Allow authenticated users to view hotel" ON hotel;
CREATE POLICY "Allow authenticated users to view hotel"
  ON hotel FOR SELECT
  TO authenticated
  USING (true);

-- airport 테이블
DROP POLICY IF EXISTS "Allow authenticated users to view airport" ON airport;
CREATE POLICY "Allow authenticated users to view airport"
  ON airport FOR SELECT
  TO authenticated
  USING (true);

-- tour 테이블
DROP POLICY IF EXISTS "Allow authenticated users to view tour" ON tour;
CREATE POLICY "Allow authenticated users to view tour"
  ON tour FOR SELECT
  TO authenticated
  USING (true);

-- rentcar 테이블
DROP POLICY IF EXISTS "Allow authenticated users to view rentcar" ON rentcar;
CREATE POLICY "Allow authenticated users to view rentcar"
  ON rentcar FOR SELECT
  TO authenticated
  USING (true);

-- room_price 테이블 (실제로 존재하는 경우만)
DROP POLICY IF EXISTS "Allow authenticated users to view room_price" ON room_price;
CREATE POLICY "Allow authenticated users to view room_price"
  ON room_price FOR SELECT
  TO authenticated
  USING (true);

-- quote_room, quote_car 테이블 (실제로 존재하는 경우)
DROP POLICY IF EXISTS "Allow authenticated users to view quote_room" ON quote_room;
CREATE POLICY "Allow authenticated users to view quote_room"
  ON quote_room FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to view quote_car" ON quote_car;
CREATE POLICY "Allow authenticated users to view quote_car"
  ON quote_car FOR SELECT
  TO authenticated
  USING (true);

-- 8. users 테이블 RLS 정책 업데이트
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

COMMENT ON FUNCTION handle_new_user() IS '새로운 인증 사용자를 users 테이블에 자동 등록';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS '인증 회원가입시 users 테이블 자동 생성';
