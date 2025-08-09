-- 테스트용 매니저 결제 데이터 생성
-- 먼저 기존 사용자와 예약 ID를 확인
SELECT 
    u.id as user_id, 
    u.name, 
    r.re_id as reservation_id,
    r.re_type,
    r.re_quote_id
FROM users u
LEFT JOIN reservation r ON r.re_user_id = u.id
WHERE u.role = 'member'
LIMIT 5;
