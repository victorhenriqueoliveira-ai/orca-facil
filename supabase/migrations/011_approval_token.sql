-- Migration 011: Adiciona campos de aprovação e rastreamento em quotes

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS approval_token          uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS approval_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at                 timestamptz,
  ADD COLUMN IF NOT EXISTS followup_notified_at    timestamptz,
  ADD COLUMN IF NOT EXISTS expiry_notified_at      timestamptz;

CREATE INDEX IF NOT EXISTS quotes_approval_token_idx ON quotes (approval_token)
  WHERE approval_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS quotes_sent_at_idx ON quotes (user_id, status, sent_at)
  WHERE status = 'sent';
