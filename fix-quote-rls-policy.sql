-- 견적자용 RLS 정책 수정
-- infinite recursion 오류 해결을 위해 users 테이블 참조 제거

-- 1. 기존 quote 테이블 정책 삭제
DROP POLICY IF EXISTS quote_user_policy ON quote;
DROP POLICY IF EXISTS quote_admin_policy ON quote;

-- 2. 새로운 간단한 정책 생성 (users 테이블 참조 없음)
-- 인증된 사용자는 자신의 견적만 조회/수정 가능
CREATE POLICY quote_auth_user_policy ON quote
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. quote_room 테이블 정책도 수정
DROP POLICY IF EXISTS quote_room_user_policy ON quote_room;
DROP POLICY IF EXISTS quote_room_admin_policy ON quote_room;

CREATE POLICY quote_room_auth_policy ON quote_room
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM quote 
      WHERE quote.id = quote_room.quote_id 
      AND quote.user_id = auth.uid()
    )
  );

-- 4. 확인: 정책 상태 체크
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('quote', 'quote_room')
ORDER BY tablename, policyname;
