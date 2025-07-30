-- 게스트 사용자 접근 허용을 위한 RLS 정책 수정

-- 1. users 테이블에 게스트 접근 정책 추가
DROP POLICY IF EXISTS users_guest_access_policy ON users;
CREATE POLICY users_guest_access_policy ON users
  FOR SELECT 
  USING (true); -- 모든 사용자가 users 테이블 조회 가능

-- 2. quote 테이블에 게스트 접근 정책 추가  
DROP POLICY IF EXISTS quote_guest_policy ON quote;
CREATE POLICY quote_guest_policy ON quote
  FOR SELECT 
  USING (true); -- 모든 사용자가 quote 테이블 조회 가능

-- 3. 관련 테이블들도 게스트 접근 허용
DROP POLICY IF EXISTS quote_room_guest_policy ON quote_room;
CREATE POLICY quote_room_guest_policy ON quote_room
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS quote_car_guest_policy ON quote_car;
CREATE POLICY quote_car_guest_policy ON quote_car
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS quote_room_detail_guest_policy ON quote_room_detail;
CREATE POLICY quote_room_detail_guest_policy ON quote_room_detail
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS quote_price_summary_guest_policy ON quote_price_summary;
CREATE POLICY quote_price_summary_guest_policy ON quote_price_summary
  FOR SELECT 
  USING (true);

-- 4. quote_item 테이블도 게스트 접근 허용 (있다면)
-- ALTER TABLE quote_item ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS quote_item_guest_policy ON quote_item;
-- CREATE POLICY quote_item_guest_policy ON quote_item
--   FOR SELECT 
--   USING (true);
