-- 사용자 권한 복구 SQL
-- 매니저와 멤버 권한이 게스트로 잘못 변경된 것을 수정

-- 1. 현재 users 테이블 상태 확인
SELECT id, email, role, created_at 
FROM users 
ORDER BY created_at;

-- 2. 관리자 계정 복구 (이메일 기준으로 admin 권한 부여)
-- 실제 관리자 이메일로 변경해주세요
UPDATE users 
SET role = 'admin' 
WHERE email LIKE '%admin%' 
   OR email IN ('admin@example.com', 'your-admin-email@domain.com');

-- 3. 매니저 계정 복구 (이메일 기준으로 manager 권한 부여)
-- 실제 매니저 이메일로 변경해주세요
UPDATE users 
SET role = 'manager' 
WHERE email LIKE '%manager%' 
   OR email IN ('manager@example.com', 'your-manager-email@domain.com');

-- 4. 예약이 있는 사용자는 member로 변경
UPDATE users 
SET role = 'member' 
WHERE id IN (
    SELECT DISTINCT re_user_id 
    FROM reservation 
    WHERE re_user_id IS NOT NULL
) 
AND role != 'admin' 
AND role != 'manager';

-- 5. 견적만 있고 예약이 없는 사용자는 guest로 유지
-- (별도 처리 불필요 - 이미 guest 상태)

-- 6. 수정 후 상태 확인
SELECT 
    role,
    COUNT(*) as count,
    STRING_AGG(email, ', ') as emails
FROM users 
GROUP BY role 
ORDER BY 
    CASE role 
        WHEN 'admin' THEN 1 
        WHEN 'manager' THEN 2 
        WHEN 'member' THEN 3 
        WHEN 'guest' THEN 4 
        ELSE 5 
    END;

-- 7. 예약 권한 정책 확인 (예약은 member만 가능)
-- RLS 정책이 올바른지 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'reservation';
