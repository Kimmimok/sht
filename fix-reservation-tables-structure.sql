-- 예약 상세 테이블 구조 표준화 (Supabase SQL Editor 실행용)
-- 모든 reservation_* 테이블에 id(UUID) PK 추가, 1:N 관계 허용

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- reservation_airport 테이블 수정
DO $$
BEGIN
    -- id 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservation_airport' AND column_name = 'id') THEN
        ALTER TABLE reservation_airport ADD COLUMN id UUID DEFAULT gen_random_uuid();
    END IF;
    
    -- id 컬럼을 NOT NULL로 설정
    UPDATE reservation_airport SET id = gen_random_uuid() WHERE id IS NULL;
    ALTER TABLE reservation_airport ALTER COLUMN id SET NOT NULL;
    
    -- 기존 PK 제거 (constraint 이름 동적 조회)
    DECLARE 
        pk_name TEXT;
    BEGIN
        SELECT constraint_name INTO pk_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'reservation_airport' AND constraint_type = 'PRIMARY KEY';
        
        IF pk_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE reservation_airport DROP CONSTRAINT ' || pk_name;
        END IF;
    END;
    
    -- id로 새 PK 설정
    ALTER TABLE reservation_airport ADD CONSTRAINT reservation_airport_pkey PRIMARY KEY (id);
    
    -- reservation_id UNIQUE 제약 제거 (1:N 허용)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'reservation_airport' AND constraint_name LIKE '%reservation_id%' AND constraint_type = 'UNIQUE') THEN
        ALTER TABLE reservation_airport DROP CONSTRAINT IF EXISTS reservation_airport_reservation_id_key;
        ALTER TABLE reservation_airport DROP CONSTRAINT IF EXISTS reservation_airport_reservation_id_unique;
    END IF;
    
    -- FK 재설정 (ON DELETE CASCADE)
    ALTER TABLE reservation_airport DROP CONSTRAINT IF EXISTS reservation_airport_reservation_id_fkey;
    ALTER TABLE reservation_airport ADD CONSTRAINT reservation_airport_reservation_id_fkey 
        FOREIGN KEY (reservation_id) REFERENCES reservation(re_id) ON DELETE CASCADE;
    
    -- 인덱스 추가
    CREATE INDEX IF NOT EXISTS reservation_airport_reservation_id_idx ON reservation_airport(reservation_id);
    
    -- created_at 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservation_airport' AND column_name = 'created_at') THEN
        ALTER TABLE reservation_airport ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- reservation_cruise 테이블 수정
DO $$
BEGIN
    -- id 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservation_cruise' AND column_name = 'id') THEN
        ALTER TABLE reservation_cruise ADD COLUMN id UUID DEFAULT gen_random_uuid();
    END IF;
    
    -- id 컬럼을 NOT NULL로 설정
    UPDATE reservation_cruise SET id = gen_random_uuid() WHERE id IS NULL;
    ALTER TABLE reservation_cruise ALTER COLUMN id SET NOT NULL;
    
    -- 기존 PK 제거 (constraint 이름 동적 조회)
    DECLARE 
        pk_name TEXT;
    BEGIN
        SELECT constraint_name INTO pk_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'reservation_cruise' AND constraint_type = 'PRIMARY KEY';
        
        IF pk_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE reservation_cruise DROP CONSTRAINT ' || pk_name;
        END IF;
    END;
    
    -- id로 새 PK 설정
    ALTER TABLE reservation_cruise ADD CONSTRAINT reservation_cruise_pkey PRIMARY KEY (id);
    
    -- reservation_id UNIQUE 제약 제거 (1:N 허용)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'reservation_cruise' AND constraint_name LIKE '%reservation_id%' AND constraint_type = 'UNIQUE') THEN
        ALTER TABLE reservation_cruise DROP CONSTRAINT IF EXISTS reservation_cruise_reservation_id_key;
        ALTER TABLE reservation_cruise DROP CONSTRAINT IF EXISTS reservation_cruise_reservation_id_unique;
    END IF;
    
    -- FK 재설정 (ON DELETE CASCADE)
    ALTER TABLE reservation_cruise DROP CONSTRAINT IF EXISTS reservation_cruise_reservation_id_fkey;
    ALTER TABLE reservation_cruise ADD CONSTRAINT reservation_cruise_reservation_id_fkey 
        FOREIGN KEY (reservation_id) REFERENCES reservation(re_id) ON DELETE CASCADE;
    
    -- 인덱스 추가
    CREATE INDEX IF NOT EXISTS reservation_cruise_reservation_id_idx ON reservation_cruise(reservation_id);
    
    -- created_at 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservation_cruise' AND column_name = 'created_at') THEN
        ALTER TABLE reservation_cruise ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- reservation_hotel 테이블 수정
