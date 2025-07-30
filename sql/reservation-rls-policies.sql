-- Reservation 테이블 RLS 정책 설정
-- 매니저와 관리자가 모든 예약을 볼 수 있도록 설정

-- 1. 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS reservation_user_policy ON reservation;
DROP POLICY IF EXISTS reservation_manager_policy ON reservation;
DROP POLICY IF EXISTS reservation_admin_policy ON reservation;

-- 2. RLS 활성화
ALTER TABLE reservation ENABLE ROW LEVEL SECURITY;

-- 3. 일반 사용자: 자신의 예약만 조회 가능
CREATE POLICY reservation_user_policy ON reservation
  FOR ALL 
  USING (
    auth.uid() = re_user_id
  )
  WITH CHECK (
    auth.uid() = re_user_id
  );

-- 4. 매니저: 모든 예약 조회 가능
CREATE POLICY reservation_manager_policy ON reservation
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('manager', 'admin')
    )
  );

-- 5. 관련 테이블들도 동일한 정책 적용

-- reservation_cruise 테이블
ALTER TABLE reservation_cruise ENABLE ROW LEVEL SECURITY;

CREATE POLICY reservation_cruise_user_policy ON reservation_cruise
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM reservation 
      WHERE reservation.re_id = reservation_cruise.reservation_id 
      AND reservation.re_user_id = auth.uid()
    )
  );

CREATE POLICY reservation_cruise_manager_policy ON reservation_cruise
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('manager', 'admin')
    )
  );

-- reservation_airport 테이블
ALTER TABLE reservation_airport ENABLE ROW LEVEL SECURITY;

CREATE POLICY reservation_airport_user_policy ON reservation_airport
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM reservation 
      WHERE reservation.re_id = reservation_airport.ra_reservation_id 
      AND reservation.re_user_id = auth.uid()
    )
  );

CREATE POLICY reservation_airport_manager_policy ON reservation_airport
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('manager', 'admin')
    )
  );

-- 6. 매니저 권한 확인용 뷰 생성 (선택사항)
CREATE OR REPLACE VIEW manager_reservations AS
SELECT 
  r.*,
  u.name as customer_name,
  u.email as customer_email,
  u.phone as customer_phone
FROM reservation r
LEFT JOIN users u ON u.id = r.re_user_id
WHERE 
  EXISTS (
    SELECT 1 FROM users manager_user
    WHERE manager_user.id = auth.uid() 
    AND manager_user.role IN ('manager', 'admin')
  );

-- 7. 뷰에 대한 권한 부여
GRANT SELECT ON manager_reservations TO authenticated;
