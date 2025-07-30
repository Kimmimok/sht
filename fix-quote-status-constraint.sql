-- quote 테이블의 상태 제약 조건 확인 및 수정
-- 현재 허용된 상태값 확인
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'quote'::regclass 
AND contype = 'c';

-- 현재 quote 테이블의 구조 확인
\d quote;

-- 상태 제약 조건 제거 (기존)
ALTER TABLE quote DROP CONSTRAINT IF EXISTS quote_status_check;

-- 새로운 상태 제약 조건 추가 (더 많은 상태 허용)
ALTER TABLE quote ADD CONSTRAINT quote_status_check 
CHECK (status IN ('pending', 'submitted', 'draft', 'approved', 'confirmed', 'rejected', 'cancelled'));

-- 현재 견적들의 상태 확인
SELECT status, COUNT(*) as count 
FROM quote 
GROUP BY status;

-- 특정 견적 확인
SELECT id, status, created_at, updated_at 
FROM quote 
WHERE id = '461dd832-a409-4c4f-ac98-17aa0de1b09a';
