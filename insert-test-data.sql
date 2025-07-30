-- 견적 시스템 테스트 데이터 삽입 스크립트
-- 실제 데이터베이스에 연결하여 매니저 시스템이 동작하도록 함

-- 1. 먼저 users 테이블에 테스트 사용자 삽입
INSERT INTO users (id, email, role, name, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'customer1@test.com', 'member', '김고객', NOW()),
  ('22222222-2222-2222-2222-222222222222', 'customer2@test.com', 'member', '이여행', NOW()),
  ('33333333-3333-3333-3333-333333333333', 'customer3@test.com', 'member', '박크루즈', NOW())
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  name = EXCLUDED.name;

-- 2. quote 테이블에 테스트 견적 데이터 삽입
INSERT INTO quote (id, user_id, status, title, description, total_price, created_at, updated_at) VALUES
  ('q0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'pending', '하롱베이 2박3일 크루즈', '가족 여행 견적 요청', 450000, NOW() - INTERVAL '2 days', NOW()),
  ('q0000002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'approved', '하노이 + 하롱베이 4박5일', '허니문 여행 패키지', 850000, NOW() - INTERVAL '1 day', NOW()),
  ('q0000003-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'submitted', '럭셔리 크루즈 3박4일', '프리미엄 크루즈 여행', 1200000, NOW() - INTERVAL '3 hours', NOW()),
  ('q0000004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'confirmed', '하롱베이 당일 투어', '당일치기 여행', 180000, NOW() - INTERVAL '5 days', NOW()),
  ('q0000005-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'completed', '베트남 일주 7박8일', '전국 투어 패키지', 1800000, NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (id) DO UPDATE SET 
  status = EXCLUDED.status,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  total_price = EXCLUDED.total_price,
  updated_at = NOW();

-- 3. 크루즈 정보 테이블이 있다면 기본 데이터 삽입
INSERT INTO cruise_info (code, name, description, created_at) VALUES
  ('CR001', '프리미엄 하롱베이 크루즈', '2박3일 럭셔리 크루즈', NOW()),
  ('CR002', '스탠다드 하롱베이 크루즈', '1박2일 기본 크루즈', NOW()),
  ('CR003', '패밀리 하롱베이 크루즈', '가족형 크루즈 여행', NOW())
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 4. 스케줄 정보 테이블 기본 데이터
INSERT INTO schedule_info (code, name, duration, created_at) VALUES
  ('SC001', '2박3일 일정', '3일', NOW()),
  ('SC002', '1박2일 일정', '2일', NOW()),
  ('SC003', '4박5일 일정', '5일', NOW())
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  duration = EXCLUDED.duration;

-- 5. 객실 정보 테이블 기본 데이터
INSERT INTO room_info (code, name, capacity, description, created_at) VALUES
  ('R001', '스탠다드 룸', 2, '기본 객실', NOW()),
  ('R002', '디럭스 룸', 2, '업그레이드 객실', NOW()),
  ('R003', '스위트 룸', 4, '프리미엄 객실', NOW())
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  capacity = EXCLUDED.capacity,
  description = EXCLUDED.description;

-- 6. 차량 정보 테이블 기본 데이터
INSERT INTO car_info (code, name, type, description, created_at) VALUES
  ('C001', '세단', 'sedan', '4인승 세단', NOW()),
  ('C002', 'SUV', 'suv', '7인승 SUV', NOW()),
  ('C003', '미니버스', 'minibus', '12인승 미니버스', NOW())
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description;

-- 7. 결제 정보 테이블 기본 데이터
INSERT INTO payment_info (code, name, description, created_at) VALUES
  ('P001', '현금 결제', '현금으로 결제', NOW()),
  ('P002', '카드 결제', '신용카드 결제', NOW()),
  ('P003', '계좌 이체', '무통장 입금', NOW())
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 8. 가격 코드 테이블에 기본 데이터 (room_price_code)
INSERT INTO room_price_code (id, room_code, category, price, start_date, end_date, created_at) VALUES
  (gen_random_uuid(), 'R001', 'adult', 200000, '2025-01-01', '2025-03-31', NOW()),
  (gen_random_uuid(), 'R002', 'adult', 300000, '2025-01-01', '2025-03-31', NOW()),
  (gen_random_uuid(), 'R003', 'adult', 500000, '2025-01-01', '2025-03-31', NOW())
ON CONFLICT (id) DO NOTHING;

-- 9. 차량 가격 코드 테이블에 기본 데이터 (car_price_code)
INSERT INTO car_price_code (id, car_code, price, start_date, end_date, created_at) VALUES
  (gen_random_uuid(), 'C001', 50000, '2025-01-01', '2025-03-31', NOW()),
  (gen_random_uuid(), 'C002', 80000, '2025-01-01', '2025-03-31', NOW()),
  (gen_random_uuid(), 'C003', 120000, '2025-01-01', '2025-03-31', NOW())
ON CONFLICT (id) DO NOTHING;

-- 성공 메시지
SELECT 'Test data inserted successfully' as message;
