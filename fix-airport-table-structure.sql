-- 현재 reservation_airport 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'reservation_airport'
ORDER BY ordinal_position;

-- 모든 예약 테이블의 외래키 컬럼 확인
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name LIKE 'reservation_%' 
  AND (column_name LIKE '%reservation_id%' OR column_name LIKE '%ra_reservation_id%')
ORDER BY table_name, column_name;
