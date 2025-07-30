-- quote_item 테이블의 service_type 제약조건 업데이트
-- 'room'과 'car' 타입을 추가로 허용

-- 기존 제약조건 확인
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%service_type%' 
AND constraint_schema = 'public';

-- 기존 제약조건 삭제 (있다면)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%service_type%' 
        AND constraint_schema = 'public'
    ) THEN
        -- 실제 제약조건 이름을 찾아서 삭제
        EXECUTE (
            SELECT 'ALTER TABLE quote_item DROP CONSTRAINT ' || constraint_name
            FROM information_schema.check_constraints 
            WHERE constraint_name LIKE '%service_type%' 
            AND constraint_schema = 'public'
            LIMIT 1
        );
        RAISE NOTICE '기존 service_type 제약조건이 삭제되었습니다.';
    END IF;
END $$;

-- 새로운 제약조건 추가 (기존 + room, car 추가)
ALTER TABLE quote_item 
ADD CONSTRAINT quote_item_service_type_check 
CHECK (service_type IN ('airport', 'hotel', 'rentcar', 'tour', 'cruise', 'room', 'car'));

-- 제약조건 확인
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'quote_item_service_type_check';

-- 완료 메시지
SELECT 'quote_item.service_type 제약조건이 업데이트되었습니다. room과 car 타입이 추가되었습니다.' as result;
