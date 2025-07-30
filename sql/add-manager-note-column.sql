-- 견적 테이블에 매니저 노트 컬럼 추가
-- 이미 컬럼이 존재한다면 오류가 발생하지만 무시해도 됩니다.

ALTER TABLE quote ADD COLUMN IF NOT EXISTS manager_note TEXT;

-- 매니저 노트 컬럼에 대한 설명 추가
COMMENT ON COLUMN quote.manager_note IS '매니저가 승인/거절 시 작성하는 메모';

-- 업데이트된 테이블 구조 확인
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'quote' 
AND column_name = 'manager_note';
