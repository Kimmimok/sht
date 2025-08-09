-- reservation_payment 테이블 데이터 확인
SELECT 
    id,
    reservation_id,
    user_id,
    amount,
    payment_status,
    payment_method,
    created_at,
    memo
FROM reservation_payment 
ORDER BY created_at DESC 
LIMIT 10;
