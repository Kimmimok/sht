-- quote_item 테이블에 사용일자 컬럼 추가
-- 2025-08-05: 각 서비스의 사용일자를 저장하기 위한 컬럼 추가

-- 1. quote_item 테이블에 usage_date 컬럼 추가
ALTER TABLE quote_item 
ADD COLUMN usage_date DATE;

-- 2. 컬럼에 대한 코멘트 추가
COMMENT ON COLUMN quote_item.usage_date IS '서비스 사용일자 (객실: 체크인일, 차량: 픽업일, 공항: 출발일 등)';

-- 3. 기존 데이터에 대한 기본값 설정 (필요시)
-- UPDATE quote_item SET usage_date = CURRENT_DATE WHERE usage_date IS NULL;

-- 4. 인덱스 추가 (검색 성능 향상)
CREATE INDEX idx_quote_item_usage_date ON quote_item(usage_date);
CREATE INDEX idx_quote_item_quote_usage ON quote_item(quote_id, usage_date);

-- 5. 확인 쿼리
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quote_item' 
    AND column_name = 'usage_date';
