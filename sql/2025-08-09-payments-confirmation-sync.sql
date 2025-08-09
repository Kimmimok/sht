-- Payments & Confirmation sync migration
-- 날짜: 2025-08-09
-- 목적:
--  1) 견적 결제상태 동기화용 컬럼 추가 (quote.payment_status)
--  2) 확인서 발송 시점 기록 보강 (quote.confirmed_at)
--  3) 예약확인서 발송 로그 테이블(선택)

-- 1) quote.payment_status: 결제 플로우에서 'paid' 동기화를 위해 필수
ALTER TABLE public.quote
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

-- 허용 상태 체크(선택): pending | paid | refunded | cancelled
ALTER TABLE public.quote
  DROP CONSTRAINT IF EXISTS quote_payment_status_chk;
ALTER TABLE public.quote
  ADD CONSTRAINT quote_payment_status_chk
  CHECK (payment_status IN ('pending','paid','refunded','cancelled'));

-- 조회 최적화를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_quote_payment_status
  ON public.quote (payment_status);

-- 2) 확인서 발송 일시 기록(선택)
ALTER TABLE public.quote
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- 3) 예약ID로 결제 상태 조회 최적화(추천)
CREATE INDEX IF NOT EXISTS idx_reservation_re_quote_id
  ON public.reservation (re_quote_id);

-- 4) (선택) 예약확인서 발송 로그 테이블
--    발송 이력/메타데이터 저장. 필요 없으면 이 블록은 건너뛰어도 됩니다.
CREATE TABLE IF NOT EXISTS public.reservation_confirmation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  sender_id uuid,              -- 발송자(users.id)
  method text,                 -- 'email' | 'pdf' | 'print' 등
  status text NOT NULL DEFAULT 'sent', -- 'generated' | 'sent' | 'viewed'
  subject text,
  recipient_email text,
  meta jsonb,                  -- 템플릿/렌더링 옵션 등 부가 정보
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- 가능한 경우 FK를 quote에 연결 (quote_id 컬럼/혹은 id 컬럼 상황에 따라 자동 연결)
DO $$
BEGIN
  -- 이미 FK가 있으면 스킵
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'reservation_confirmation'
      AND c.conname = 'reservation_confirmation_quote_fk'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='quote' AND column_name='quote_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.reservation_confirmation
               ADD CONSTRAINT reservation_confirmation_quote_fk
               FOREIGN KEY (quote_id) REFERENCES public.quote(quote_id) ON DELETE CASCADE';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='quote' AND column_name='id'
    ) THEN
      EXECUTE 'ALTER TABLE public.reservation_confirmation
               ADD CONSTRAINT reservation_confirmation_quote_fk
               FOREIGN KEY (quote_id) REFERENCES public.quote(id) ON DELETE CASCADE';
    END IF;
  END IF;
END$$;

-- 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_reservation_confirmation_quote_id
  ON public.reservation_confirmation (quote_id);
CREATE INDEX IF NOT EXISTS idx_reservation_confirmation_status
  ON public.reservation_confirmation (status);
