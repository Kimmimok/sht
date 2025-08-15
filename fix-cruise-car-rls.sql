-- reservation_cruise_car 테이블 RLS 정책 임시 해제
-- 데이터 이관 작업을 위한 임시 조치

BEGIN;

-- 1. 현재 RLS 상태 확인
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('reservation_cruise_car', 'reservation_car_sht');

-- 2. reservation_cruise_car RLS 임시 비활성화
ALTER TABLE reservation_cruise_car DISABLE ROW LEVEL SECURITY;

-- 3. 또는 이관 작업용 정책 추가
-- CREATE POLICY "allow_insert_for_migration" ON reservation_cruise_car
--   FOR INSERT TO authenticated
--   WITH CHECK (true);

-- 이관 작업 완료 후 다시 활성화 필요:
-- ALTER TABLE reservation_cruise_car ENABLE ROW LEVEL SECURITY;

COMMIT;
