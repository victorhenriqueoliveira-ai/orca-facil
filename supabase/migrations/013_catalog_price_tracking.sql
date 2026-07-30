-- Migration 013: Adiciona rastreamento de atualização de preço em catalog_items

ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS price_updated_at timestamptz NOT NULL DEFAULT now();

UPDATE catalog_items SET price_updated_at = created_at WHERE price_updated_at IS NULL;

CREATE INDEX IF NOT EXISTS catalog_items_price_updated_idx
  ON catalog_items (user_id, price_updated_at);
