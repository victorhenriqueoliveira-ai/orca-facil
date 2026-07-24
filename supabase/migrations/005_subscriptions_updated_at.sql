-- subscriptions: adicionar updated_at (atualizado pelo webhook AbacatePay)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
