-- 스테이하롱 크루즈 데이터베이스 스키마 수정
-- Supabase SQL Editor에서 실행하세요

-- 1. users 테이블에 updated_at 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. reservation 테이블에 추가 컬럼들 추가
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS special_requests TEXT;

-- 3. users 테이블 updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. users 테이블에 트리거 적용
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. 기존 레코드 updated_at 설정
UPDATE users 
SET updated_at = COALESCE(created_at, NOW()) 
WHERE updated_at IS NULL;

-- 6. 컬럼 코멘트 추가
COMMENT ON COLUMN users.updated_at IS '사용자 정보 마지막 수정일시';
COMMENT ON COLUMN reservation.contact_name IS '예약자 연락처 이름';
COMMENT ON COLUMN reservation.contact_phone IS '예약자 연락처 전화번호';
COMMENT ON COLUMN reservation.contact_email IS '예약자 연락처 이메일';
COMMENT ON COLUMN reservation.emergency_contact IS '긴급 연락처';
COMMENT ON COLUMN reservation.special_requests IS '특별 요청사항';
