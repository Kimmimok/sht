-- 견적 삭제 시 연결된 모든 데이터가 자동으로 삭제되도록 CASCADE DELETE 외래키 제약 조건 설정

-- 1. 기존 외래키 제약 조건 확인
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name,
  rc.delete_rule
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE 
  tc.constraint_type = 'FOREIGN KEY' 
  AND (ccu.table_name = 'quote' OR tc.table_name IN ('quote_item', 'reservation', 'reservation_cruise'))
ORDER BY tc.table_name, kcu.column_name;

-- 2. quote_item 테이블의 quote_id 외래키에 CASCADE DELETE 설정
-- 기존 제약 조건이 있다면 먼저 삭제하고 새로 생성

-- quote_item.quote_id -> quote.id CASCADE DELETE
DO $$
BEGIN
    -- 기존 외래키 제약 조건 삭제 (있는 경우)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%quote_item%quote%' 
        AND table_name = 'quote_item'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        EXECUTE 'ALTER TABLE quote_item DROP CONSTRAINT ' || (
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%quote_item%quote%' 
            AND table_name = 'quote_item'
            AND constraint_type = 'FOREIGN KEY'
            LIMIT 1
        );
    END IF;
    
    -- 새로운 CASCADE DELETE 외래키 제약 조건 생성
    ALTER TABLE quote_item 
    ADD CONSTRAINT fk_quote_item_quote_id 
    FOREIGN KEY (quote_id) 
    REFERENCES quote(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE 'quote_item.quote_id CASCADE DELETE 제약 조건이 설정되었습니다.';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'quote_item 외래키 설정 중 오류: %', SQLERRM;
END$$;

-- 3. reservation 테이블의 re_quote_id 외래키에 CASCADE DELETE 설정
DO $$
BEGIN
    -- 기존 외래키 제약 조건 삭제 (있는 경우)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%reservation%quote%' 
        AND table_name = 'reservation'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        EXECUTE 'ALTER TABLE reservation DROP CONSTRAINT ' || (
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%reservation%quote%' 
            AND table_name = 'reservation'
            AND constraint_type = 'FOREIGN KEY'
            LIMIT 1
        );
    END IF;
    
    -- 새로운 CASCADE DELETE 외래키 제약 조건 생성
    ALTER TABLE reservation 
    ADD CONSTRAINT fk_reservation_quote_id 
    FOREIGN KEY (re_quote_id) 
    REFERENCES quote(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE 'reservation.re_quote_id CASCADE DELETE 제약 조건이 설정되었습니다.';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'reservation 외래키 설정 중 오류: %', SQLERRM;
END$$;

-- 4. reservation_cruise 테이블의 reservation_id 외래키에 CASCADE DELETE 설정
-- (reservation이 삭제되면 reservation_cruise도 함께 삭제)
DO $$
BEGIN
    -- 기존 외래키 제약 조건 삭제 (있는 경우)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%reservation_cruise%reservation%' 
        AND table_name = 'reservation_cruise'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        EXECUTE 'ALTER TABLE reservation_cruise DROP CONSTRAINT ' || (
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%reservation_cruise%reservation%' 
            AND table_name = 'reservation_cruise'
            AND constraint_type = 'FOREIGN KEY'
            LIMIT 1
        );
    END IF;
    
    -- 새로운 CASCADE DELETE 외래키 제약 조건 생성
    ALTER TABLE reservation_cruise 
    ADD CONSTRAINT fk_reservation_cruise_reservation_id 
    FOREIGN KEY (reservation_id) 
    REFERENCES reservation(re_id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE 'reservation_cruise.reservation_id CASCADE DELETE 제약 조건이 설정되었습니다.';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'reservation_cruise 외래키 설정 중 오류: %', SQLERRM;
END$$;

-- 5. 기타 연결 테이블들도 CASCADE DELETE 설정
-- reservation_room 테이블 (있는 경우)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservation_room') THEN
        -- 기존 외래키 제약 조건 삭제 (있는 경우)
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%reservation_room%reservation%' 
            AND table_name = 'reservation_room'
            AND constraint_type = 'FOREIGN KEY'
        ) THEN
            EXECUTE 'ALTER TABLE reservation_room DROP CONSTRAINT ' || (
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE constraint_name LIKE '%reservation_room%reservation%' 
                AND table_name = 'reservation_room'
                AND constraint_type = 'FOREIGN KEY'
                LIMIT 1
            );
        END IF;
        
        -- 새로운 CASCADE DELETE 외래키 제약 조건 생성
        ALTER TABLE reservation_room 
        ADD CONSTRAINT fk_reservation_room_reservation_id 
        FOREIGN KEY (reservation_id) 
        REFERENCES reservation(re_id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'reservation_room.reservation_id CASCADE DELETE 제약 조건이 설정되었습니다.';
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'reservation_room 외래키 설정 중 오류: %', SQLERRM;
END$$;

-- reservation_car 테이블 (있는 경우)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservation_car') THEN
        -- 기존 외래키 제약 조건 삭제 (있는 경우)
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%reservation_car%reservation%' 
            AND table_name = 'reservation_car'
            AND constraint_type = 'FOREIGN KEY'
        ) THEN
            EXECUTE 'ALTER TABLE reservation_car DROP CONSTRAINT ' || (
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE constraint_name LIKE '%reservation_car%reservation%' 
                AND table_name = 'reservation_car'
                AND constraint_type = 'FOREIGN KEY'
                LIMIT 1
            );
        END IF;
        
        -- 새로운 CASCADE DELETE 외래키 제약 조건 생성
        ALTER TABLE reservation_car 
        ADD CONSTRAINT fk_reservation_car_reservation_id 
        FOREIGN KEY (reservation_id) 
        REFERENCES reservation(re_id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'reservation_car.reservation_id CASCADE DELETE 제약 조건이 설정되었습니다.';
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'reservation_car 외래키 설정 중 오류: %', SQLERRM;
END$$;

-- 6. 설정 완료 후 외래키 제약 조건 재확인
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name,
  rc.delete_rule
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE 
  tc.constraint_type = 'FOREIGN KEY' 
  AND (ccu.table_name = 'quote' OR tc.table_name IN ('quote_item', 'reservation', 'reservation_cruise', 'reservation_room', 'reservation_car'))
ORDER BY tc.table_name, kcu.column_name;

-- 7. 테스트용 삭제 함수 생성 (필요시 사용)
CREATE OR REPLACE FUNCTION delete_quote_with_cascade(quote_id_param INT)
RETURNS TEXT AS $$
DECLARE
    deleted_items INT := 0;
    deleted_reservations INT := 0;
    result_text TEXT;
BEGIN
    -- quote_item 삭제 개수 확인
    SELECT COUNT(*) INTO deleted_items FROM quote_item WHERE quote_id = quote_id_param;
    
    -- reservation 삭제 개수 확인
    SELECT COUNT(*) INTO deleted_reservations FROM reservation WHERE re_quote_id = quote_id_param;
    
    -- quote 삭제 (CASCADE로 관련 데이터 자동 삭제)
    DELETE FROM quote WHERE id = quote_id_param;
    
    -- 결과 반환
    result_text := FORMAT('견적 ID %s 삭제 완료. 연관 삭제: quote_item %s개, reservation %s개', 
                         quote_id_param, deleted_items, deleted_reservations);
    
    RETURN result_text;
EXCEPTION 
    WHEN OTHERS THEN
        RETURN FORMAT('견적 삭제 중 오류: %s', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 사용법 예시 (실제 실행하지 말 것):
-- SELECT delete_quote_with_cascade(1); -- 견적 ID 1을 CASCADE 삭제
