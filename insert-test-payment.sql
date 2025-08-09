-- 테스트용 매니저 결제 데이터 생성
INSERT INTO reservation_payment (
    reservation_id,
    user_id, 
    amount,
    payment_status,
    payment_method,
    memo,
    created_at
) VALUES (
    'res_001',  -- 임시 예약 ID
    'user_001', -- 임시 사용자 ID  
    150000,
    'pending',
    'card',
    '매니저가 생성한 테스트 결제',
    NOW()
);
