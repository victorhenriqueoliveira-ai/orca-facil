-- Histórico de pagamentos de assinatura
CREATE TABLE subscription_payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  abacatepay_billing_id text,
  amount                integer NOT NULL,
  paid_at               timestamptz NOT NULL DEFAULT now(),
  period_end            timestamptz,
  receipt_url           text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_payments" ON subscription_payments
  FOR SELECT USING (user_id = auth.uid());

CREATE INDEX idx_subscription_payments_user_id ON subscription_payments(user_id);
