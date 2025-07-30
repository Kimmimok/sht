-- 공항 테이블 제약 조건 수정 스크립트 (단계별 실행)
-- airport_service_type_check 제약 조건 문제 해결

-- =================
-- 1단계: 현재 상태 확인
-- =================

-- 기존 제약 조건 확인
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.airport'::regclass 
AND contype = 'c';

-- 현재 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'airport' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =================
-- 2단계: 제약 조건 제거 (주의: 하나씩 실행)
-- =================

-- airport_service_type_check 제약 조건 삭제
-- DO $$
-- BEGIN
--   IF EXISTS (
--     SELECT 1 FROM pg_constraint 
--     WHERE conname = 'airport_service_type_check' 
--     AND conrelid = 'public.airport'::regclass
--   ) THEN
--     ALTER TABLE public.airport DROP CONSTRAINT airport_service_type_check;
--     RAISE NOTICE 'airport_service_type_check 제약 조건이 삭제되었습니다.';
--   ELSE
--     RAISE NOTICE 'airport_service_type_check 제약 조건이 존재하지 않습니다.';
--   END IF;
-- END $$;

-- =================
-- 3단계: 불필요한 컬럼 제거 (주의: 확인 후 실행)
-- =================

-- service_type 컬럼 삭제 (있다면)
-- DO $$
-- BEGIN
--   IF EXISTS (
--     SELECT 1 FROM information_schema.columns 
--     WHERE table_name = 'airport' 
--     AND table_schema = 'public' 
--     AND column_name = 'service_type'
--   ) THEN
--     ALTER TABLE public.airport DROP COLUMN service_type;
--     RAISE NOTICE 'airport 테이블의 service_type 컬럼이 삭제되었습니다.';
--   ELSE
--     RAISE NOTICE 'airport 테이블에 service_type 컬럼이 존재하지 않습니다.';
--   END IF;
-- END $$;

-- =================
-- 4단계: 테스트 실행
-- =================

-- 테스트 삽입 (제약 조건 제거 후)
-- INSERT INTO public.airport (airport_code, passenger_count, special_requests) 
-- VALUES ('TEST123', 2, 'Test insertion after constraint fix')
-- RETURNING id, airport_code, passenger_count, special_requests, created_at;

-- 테스트 데이터 삭제
-- DELETE FROM public.airport WHERE airport_code = 'TEST123';

-- =================
-- 5단계: 최종 확인
-- =================

-- 최종 테이블 구조 확인
-- SELECT 
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'airport' 
-- AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- 제약 조건 최종 확인
-- SELECT 
--   conname as constraint_name,
--   pg_get_constraintdef(oid) as constraint_definition
-- FROM pg_constraint 
-- WHERE conrelid = 'public.airport'::regclass;
