-- reservation_cruise 테이블의 boarding_assist 컬럼을 Y/N 타입으로 변경

-- 1. 기존 boarding_assist 컬럼 삭제
ALTER TABLE reservation_cruise DROP COLUMN IF EXISTS boarding_assist;

-- 2. 새로운 boarding_assist 컬럼을 Y/N 문자열로 추가
ALTER TABLE reservation_cruise ADD COLUMN boarding_assist text CHECK (boarding_assist IN ('Y', 'N')) DEFAULT 'N';

-- 확인용 쿼리
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'reservation_cruise' 
AND column_name = 'boarding_assist';