DO $$
BEGIN
    -- id 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservation_hotel' AND column_name = 'id') THEN
        ALTER TABLE reservation_hotel ADD COLUMN id UUID DEFAULT gen_random_uuid();
    END IF;
    
    -- id 컬럼을 NOT NULL로 설정
    UPDATE reservation_hotel SET id = gen_random_uuid() WHERE id IS NULL;
    ALTER TABLE reservation_hotel ALTER COLUMN id SET NOT NULL;
    
    -- 기존 PK 제거 (constraint 이름 동적 조회)
    DECLARE 
        pk_name TEXT;
    BEGIN
        SELECT constraint_name INTO pk_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'reservation_hotel' AND constraint_type = 'PRIMARY KEY';
        
        IF pk_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE reservation_hotel DROP CONSTRAINT ' || pk_name;
        END IF;
    END;
    
    -- id로 새 PK 설정
    ALTER TABLE reservation_hotel ADD CONSTRAINT reservation_hotel_pkey PRIMARY KEY (id);
    
    -- reservation_id UNIQUE 제약 제거 (1:N 허용)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'reservation_hotel' AND constraint_name LIKE '%reservation_id%' AND constraint_type = 'UNIQUE') THEN
        ALTER TABLE reservation_hotel DROP CONSTRAINT IF EXISTS reservation_hotel_reservation_id_key;
        ALTER TABLE reservation_hotel DROP CONSTRAINT IF EXISTS reservation_hotel_reservation_id_unique;
    END IF;
    
    -- FK 재설정 (ON DELETE CASCADE)
    ALTER TABLE reservation_hotel DROP CONSTRAINT IF EXISTS reservation_hotel_reservation_id_fkey;
    ALTER TABLE reservation_hotel ADD CONSTRAINT reservation_hotel_reservation_id_fkey 
        FOREIGN KEY (reservation_id) REFERENCES reservation(re_id) ON DELETE CASCADE;
    
    -- 인덱스 추가
    CREATE INDEX IF NOT EXISTS reservation_hotel_reservation_id_idx ON reservation_hotel(reservation_id);
    
    -- created_at 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservation_hotel' AND column_name = 'created_at') THEN
        ALTER TABLE reservation_hotel ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- reservation_rentcar 테이블 수정
DO $$
BEGIN
    -- id 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservation_rentcar' AND column_name = 'id') THEN
        ALTER TABLE reservation_rentcar ADD COLUMN id UUID DEFAULT gen_random_uuid();
    END IF;
    
    -- id 컬럼을 NOT NULL로 설정
    UPDATE reservation_rentcar SET id = gen_random_uuid() WHERE id IS NULL;
    ALTER TABLE reservation_rentcar ALTER COLUMN id SET NOT NULL;
    
    -- 기존 PK 제거 (constraint 이름 동적 조회)
    DECLARE 
        pk_name TEXT;
    BEGIN
        SELECT constraint_name INTO pk_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'reservation_rentcar' AND constraint_type = 'PRIMARY KEY';
        
        IF pk_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE reservation_rentcar DROP CONSTRAINT ' || pk_name;
        END IF;
    END;
    
    -- id로 새 PK 설정
    ALTER TABLE reservation_rentcar ADD CONSTRAINT reservation_rentcar_pkey PRIMARY KEY (id);
    
    -- reservation_id UNIQUE 제약 제거 (1:N 허용)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'reservation_rentcar' AND constraint_name LIKE '%reservation_id%' AND constraint_type = 'UNIQUE') THEN
        ALTER TABLE reservation_rentcar DROP CONSTRAINT IF EXISTS reservation_rentcar_reservation_id_key;
        ALTER TABLE reservation_rentcar DROP CONSTRAINT IF EXISTS reservation_rentcar_reservation_id_unique;
    END IF;
    
    -- FK 재설정 (ON DELETE CASCADE)
    ALTER TABLE reservation_rentcar DROP CONSTRAINT IF EXISTS reservation_rentcar_reservation_id_fkey;
    ALTER TABLE reservation_rentcar ADD CONSTRAINT reservation_rentcar_reservation_id_fkey 
        FOREIGN KEY (reservation_id) REFERENCES reservation(re_id) ON DELETE CASCADE;
    
    -- 인덱스 추가
    CREATE INDEX IF NOT EXISTS reservation_rentcar_reservation_id_idx ON reservation_rentcar(reservation_id);
    
    -- created_at 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservation_rentcar' AND column_name = 'created_at') THEN
        ALTER TABLE reservation_rentcar ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- reservation_tour 테이블 수정
