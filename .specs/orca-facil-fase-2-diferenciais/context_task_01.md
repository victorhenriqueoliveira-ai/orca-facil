# Contexto — task_01

## Requisitos do PRD
Cria as cinco migrations SQL que adicionam todas as colunas, tabelas, índices e bucket de storage necessários para a Fase 2.

## Especificação Técnica

### Convenção de nomenclatura
Migrations existentes vão de 001 a 010 em `supabase/migrations/`. As novas devem seguir: `011_...`, `012_...`, `013_...`, `014_...`, `015_...`.

### Migration 011 — quotes: campos de aprovação e rastreamento
```sql
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
```

### Migration 012 — profiles: novos campos de configuração
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS followup_days              int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS price_alert_days           int NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS sheet_waste_pct            numeric(4,2) NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS whatsapp_message_template  text;
```

### Migration 013 — catalog_items: rastreamento de atualização de preço
```sql
ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS price_updated_at timestamptz NOT NULL DEFAULT now();

UPDATE catalog_items SET price_updated_at = created_at WHERE price_updated_at IS NULL;

CREATE INDEX IF NOT EXISTS catalog_items_price_updated_idx
  ON catalog_items (user_id, price_updated_at);
```

### Migration 014 — nova tabela quote_room_photos
```sql
CREATE TABLE IF NOT EXISTS quote_room_photos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   uuid NOT NULL REFERENCES quote_rooms(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  position  int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS quote_room_photos_room_idx ON quote_room_photos(room_id);

ALTER TABLE quote_room_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "own_room_photos" ON quote_room_photos
  USING (
    EXISTS (
      SELECT 1 FROM quote_rooms qr
      JOIN quote_versions qv ON qv.id = qr.version_id
      JOIN quotes q ON q.id = qv.quote_id
      WHERE qr.id = room_id AND q.user_id = auth.uid()
    )
  );
```

### Migration 015 — bucket quote-photos
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-photos', 'quote-photos', false)
  ON CONFLICT DO NOTHING;
```

## Estado de dependências
Nenhuma dependência — task independente.
