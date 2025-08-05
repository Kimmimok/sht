-- 예약 크루즈 테이블의 boarding_assist 컬럼을 y/n 값으로 변경
-- 1. 기존 컬럼 타입을 boolean 또는 varchar(1)로 변경
ALTER TABLE reservation_cruise
    ALTER COLUMN boarding_assist TYPE varchar(1) USING (CASE WHEN boarding_assist IN ('y','n') THEN boarding_assist ELSE 'n' END);

-- 2. 기본값 및 제약조건 추가 (y/n만 허용)
ALTER TABLE reservation_cruise
    ALTER COLUMN boarding_assist SET DEFAULT 'n';

-- 3. y/n 값만 허용하는 체크 제약조건 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'chk_boarding_assist_yn'
    ) THEN
        ALTER TABLE reservation_cruise
        ADD CONSTRAINT chk_boarding_assist_yn CHECK (boarding_assist IN ('y','n'));
    END IF;
END$$;

-- 4. 기존 데이터 중 y/n이 아닌 값은 모두 'n'으로 업데이트
UPDATE reservation_cruise SET boarding_assist = 'n' WHERE boarding_assist NOT IN ('y','n');

-- 5. 컬럼 설명(선택)
COMMENT ON COLUMN reservation_cruise.boarding_assist IS '승선 도움 여부(y/n)';
