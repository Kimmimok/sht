-- 실제 관리자 계정 설정용 스크립트
-- 이 스크립트는 실제 Supabase Auth에서 로그인한 사용자 ID를 관리자로 설정합니다.

-- 현재 로그인한 사용자를 관리자로 설정
-- (이 스크립트는 관리자 계정으로 로그인한 상태에서 실행해야 함)

-- 방법 1: 특정 이메일을 가진 사용자를 관리자로 설정
UPDATE users 
SET role = 'admin', name = '시스템 관리자'
WHERE email = 'admin@cruise.com' OR email = 'admin@example.com';

-- 방법 2: 현재 로그인한 사용자를 관리자로 설정 (실행 시점에 로그인한 사용자)
INSERT INTO users (id, email, name, role) 
VALUES (auth.uid(), auth.email(), '시스템 관리자', 'admin')
ON CONFLICT (id) 
DO UPDATE SET role = 'admin', name = '시스템 관리자';

-- 방법 3: 직접 UUID 지정 (실제 Auth UID를 알고 있는 경우)
-- 예시: INSERT INTO users (id, email, name, role) VALUES 
-- ('실제-Auth-UUID-여기에-입력', 'admin@cruise.com', '시스템 관리자', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 현재 사용자 정보 확인
SELECT 
    id,
    email,
    name,
    role,
    created_at
FROM users 
ORDER BY created_at DESC;

-- Auth 정보와 Users 테이블 매칭 확인
SELECT 
    auth.uid() as auth_id,
    auth.email() as auth_email,
    u.id as users_id,
    u.email as users_email,
    u.role
FROM users u
WHERE u.id = auth.uid();
