-- Ensure payment_info exists (FK target)
CREATE TABLE IF NOT EXISTS payment_info (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO payment_info (code, name) VALUES
  ('CARD', '카드결제'),
  ('CASH', '현금결제'),
  ('BANK', '계좌이체')
ON CONFLICT (code) DO NOTHING;

-- Reservation Payments table for manager payments page
-- Creates a simple payment ledger linked to reservation and users

CREATE TABLE IF NOT EXISTS reservation_payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservation(re_id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  amount numeric(12,0) NOT NULL,
  payment_method text REFERENCES payment_info(code) ON DELETE SET NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_payment_reservation_id ON reservation_payment(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_payment_user_id ON reservation_payment(user_id);
CREATE INDEX IF NOT EXISTS idx_reservation_payment_status ON reservation_payment(payment_status);

-- RLS: for now leave disabled; adjust policies in database-security-policies.sql if needed
ALTER TABLE reservation_payment DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE reservation_payment IS '결제 기록 (예약 기준). 매니저/관리자용 관리 화면에서 사용';
COMMENT ON COLUMN reservation_payment.reservation_id IS 'reservation.re_id 참조';
COMMENT ON COLUMN reservation_payment.user_id IS 'users.id 참조 (결제자, 일반적으로 예약자)';
COMMENT ON COLUMN reservation_payment.payment_method IS 'payment_info.code 참조';
COMMENT ON COLUMN reservation_payment.payment_status IS 'pending|completed|failed 등 텍스트 상태';
