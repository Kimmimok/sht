-- 서비스 테이블 접근 권한 설정 (존재하는 테이블만)
-- 이 스크립트는 supabase-auth-simple.sql 실행 후 선택적으로 실행하세요

-- 각 서비스 테이블에 대해 오류가 발생하면 해당 테이블이 존재하지 않는 것입니다.
-- 오류가 발생하는 부분은 주석 처리하거나 제거하세요.

-- cruise 테이블 (또는 cruise_info)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cruise') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to view cruise" ON cruise;
        CREATE POLICY "Allow authenticated users to view cruise"
          ON cruise FOR SELECT
          TO authenticated
          USING (true);
    END IF;
END $$;

-- hotel 테이블
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'hotel') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to view hotel" ON hotel;
        CREATE POLICY "Allow authenticated users to view hotel"
          ON hotel FOR SELECT
          TO authenticated
          USING (true);
    END IF;
END $$;

-- airport 테이블
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'airport') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to view airport" ON airport;
        CREATE POLICY "Allow authenticated users to view airport"
          ON airport FOR SELECT
          TO authenticated
          USING (true);
    END IF;
END $$;

-- tour 테이블
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tour') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to view tour" ON tour;
        CREATE POLICY "Allow authenticated users to view tour"
          ON tour FOR SELECT
          TO authenticated
          USING (true);
    END IF;
END $$;

-- rentcar 테이블
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rentcar') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to view rentcar" ON rentcar;
        CREATE POLICY "Allow authenticated users to view rentcar"
          ON rentcar FOR SELECT
          TO authenticated
          USING (true);
    END IF;
END $$;

-- room_price 테이블
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'room_price') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to view room_price" ON room_price;
        CREATE POLICY "Allow authenticated users to view room_price"
          ON room_price FOR SELECT
          TO authenticated
          USING (true);
    END IF;
END $$;

-- quote_room 테이블
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quote_room') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to view quote_room" ON quote_room;
        CREATE POLICY "Allow authenticated users to view quote_room"
          ON quote_room FOR SELECT
          TO authenticated
          USING (true);
    END IF;
END $$;

-- quote_car 테이블
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quote_car') THEN
        DROP POLICY IF EXISTS "Allow authenticated users to view quote_car" ON quote_car;
        CREATE POLICY "Allow authenticated users to view quote_car"
          ON quote_car FOR SELECT
          TO authenticated
          USING (true);
    END IF;
END $$;
