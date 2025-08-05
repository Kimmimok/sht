-- boarding_assist CHECK 제약조건 확인
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%boarding_assist%';

-- reservation_cruise 테이블의 모든 제약조건 확인
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%reservation_cruise%';

-- 테이블 정의 확인
-- 승선도움(boarding_assist) 필수 아님: NULL 허용 및 CHECK 제약조건 수정
ALTER TABLE reservation_cruise ALTER COLUMN boarding_assist DROP NOT NULL;
ALTER TABLE reservation_cruise DROP CONSTRAINT IF EXISTS reservation_cruise_boarding_assist_check;
ALTER TABLE reservation_cruise ADD CONSTRAINT reservation_cruise_boarding_assist_check CHECK (boarding_assist IN ('y', 'n') OR boarding_assist IS NULL);
-- 테이블 정의 확인
\d reservation_cruise;
