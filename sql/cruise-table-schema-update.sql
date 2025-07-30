-- cruise 테이블에 올드 페이지 호환성을 위한 컬럼 추가
-- 기존 cruise 테이블에 추가 필드들을 추가합니다

-- 올드 페이지에서 사용하는 추가 필드들 추가
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS schedule_code TEXT;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS cruise_code TEXT;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS payment_code TEXT;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS rooms_detail JSONB;
ALTER TABLE cruise ADD COLUMN IF NOT EXISTS vehicle_detail JSONB;

-- 기존 필드들에 대한 코멘트 추가
COMMENT ON COLUMN cruise.schedule_code IS '일정 코드 (올드 페이지 호환)';
COMMENT ON COLUMN cruise.cruise_code IS '크루즈 코드 (올드 페이지 호환)';
COMMENT ON COLUMN cruise.payment_code IS '결제 방식 코드 (올드 페이지 호환)';
COMMENT ON COLUMN cruise.discount_rate IS '할인율 (올드 페이지 호환)';
COMMENT ON COLUMN cruise.rooms_detail IS '상세 객실 정보 JSON (올드 페이지 호환)';
COMMENT ON COLUMN cruise.vehicle_detail IS '차량 정보 JSON (올드 페이지 호환)';

-- quote_room 테이블에 추가 필드들 추가
ALTER TABLE quote_room ADD COLUMN IF NOT EXISTS adult_count INTEGER DEFAULT 0;
ALTER TABLE quote_room ADD COLUMN IF NOT EXISTS child_count INTEGER DEFAULT 0;
ALTER TABLE quote_room ADD COLUMN IF NOT EXISTS infant_count INTEGER DEFAULT 0;
ALTER TABLE quote_room ADD COLUMN IF NOT EXISTS extra_adult_count INTEGER DEFAULT 0;
ALTER TABLE quote_room ADD COLUMN IF NOT EXISTS extra_child_count INTEGER DEFAULT 0;
ALTER TABLE quote_room ADD COLUMN IF NOT EXISTS additional_categories JSONB;

COMMENT ON COLUMN quote_room.adult_count IS '성인 수';
COMMENT ON COLUMN quote_room.child_count IS '아동 수';
COMMENT ON COLUMN quote_room.infant_count IS '유아 수';
COMMENT ON COLUMN quote_room.extra_adult_count IS '추가 성인 수';
COMMENT ON COLUMN quote_room.extra_child_count IS '추가 아동 수';
COMMENT ON COLUMN quote_room.additional_categories IS '추가 인원 구분 정보 JSON';
