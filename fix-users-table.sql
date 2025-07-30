-- Users 테이블 재생성으로 관리자 역할 문제 해결
-- 1. 기존 users 테이블 백업 및 삭제
-- 2. 새로운 users 테이블 생성 (올바른 기본값과 제약조건 포함)
-- 3. 관리자 계정 생성

-- 기존 테이블이 있다면 삭제 (CASCADE로 관련 외래키도 처리)
DROP TABLE IF EXISTS users CASCADE;

-- Users 테이블 재생성
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 관리자 계정 생성 (실제 Auth UID로 교체 필요)
-- 주의: 실제 Supabase Auth에서 생성된 UUID를 사용해야 함
INSERT INTO users (id, email, name, role) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'admin@example.com', '시스템 관리자', 'admin'),
    ('00000000-0000-0000-0000-000000000002', 'manager@example.com', '매니저', 'manager');

-- RLS (Row Level Security) 정책 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 정보만 조회 가능
CREATE POLICY "사용자는 자신의 정보만 조회 가능" ON users
    FOR SELECT USING (auth.uid() = id);

-- 관리자는 모든 사용자 정보 조회 가능
CREATE POLICY "관리자는 모든 사용자 조회 가능" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 사용자는 자신의 정보만 수정 가능
CREATE POLICY "사용자는 자신의 정보만 수정 가능" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 관리자는 모든 사용자 정보 수정 가능
CREATE POLICY "관리자는 모든 사용자 수정 가능" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 새 사용자 자동 생성 (회원가입 시)
CREATE POLICY "회원가입 시 사용자 생성 허용" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 설정
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- 권한 부여
GRANT ALL ON users TO authenticated;
GRANT SELECT ON users TO anon;

COMMENT ON TABLE users IS '사용자 정보 테이블 - 관리자/매니저/일반사용자 구분';
COMMENT ON COLUMN users.role IS '사용자 역할: admin(관리자), manager(매니저), user(일반사용자)';
