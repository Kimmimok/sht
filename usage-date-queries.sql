-- 견적 아이템의 사용일자 활용 예제 쿼리들

-- 1. 특정 견적의 모든 서비스와 사용일자 조회
SELECT 
    qi.service_type,
    qi.usage_date,
    qi.quantity,
    qi.unit_price,
    qi.total_price,
    CASE 
        WHEN qi.service_type = 'room' THEN 'room'
        WHEN qi.service_type = 'car' THEN 'car'  
        WHEN qi.service_type = 'cruise' THEN 'cruise'
        WHEN qi.service_type = 'airport' THEN 'airport'
        WHEN qi.service_type = 'hotel' THEN 'hotel'
        WHEN qi.service_type = 'tour' THEN 'tour'
        WHEN qi.service_type = 'rentcar' THEN 'rentcar'
    END as service_category
FROM quote_item qi
WHERE qi.quote_id = :quote_id
ORDER BY qi.usage_date, qi.service_type;

-- 2. 특정 날짜 범위의 견적 아이템들 조회
SELECT 
    q.id as quote_id,
    q.title,
    qi.service_type,
    qi.usage_date,
    qi.total_price
FROM quote q
JOIN quote_item qi ON q.id = qi.quote_id
WHERE qi.usage_date BETWEEN :start_date AND :end_date
ORDER BY qi.usage_date, q.id;

-- 3. 서비스별 사용일자 통계
SELECT 
    qi.service_type,
    COUNT(*) as item_count,
    MIN(qi.usage_date) as earliest_date,
    MAX(qi.usage_date) as latest_date,
    SUM(qi.total_price) as total_amount
FROM quote_item qi
WHERE qi.usage_date IS NOT NULL
GROUP BY qi.service_type
ORDER BY qi.service_type;

-- 4. 월별 서비스 사용 현황
SELECT 
    TO_CHAR(qi.usage_date, 'YYYY-MM') as usage_month,
    qi.service_type,
    COUNT(*) as usage_count,
    SUM(qi.total_price) as monthly_revenue
FROM quote_item qi
WHERE qi.usage_date IS NOT NULL
GROUP BY TO_CHAR(qi.usage_date, 'YYYY-MM'), qi.service_type
ORDER BY usage_month DESC, qi.service_type;

-- 5. 사용일자가 누락된 견적 아이템 찾기
SELECT 
    qi.id,
    qi.quote_id,
    qi.service_type,
    qi.service_ref_id,
    qi.created_at
FROM quote_item qi
WHERE qi.usage_date IS NULL
ORDER BY qi.created_at DESC;
