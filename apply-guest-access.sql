-- 견적자(게스트) 접근을 위한 RLS 정책 수정
-- 견적자는 Supabase 인증만으로 처리, users 테이블 등록 없이 견적 조회 가능

-- 1. quote 테이블에 인증된 사용자 접근 정책 추가  
DROP POLICY IF EXISTS quote_authenticated_access ON quote;
CREATE POLICY quote_authenticated_access ON quote
  FOR SELECT 
  TO authenticated
  USING (true); -- 모든 인증된 사용자가 quote 테이블 조회 가능

-- 2. quote_room 테이블 접근 허용
DROP POLICY IF EXISTS quote_room_authenticated_access ON quote_room;
CREATE POLICY quote_room_authenticated_access ON quote_room
  FOR SELECT 
  TO authenticated
  USING (true);

-- 3. quote_car 테이블 접근 허용
DROP POLICY IF EXISTS quote_car_authenticated_access ON quote_car;
CREATE POLICY quote_car_authenticated_access ON quote_car
  FOR SELECT 
  TO authenticated
  USING (true);

-- 4. quote_room_detail 테이블 접근 허용
DROP POLICY IF EXISTS quote_room_detail_authenticated_access ON quote_room_detail;
CREATE POLICY quote_room_detail_authenticated_access ON quote_room_detail
  FOR SELECT 
  TO authenticated
  USING (true);

-- 5. quote_price_summary 테이블 접근 허용
DROP POLICY IF EXISTS quote_price_summary_authenticated_access ON quote_price_summary;
CREATE POLICY quote_price_summary_authenticated_access ON quote_price_summary
  FOR SELECT 
  TO authenticated
  USING (true);

-- 6. quote_item 테이블 접근 허용 (있다면)
DROP POLICY IF EXISTS quote_item_authenticated_access ON quote_item;
CREATE POLICY quote_item_authenticated_access ON quote_item
  FOR SELECT 
  TO authenticated
  USING (true);

-- 7. reservation 테이블 - 예약자만 자신의 예약 조회 가능
DROP POLICY IF EXISTS reservation_owner_access ON reservation;
CREATE POLICY reservation_owner_access ON reservation
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid() OR user_id IN (
    SELECT id FROM users WHERE id = auth.uid()
  ));

-- 8. users 테이블 접근 정책 유지 (예약자만 접근)
-- users 테이블은 예약시에만 등록되므로 기존 정책 유지
