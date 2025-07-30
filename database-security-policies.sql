-- RLS(Row Level Security) 정책 설정
-- 크루즈 예약 시스템 보안 정책

-- 1. 기존 RLS 정책 확인 및 수정

-- quote 테이블 RLS 정책
ALTER TABLE quote ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 견적만 조회/수정 가능
CREATE POLICY quote_user_policy ON quote
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 관리자는 모든 견적 조회 가능
CREATE POLICY quote_admin_policy ON quote
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- quote_room 테이블 RLS 정책
ALTER TABLE quote_room ENABLE ROW LEVEL SECURITY;

CREATE POLICY quote_room_user_policy ON quote_room
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM quote 
      WHERE quote.id = quote_room.quote_id 
      AND quote.user_id = auth.uid()
    )
  );

CREATE POLICY quote_room_admin_policy ON quote_room
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- quote_car 테이블 RLS 정책
ALTER TABLE quote_car ENABLE ROW LEVEL SECURITY;

CREATE POLICY quote_car_user_policy ON quote_car
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM quote 
      WHERE quote.id = quote_car.quote_id 
      AND quote.user_id = auth.uid()
    )
  );

CREATE POLICY quote_car_admin_policy ON quote_car
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- quote_room_detail 테이블 RLS 정책
ALTER TABLE quote_room_detail ENABLE ROW LEVEL SECURITY;

CREATE POLICY quote_room_detail_user_policy ON quote_room_detail
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM quote 
      WHERE quote.id = quote_room_detail.quote_id 
      AND quote.user_id = auth.uid()
    )
  );

CREATE POLICY quote_room_detail_admin_policy ON quote_room_detail
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- quote_price_summary 테이블 RLS 정책
ALTER TABLE quote_price_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY quote_price_summary_user_policy ON quote_price_summary
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM quote 
      WHERE quote.id = quote_price_summary.quote_id 
      AND quote.user_id = auth.uid()
    )
  );

CREATE POLICY quote_price_summary_admin_policy ON quote_price_summary
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- users 테이블 RLS 정책
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 정보만 조회/수정
CREATE POLICY users_self_policy ON users
  FOR ALL 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 관리자는 모든 사용자 조회 가능 (수정은 제외)
CREATE POLICY users_admin_select_policy ON users
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
    )
  );

-- 가격 테이블들은 모든 인증된 사용자가 읽기 가능
ALTER TABLE room_price ENABLE ROW LEVEL SECURITY;
CREATE POLICY room_price_read_policy ON room_price
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

ALTER TABLE car_price ENABLE ROW LEVEL SECURITY;
CREATE POLICY car_price_read_policy ON car_price
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- 마스터 테이블들은 모든 사용자 읽기 가능 (인증 불필요)
ALTER TABLE room_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE car_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE cruise_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE category_info DISABLE ROW LEVEL SECURITY;