DO $$
BEGIN
    -- id 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservation_tour' AND column_name = 'id') THEN
        ALTER TABLE reservation_tour ADD COLUMN id UUID DEFAULT gen_random_uuid();
    END IF;
    
    -- id 컬럼을 NOT NULL로 설정
    UPDATE reservation_tour SET id = gen_random_uuid() WHERE id IS NULL;
    ALTER TABLE reservation_tour ALTER COLUMN id SET NOT NULL;
    
    -- 기존 PK 제거 (constraint 이름 동적 조회)
    DECLARE 
        pk_name TEXT;
    BEGIN
        SELECT constraint_name INTO pk_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'reservation_tour' AND constraint_type = 'PRIMARY KEY';
        
        IF pk_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE reservation_tour DROP CONSTRAINT ' || pk_name;
        END IF;
    END;
    
    -- id로 새 PK 설정
    ALTER TABLE reservation_tour ADD CONSTRAINT reservation_tour_pkey PRIMARY KEY (id);
    
    -- reservation_id UNIQUE 제약 제거 (1:N 허용)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'reservation_tour' AND constraint_name LIKE '%reservation_id%' AND constraint_type = 'UNIQUE') THEN
        ALTER TABLE reservation_tour DROP CONSTRAINT IF EXISTS reservation_tour_reservation_id_key;
        ALTER TABLE reservation_tour DROP CONSTRAINT IF EXISTS reservation_tour_reservation_id_unique;
    END IF;
    
    -- FK 재설정 (ON DELETE CASCADE)
    ALTER TABLE reservation_tour DROP CONSTRAINT IF EXISTS reservation_tour_reservation_id_fkey;
    ALTER TABLE reservation_tour ADD CONSTRAINT reservation_tour_reservation_id_fkey 
        FOREIGN KEY (reservation_id) REFERENCES reservation(re_id) ON DELETE CASCADE;
    
    -- 인덱스 추가
    CREATE INDEX IF NOT EXISTS reservation_tour_reservation_id_idx ON reservation_tour(reservation_id);
    
    -- created_at 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservation_tour' AND column_name = 'created_at') THEN
        ALTER TABLE reservation_tour ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- reservation_car_sht 테이블 수정
DO $$
BEGIN
    -- id 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservation_car_sht' AND column_name = 'id') THEN
        ALTER TABLE reservation_car_sht ADD COLUMN id UUID DEFAULT gen_random_uuid();
    END IF;
    
    -- id 컬럼을 NOT NULL로 설정
    UPDATE reservation_car_sht SET id = gen_random_uuid() WHERE id IS NULL;
    ALTER TABLE reservation_car_sht ALTER COLUMN id SET NOT NULL;
    
    -- 기존 PK 제거 (constraint 이름 동적 조회)
    DECLARE 
        pk_name TEXT;
    BEGIN
        SELECT constraint_name INTO pk_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'reservation_car_sht' AND constraint_type = 'PRIMARY KEY';
        
        IF pk_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE reservation_car_sht DROP CONSTRAINT ' || pk_name;
        END IF;
    END;
    
    -- id로 새 PK 설정
    ALTER TABLE reservation_car_sht ADD CONSTRAINT reservation_car_sht_pkey PRIMARY KEY (id);
    
    -- reservation_id UNIQUE 제약 제거 (1:N 허용)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'reservation_car_sht' AND constraint_name LIKE '%reservation_id%' AND constraint_type = 'UNIQUE') THEN
        ALTER TABLE reservation_car_sht DROP CONSTRAINT IF EXISTS reservation_car_sht_reservation_id_key;
        ALTER TABLE reservation_car_sht DROP CONSTRAINT IF EXISTS reservation_car_sht_reservation_id_unique;
    END IF;
    
    -- FK 재설정 (ON DELETE CASCADE)
    ALTER TABLE reservation_car_sht DROP CONSTRAINT IF EXISTS reservation_car_sht_reservation_id_fkey;
    ALTER TABLE reservation_car_sht ADD CONSTRAINT reservation_car_sht_reservation_id_fkey 
        FOREIGN KEY (reservation_id) REFERENCES reservation(re_id) ON DELETE CASCADE;
    
    -- 인덱스 추가
    CREATE INDEX IF NOT EXISTS reservation_car_sht_reservation_id_idx ON reservation_car_sht(reservation_id);
    
    -- created_at 컬럼 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservation_car_sht' AND column_name = 'created_at') THEN
        ALTER TABLE reservation_car_sht ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- 완료 메시지
SELECT 'All reservation tables have been migrated successfully!' as message;
