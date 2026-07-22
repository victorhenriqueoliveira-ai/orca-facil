-- ============================================================
-- Migration 001: Schema inicial do Orça Fácil
-- Cria todas as tabelas, constraints, índices e políticas RLS
-- ============================================================

-- Extensão necessária para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELAS
-- ============================================================

-- Perfil da marcenaria (1:1 com auth.users)
CREATE TABLE profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name       text NOT NULL DEFAULT '',
  city                text,
  phone               text,
  logo_url            text,
  pix_key             text,
  bank_info           text,
  quote_validity_days int NOT NULL DEFAULT 30,
  profit_margin_pct   numeric(5,2) NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Assinatura (1:1 com profiles)
CREATE TABLE subscriptions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status                      text NOT NULL DEFAULT 'trial'
                              CHECK (status IN ('trial','active','read_only','cancelled')),
  trial_ends_at               timestamptz,
  current_period_end          timestamptz,
  abacatepay_customer_id      text,
  abacatepay_subscription_id  text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Clientes do marceneiro
CREATE TABLE customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       text NOT NULL,
  phone      text,
  email      text,
  address    text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Catálogo próprio de materiais e serviços
CREATE TABLE catalog_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('material','service')),
  unit       text NOT NULL,
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Templates de ambiente do sistema (seed, read-only pela app)
CREATE TABLE system_templates (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type text NOT NULL,
  name      text NOT NULL
);

-- Itens dos templates do sistema
CREATE TABLE system_template_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      uuid NOT NULL REFERENCES system_templates(id) ON DELETE CASCADE,
  name             text NOT NULL,
  type             text NOT NULL CHECK (type IN ('material','service')),
  unit             text NOT NULL,
  default_quantity numeric(10,3) NOT NULL DEFAULT 1,
  position         int NOT NULL DEFAULT 0
);

-- Orçamentos
CREATE TABLE quotes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id       uuid REFERENCES customers(id) ON DELETE SET NULL,
  quote_number      int NOT NULL,
  title             text,
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  notes             text,
  profit_margin_pct numeric(5,2) NOT NULL DEFAULT 0,
  validity_days     int NOT NULL DEFAULT 30,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, quote_number)
);

-- Versões de orçamento (variantes: Padrão, Premium, etc.)
CREATE TABLE quote_versions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id          uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  version_number    int NOT NULL DEFAULT 1,
  name              text NOT NULL DEFAULT 'Padrão',
  sort_order        int NOT NULL DEFAULT 0,
  profit_margin_pct numeric(5,2),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Ambientes dentro de uma versão de orçamento
CREATE TABLE quote_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id  uuid NOT NULL REFERENCES quote_versions(id) ON DELETE CASCADE,
  name        text NOT NULL,
  template_id uuid REFERENCES system_templates(id) ON DELETE SET NULL,
  position    int NOT NULL DEFAULT 0
);

-- Itens dentro de um ambiente (snapshot de preço — ADR-003)
CREATE TABLE quote_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES quote_rooms(id) ON DELETE CASCADE,
  catalog_item_id uuid,  -- referência opcional sem FK constraint (item pode ter sido inativado)
  name            text NOT NULL,
  type            text NOT NULL CHECK (type IN ('material','service')),
  unit            text NOT NULL,
  unit_price      numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity        numeric(10,3) NOT NULL CHECK (quantity > 0),
  position        int NOT NULL DEFAULT 0
);

-- Histórico de PDFs gerados
CREATE TABLE quote_pdfs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id     uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  mode         text NOT NULL CHECK (mode IN ('summary','detailed')),
  version_ids  uuid[] NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX ON quotes(user_id, status);
CREATE INDEX ON customers(user_id);
CREATE INDEX ON catalog_items(user_id, is_active);
CREATE INDEX ON quote_versions(quote_id);
CREATE INDEX ON quote_rooms(version_id);
CREATE INDEX ON quote_items(room_id);
CREATE INDEX ON quote_pdfs(quote_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- profiles: usuário acessa apenas o próprio perfil
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON profiles
  USING (auth.uid() = id);

-- subscriptions: usuário acessa apenas a própria assinatura
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_subscription" ON subscriptions
  USING (auth.uid() = user_id);

-- customers: usuário acessa apenas os próprios clientes
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_customers" ON customers
  USING (auth.uid() = user_id);

-- catalog_items: usuário acessa apenas o próprio catálogo
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_catalog" ON catalog_items
  USING (auth.uid() = user_id);

-- system_templates: leitura para todos os usuários autenticados, sem escrita via app
ALTER TABLE system_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_templates" ON system_templates
  FOR SELECT TO authenticated USING (true);

-- system_template_items: leitura para todos os usuários autenticados, sem escrita via app
ALTER TABLE system_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_template_items" ON system_template_items
  FOR SELECT TO authenticated USING (true);

-- quotes: usuário acessa apenas os próprios orçamentos
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_quotes" ON quotes
  USING (auth.uid() = user_id);

-- quote_versions: acesso via JOIN com quotes (verifica user_id)
ALTER TABLE quote_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_versions" ON quote_versions
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_id
        AND q.user_id = auth.uid()
    )
  );

-- quote_rooms: acesso via JOIN com quote_versions → quotes
ALTER TABLE quote_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_rooms" ON quote_rooms
  USING (
    EXISTS (
      SELECT 1 FROM quote_versions qv
      JOIN quotes q ON q.id = qv.quote_id
      WHERE qv.id = version_id
        AND q.user_id = auth.uid()
    )
  );

-- quote_items: acesso via JOIN com quote_rooms → quote_versions → quotes
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
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

-- quote_pdfs: acesso via JOIN com quotes
ALTER TABLE quote_pdfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_pdfs" ON quote_pdfs
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_id
        AND q.user_id = auth.uid()
    )
  );

-- ============================================================
-- FUNÇÕES
-- ============================================================

-- Gera o próximo número de orçamento sequencial por usuário
CREATE OR REPLACE FUNCTION next_quote_number(p_user_id uuid)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  v_next int;
BEGIN
  SELECT COALESCE(MAX(quote_number), 0) + 1
  INTO v_next
  FROM quotes
  WHERE user_id = p_user_id;
  RETURN v_next;
END;
$$;
