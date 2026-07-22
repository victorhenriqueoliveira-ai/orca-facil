-- Migration 004: Corrige discrepâncias entre schema inicial e código gerado
-- Renomeia colunas, adiciona colunas faltantes e corrige constraints de status

-- ============================================================
-- profiles: adicionar updated_at (referenciado no PATCH /api/profile)
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ============================================================
-- quotes: adicionar title + corrigir constraint de status
-- ============================================================

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired'));

-- ============================================================
-- quote_versions: adicionar colunas faltantes
-- ============================================================

ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS version_number int NOT NULL DEFAULT 1;
ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS profit_margin_pct numeric(5,2);
ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS notes text;

-- ============================================================
-- quote_rooms: renomear colunas + atualizar RLS
-- ============================================================

-- Renomear quote_version_id → version_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_rooms' AND column_name = 'quote_version_id'
  ) THEN
    ALTER TABLE quote_rooms RENAME COLUMN quote_version_id TO version_id;
  END IF;
END $$;

-- Renomear sort_order → position
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_rooms' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE quote_rooms RENAME COLUMN sort_order TO position;
  END IF;
END $$;

-- Recriar índice com novo nome de coluna
DROP INDEX IF EXISTS quote_rooms_quote_version_id_idx;
CREATE INDEX IF NOT EXISTS quote_rooms_version_id_idx ON quote_rooms(version_id);

-- Recriar política RLS com novo nome de coluna
DROP POLICY IF EXISTS "own_rooms" ON quote_rooms;
CREATE POLICY "own_rooms" ON quote_rooms
  USING (
    EXISTS (
      SELECT 1 FROM quote_versions qv
      JOIN quotes q ON q.id = qv.quote_id
      WHERE qv.id = version_id
        AND q.user_id = auth.uid()
    )
  );

-- ============================================================
-- quote_items: renomear colunas + atualizar RLS
-- ============================================================

-- Renomear quote_room_id → room_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_items' AND column_name = 'quote_room_id'
  ) THEN
    ALTER TABLE quote_items RENAME COLUMN quote_room_id TO room_id;
  END IF;
END $$;

-- Renomear sort_order → position
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_items' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE quote_items RENAME COLUMN sort_order TO position;
  END IF;
END $$;

-- Recriar índice com novo nome de coluna
DROP INDEX IF EXISTS quote_items_quote_room_id_idx;
CREATE INDEX IF NOT EXISTS quote_items_room_id_idx ON quote_items(room_id);

-- Recriar política RLS com novo nome de coluna
DROP POLICY IF EXISTS "own_items" ON quote_items;
CREATE POLICY "own_items" ON quote_items
  USING (
    EXISTS (
      SELECT 1 FROM quote_rooms qr
      JOIN quote_versions qv ON qv.id = qr.version_id
      JOIN quotes q ON q.id = qv.quote_id
      WHERE qr.id = room_id
        AND q.user_id = auth.uid()
    )
  );

-- ============================================================
-- system_template_items: renomear sort_order → position
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'system_template_items' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE system_template_items RENAME COLUMN sort_order TO position;
  END IF;
END $$;
