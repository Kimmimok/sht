-- quote_item 테이블의 service_type 체크 제약조건 수정
-- 'room'과 'car' 추가

-- 기존 제약조건 확인
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname LIKE '%quote_item%service_type%';

-- 기존 제약조건 삭제
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'quote_item_service_type_check'
    ) THEN
        ALTER TABLE public.quote_item DROP CONSTRAINT quote_item_service_type_check;
        RAISE NOTICE 'quote_item_service_type_check 제약 조건이 삭제되었습니다.';
    ELSE
        RAISE NOTICE 'quote_item_service_type_check 제약 조건이 존재하지 않습니다.';
    END IF;
END $$;

-- 새로운 제약조건 추가 (room, car 포함)
ALTER TABLE public.quote_item 
ADD CONSTRAINT quote_item_service_type_check 
CHECK (service_type IN ('cruise', 'airport', 'hotel', 'tour', 'rentcar', 'room', 'car'));

-- 확인
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'quote_item_service_type_check';

-- 성공 메시지
SELECT '✅ quote_item 테이블에 room, car service_type이 추가되었습니다.' as result;
