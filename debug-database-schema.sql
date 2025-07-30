-- 데이터베이스 테이블 존재 여부와 제약 조건 확인
-- 1. quote 테이블의 제약 조건 확인
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'quote'::regclass 
AND contype = 'c'
AND conname LIKE '%status%';

-- 2. 서비스 테이블들이 존재하는지 확인
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('quote_room', 'rentcar', 'cruise', 'airport', 'hotel', 'tour');

-- 3. quote 테이블의 컬럼 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'quote' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. 현재 quote 데이터의 상태값들 확인
SELECT DISTINCT status, COUNT(*) as count
FROM quote 
GROUP BY status
ORDER BY count DESC;

-- 5. 문제가 되는 견적 확인
SELECT id, status, user_id, created_at, updated_at
FROM quote 
WHERE id = '461dd832-a409-4c4f-ac98-17aa0de1b09a';

-- 6. users 테이블 존재 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public';

-- 7. 해당 사용자 존재 확인
SELECT id, name, email, role 
FROM users 
WHERE id = '211c139e-c1f3-41b9-a6b2-d5f1519541ce';
