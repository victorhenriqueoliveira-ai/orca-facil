# TechSpec — Orça Fácil

**Versão:** 1.0  
**Data:** 2026-07-20  
**PRD de referência:** `.specs/orca-facil/_prd.md`

---

## Executive Summary

Orça Fácil é implementado como uma aplicação Next.js (App Router) single-tenant por usuário, hospedada na Vercel, usando Supabase como plataforma completa de backend (Postgres + Auth + Storage). Toda a lógica de negócio reside em Route Handlers no servidor — o cliente recebe apenas dados prontos para renderização.

A decisão arquitetural central é **nenhuma camada de API separada**: Route Handlers do Next.js servem como BFF (Backend for Frontend), chamam o Supabase diretamente via `supabase-js` com o service role key para operações server-side, e enforçam autorização via Row Level Security no banco. O principal trade-off é acoplamento entre frontend e backend no mesmo repositório — aceitável para um desenvolvedor solo, eliminando a complexidade de um serviço separado.

A geração de PDF usa Puppeteer + @sparticuz/chromium (ADR-002): renderiza HTML com CSS inline → gera PDF A4 → salva no Supabase Storage → retorna URL assinada com 7 dias de expiração. Preços são sempre snapshot no momento da inserção (ADR-003). Templates do sistema vivem no Postgres via seed (ADR-004).

---

## System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────┐
│                   Vercel (Next.js)                  │
│                                                     │
│  ┌──────────────────┐    ┌───────────────────────┐  │
│  │  App Router      │    │  Route Handlers (API) │  │
│  │  (Server +       │◄──►│  /api/*               │  │
│  │   Client         │    │  /api/webhooks/*      │  │
│  │   Components)    │    └───────────┬───────────┘  │
│  └──────────────────┘                │              │
└─────────────────────────────────────┼──────────────┘
                                      │
              ┌───────────────────────┼──────────────┐
              │         Supabase      │              │
              │  ┌────────────┐  ┌───▼────────┐     │
              │  │  Postgres  │  │    Auth    │     │
              │  │  + RLS     │  │ (OTP email │     │
              │  └────────────┘  │  + phone)  │     │
              │  ┌────────────┐  └────────────┘     │
              │  │  Storage   │                     │
              │  │  (logos,   │                     │
              │  │   PDFs)    │                     │
              │  └────────────┘                     │
              └─────────────────────────────────────┘
                                      │
              ┌───────────────────────┘
              │
         ┌────▼──────────┐
         │  AbacatePay   │
         │  (checkout +  │
         │   webhooks)   │
         └───────────────┘
```

**Fluxo de dados principais:**

1. **Auth**: usuário acessa `/login` → escolhe e-mail ou telefone → recebe OTP → Supabase Auth cria sessão → cookie `sb-*` enviado ao browser.
2. **Wizard de orçamento**: Client Component gerencia estado local das 4 etapas → ao avançar de etapa, POST para Route Handler → persiste no Postgres.
3. **Geração de PDF**: Client aciona POST `/api/quotes/[id]/pdf` → Route Handler busca dados do Postgres → renderiza HTML → Puppeteer gera PDF → upload para Supabase Storage → retorna `{ url, signedUrl }`.
4. **Webhook AbacatePay**: POST `/api/webhooks/abacatepay` → valida assinatura HMAC → atualiza `subscriptions.status` no Postgres → Supabase RLS passa a bloquear writes se `read_only`.
5. **Compartilhamento WhatsApp**: cliente recebe `signedUrl` → browser abre `https://wa.me/?text=...` com a URL no texto, ou aciona Web Share API (quando disponível em mobile).

---

## Implementation Design

### Core Interfaces

```typescript
// Tipos centrais — todos os Route Handlers e componentes dependem destes

export type SubscriptionStatus = 'trial' | 'active' | 'read_only' | 'cancelled'

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'cancelled'

export type ItemType = 'material' | 'service'

export type ItemUnit =
  | 'm²' | 'm_linear' | 'peça' | 'folha'   // materiais
  | 'hora' | 'projeto' | 'verba'             // serviços

export interface Profile {
  id: string
  business_name: string
  city: string | null
  phone: string | null
  logo_url: string | null
  pix_key: string | null
  bank_info: string | null
  quote_validity_days: number
  profit_margin_pct: number
}

export interface QuoteItem {
  id: string
  quote_room_id: string
  catalog_item_id: string | null  // referência opcional, preço nunca lido daqui
  name: string          // snapshot
  type: ItemType        // snapshot
  unit: ItemUnit        // snapshot
  unit_price: number    // snapshot — nunca atualizado após inserção
  quantity: number
  sort_order: number
}

export interface QuoteRoom {
  id: string
  quote_version_id: string
  name: string
  template_id: string | null
  sort_order: number
  items: QuoteItem[]
}

export interface QuoteVersion {
  id: string
  quote_id: string
  name: string
  sort_order: number
  rooms: QuoteRoom[]
  total: number  // calculado: SUM(item.unit_price * item.quantity) com margem
}

export interface Quote {
  id: string
  user_id: string
  customer_id: string | null
  quote_number: number
  status: QuoteStatus
  notes: string | null
  profit_margin_pct: number
  validity_days: number
  created_at: string
  updated_at: string
  customer: Customer | null
  versions: QuoteVersion[]
}
```

### Data Models

#### Schema Postgres (Supabase)

```sql
-- Extensão necessária
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Perfil da marcenaria (1:1 com auth.users)
CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT '',
  city          text,
  phone         text,
  logo_url      text,
  pix_key       text,
  bank_info     text,
  quote_validity_days int NOT NULL DEFAULT 30,
  profit_margin_pct   numeric(5,2) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Assinatura (1:1 com profiles)
CREATE TABLE subscriptions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status                    text NOT NULL DEFAULT 'trial',
  trial_ends_at             timestamptz,
  current_period_end        timestamptz,
  abacatepay_customer_id    text,
  abacatepay_subscription_id text,
  created_at                timestamptz NOT NULL DEFAULT now(),
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

-- Catálogo próprio
CREATE TABLE catalog_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('material', 'service')),
  unit       text NOT NULL,
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Templates do sistema (seed, read-only pela app)
CREATE TABLE system_templates (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type text NOT NULL,
  name      text NOT NULL
);

CREATE TABLE system_template_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      uuid NOT NULL REFERENCES system_templates(id),
  name             text NOT NULL,
  type             text NOT NULL CHECK (type IN ('material', 'service')),
  unit             text NOT NULL,
  default_quantity numeric(10,3) NOT NULL DEFAULT 1,
  sort_order       int NOT NULL DEFAULT 0
);

-- Orçamentos
CREATE TABLE quotes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id       uuid REFERENCES customers(id) ON DELETE SET NULL,
  quote_number      int NOT NULL,
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','approved','cancelled')),
  notes             text,
  profit_margin_pct numeric(5,2) NOT NULL DEFAULT 0,
  validity_days     int NOT NULL DEFAULT 30,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, quote_number)
);

-- Versões de orçamento (variantes: Padrão, Premium, etc.)
CREATE TABLE quote_versions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id   uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT 'Padrão',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ambientes dentro de uma versão
CREATE TABLE quote_rooms (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_version_id uuid NOT NULL REFERENCES quote_versions(id) ON DELETE CASCADE,
  name             text NOT NULL,
  template_id      uuid REFERENCES system_templates(id) ON DELETE SET NULL,
  sort_order       int NOT NULL DEFAULT 0
);

-- Itens dentro de um ambiente (snapshot de preço)
CREATE TABLE quote_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_room_id    uuid NOT NULL REFERENCES quote_rooms(id) ON DELETE CASCADE,
  catalog_item_id  uuid,  -- referência opcional, sem FK constraint (item pode ter sido inativado)
  name             text NOT NULL,
  type             text NOT NULL CHECK (type IN ('material','service')),
  unit             text NOT NULL,
  unit_price       numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity         numeric(10,3) NOT NULL CHECK (quantity > 0),
  sort_order       int NOT NULL DEFAULT 0
);

-- PDFs gerados (histórico de geração)
CREATE TABLE quote_pdfs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id     uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  mode         text NOT NULL CHECK (mode IN ('summary','detailed')),
  version_ids  uuid[] NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);
```

#### Row Level Security

```sql
-- profiles: usuário acessa apenas o próprio perfil
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON profiles USING (auth.uid() = id);

-- subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_subscription" ON subscriptions USING (auth.uid() = user_id);

-- customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_customers" ON customers USING (auth.uid() = user_id);

-- catalog_items
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_catalog" ON catalog_items USING (auth.uid() = user_id);

-- system_templates: leitura para todos os autenticados
ALTER TABLE system_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_templates" ON system_templates FOR SELECT TO authenticated USING (true);
ALTER TABLE system_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_template_items" ON system_template_items FOR SELECT TO authenticated USING (true);

-- quotes e tabelas filhas
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_quotes" ON quotes USING (auth.uid() = user_id);

ALTER TABLE quote_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_versions" ON quote_versions USING (
  EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.user_id = auth.uid())
);

-- Políticas análogas para quote_rooms, quote_items, quote_pdfs (via JOIN em quotes)
```

#### Supabase Storage Buckets

| Bucket | Acesso | Política |
|--------|--------|---------|
| `logos` | privado | usuário faz upload do próprio logo; leitura via URL assinada |
| `pdfs` | privado | escrita apenas pelo service role (Route Handler); leitura via URL assinada com 7 dias de expiração |

#### Contador de quote_number

Função Postgres para garantir numeração sequencial por usuário:

```sql
CREATE OR REPLACE FUNCTION next_quote_number(p_user_id uuid)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_next int;
BEGIN
  SELECT COALESCE(MAX(quote_number), 0) + 1
  INTO v_next FROM quotes WHERE user_id = p_user_id;
  RETURN v_next;
END;
$$;
```

### API Endpoints

#### Autenticação (gerenciada pelo Supabase Auth)

| Método | Caminho | Descrição |
|--------|---------|-----------|
| POST | `/api/auth/callback` | Callback OAuth/OTP do Supabase; troca code por session |

#### Perfil

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/api/profile` | Retorna perfil + status de assinatura do usuário autenticado |
| PATCH | `/api/profile` | Atualiza campos do perfil (business_name, city, phone, etc.) |
| POST | `/api/profile/logo` | Upload de logo; armazena em `logos/{userId}/logo.{ext}`; atualiza `logo_url` |

#### Catálogo

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/api/catalog` | Lista itens ativos (e opcionalmente inativos com `?include_inactive=true`) |
| POST | `/api/catalog` | Cria item (`name`, `type`, `unit`, `unit_price`) |
| PATCH | `/api/catalog/[id]` | Atualiza item ou alterna `is_active` |

#### Templates do sistema

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/api/templates` | Lista templates com seus itens padrão |

#### Clientes

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/api/customers` | Lista clientes com busca por `?q=` (nome ou telefone) |
| POST | `/api/customers` | Cria cliente |
| PATCH | `/api/customers/[id]` | Atualiza cliente |

#### Orçamentos

| Método | Caminho | Body / Params | Descrição |
|--------|---------|---------------|-----------|
| GET | `/api/quotes` | `?status=&page=` | Lista orçamentos com filtros |
| POST | `/api/quotes` | `{ customer_id?, profit_margin_pct, validity_days }` | Cria orçamento (status `draft`, gera quote_number, cria version padrão) |
| GET | `/api/quotes/[id]` | — | Orçamento completo (customer + versions + rooms + items) |
| PATCH | `/api/quotes/[id]` | campos parciais | Atualiza cabeçalho (status, notas, margem) |
| POST | `/api/quotes/[id]/duplicate` | — | Copia orçamento inteiro (novo quote_number, status `draft`) |
| DELETE | `/api/quotes/[id]` | — | Deleta orçamento em status `draft` |

#### Versões do orçamento

| Método | Caminho | Body | Descrição |
|--------|---------|------|-----------|
| POST | `/api/quotes/[id]/versions` | `{ name }` | Cria nova variante |
| PATCH | `/api/quotes/[id]/versions/[vid]` | `{ name }` | Renomeia variante |
| DELETE | `/api/quotes/[id]/versions/[vid]` | — | Remove variante (mínimo 1 por orçamento) |

#### Ambientes e itens

| Método | Caminho | Body | Descrição |
|--------|---------|------|-----------|
| POST | `/api/quotes/[id]/versions/[vid]/rooms` | `{ name, template_id? }` | Cria ambiente (se template_id, pré-popula itens com snapshot) |
| PATCH | `/api/quotes/[id]/versions/[vid]/rooms/[rid]` | `{ name }` | Renomeia ambiente |
| DELETE | `/api/quotes/[id]/versions/[vid]/rooms/[rid]` | — | Remove ambiente e itens |
| POST | `/api/quotes/[id]/versions/[vid]/rooms/[rid]/items` | `{ catalog_item_id?, name, type, unit, unit_price, quantity }` | Adiciona item (snapshot aplicado ao salvar) |
| PATCH | `.../items/[iid]` | campos parciais | Atualiza quantidade ou preço do item |
| DELETE | `.../items/[iid]` | — | Remove item |

#### Geração de PDF

| Método | Caminho | Body | Descrição |
|--------|---------|------|-----------|
| POST | `/api/quotes/[id]/pdf` | `{ mode: 'summary'\|'detailed', version_ids: string[] }` | Gera PDF, salva em Storage, retorna `{ storage_path, signed_url }` |

#### Assinatura

| Método | Caminho | Body | Descrição |
|--------|---------|------|-----------|
| GET | `/api/subscription` | — | Status atual da assinatura |
| POST | `/api/subscription/checkout` | `{ plan: 'monthly' }` | Cria sessão de checkout AbacatePay; retorna `{ checkout_url }` |
| POST | `/api/subscription/cancel` | — | Cancela assinatura ativa |
| POST | `/api/webhooks/abacatepay` | Payload AbacatePay | Processa eventos de pagamento/cancelamento |

---

## Integration Points

### Supabase

- **Auth**: cliente usa `@supabase/ssr` para gerenciar cookies de sessão em Server Components e Route Handlers. OTP enviado por e-mail (Supabase SMTP) ou SMS/WhatsApp (configurar provider externo como Twilio).
- **Postgres**: Route Handlers usam `createClient` com `service_role` key para contornar RLS quando necessário (ex.: webhook de pagamento atualiza subscription sem contexto de usuário autenticado).
- **Storage**: upload via SDK Supabase com `service_role`; geração de URL assinada com `createSignedUrl(path, 604800)` (7 dias = 604800s).

### AbacatePay

- **Checkout**: POST para endpoint REST do AbacatePay com `{ customer, plan, redirect_url, webhook_url }`. Retorna `checkout_url` para redirect do cliente.
- **Webhooks**: AbacatePay envia POST para `/api/webhooks/abacatepay`. Validar HMAC-SHA256 do header `X-AbacatePay-Signature` antes de processar. Eventos relevantes:
  - `subscription.activated` → `status = 'active'`, atualiza `current_period_end`
  - `subscription.renewed` → atualiza `current_period_end`
  - `subscription.cancelled` → `status = 'cancelled'`
  - `subscription.payment_failed` → `status = 'read_only'`
- **Sem SDK oficial**: implementar chamadas REST diretas com `fetch` e tipagem manual.

### WhatsApp (compartilhamento)

Sem integração de API. O compartilhamento usa o protocolo de deep link:
```
https://wa.me/?text=Segue+o+orçamento+da+[Nome da Marcenaria]%3A+[signed_url]
```
Em mobile, abre o app WhatsApp diretamente. O Web Share API (`navigator.share`) é usado como fallback progressivo quando disponível (Chrome Android).

---

## Impact Analysis

| Componente | Tipo de Impacto | Descrição e Risco | Ação Necessária |
|---|---|---|---|
| Next.js App Router | Novo | Toda a aplicação — risco principal é tamanho do bundle do Chromium na função de PDF | Configurar `serverExternalPackages: ['@sparticuz/chromium']` no next.config |
| Supabase Postgres | Novo | Schema completo com RLS — risco de policy mal configurada expor dados de outro usuário | Testes de RLS obrigatórios antes do lançamento |
| Supabase Storage | Novo | Dois buckets privados — risco de URL assinada expirar antes do cliente compartilhar | Expiry de 7 dias; opção de regenerar PDF resolve |
| AbacatePay | Novo | Único processador de pagamento — risco de downtime impactar conversão | Monitorar webhook delivery; suporte manual como fallback |
| Vercel | Novo | Função de PDF deve estar no plano Pro (timeout 60s, bundle 250MB) | Confirmar plano antes do lançamento |

---

## Testing Approach

### Unit Tests

Usar **Vitest** (compatível com ESM/TypeScript do Next.js sem configuração extra).

- `lib/pdf/renderer.ts`: testar se o HTML gerado contém os dados do orçamento (nome do cliente, itens, totais).
- `lib/quotes/calculate.ts`: testar cálculo de total com margem de lucro (edge cases: margem 0%, margem 100%, itens com quantity decimal).
- `lib/subscription/guard.ts`: testar função que determina se usuário pode criar/editar dado o status da assinatura.
- `lib/webhooks/abacatepay.ts`: testar validação de HMAC com payloads válidos e inválidos.

### Integration Tests

Usar **Supabase local** (`supabase start`) + **Playwright** para testes end-to-end críticos.

- Fluxo de cadastro → criar orçamento → gerar PDF → status `sent`.
- Webhook AbacatePay `subscription.activated` → usuário passa de `trial` para `active`.
- RLS: usuário A não consegue ler orçamento do usuário B (teste direto via Supabase client com auth do usuário A).
- PDF gerado contém snapshot de preço correto mesmo após alterar item no catálogo.

---

## Development Sequencing

### Build Order

1. **Setup do projeto** — `npx create-next-app` com TypeScript + Tailwind + App Router; instalar `@supabase/ssr`, `@supabase/supabase-js`; configurar `next.config.ts` com `serverExternalPackages`. Sem dependências.

2. **Schema Supabase + RLS + seed** — criar todas as tabelas, políticas RLS e seed de templates. Depende do passo 1 (projeto criado).

3. **Auth (login OTP)** — páginas `/login` e `/auth/callback`; middleware Next.js para proteger rotas `(app)`. Depende dos passos 1 e 2.

4. **Layout da aplicação + verificação de assinatura** — layout `(app)/layout.tsx` que busca `subscriptions` e injeta status via context; banner "Trial expira em X dias"; guard de `read_only`. Depende do passo 3.

5. **Perfil + upload de logo** — página `/configuracoes`; Route Handler `PATCH /api/profile` e `POST /api/profile/logo`; bucket `logos` no Storage. Depende dos passos 3 e 4.

6. **Catálogo próprio** — página `/catalogo`; Route Handlers CRUD `/api/catalog`. Depende do passo 3.

7. **Módulo de clientes** — página `/clientes`; Route Handlers CRUD `/api/customers`. Depende do passo 3.

8. **Wizard de orçamento — Etapas 1 e 2** (cliente + ambientes) — página `/orcamentos/novo` com componente de wizard multi-etapa; `GET /api/templates`; endpoints de criação de quote, version, room e item. Depende dos passos 2, 6 e 7.

9. **Wizard — Etapas 3 e 4** (revisão + geração de PDF) — cálculo de totais com margem; `POST /api/quotes/[id]/pdf` com Puppeteer; bucket `pdfs`; botão "Enviar pelo WhatsApp". Depende do passo 8.

10. **Gestão de orçamentos** — listagem com filtros, duplicar, editar rascunho, visualizar PDF. Depende do passo 9.

11. **Múltiplas versões de orçamento** — UI para criar variantes dentro do wizard; endpoints de versions; PDF comparativo multi-variante. Depende do passo 9.

12. **Assinatura AbacatePay** — página `/assinar`; `POST /api/subscription/checkout`; `POST /api/webhooks/abacatepay`; lógica de trial → read_only → active. Depende do passo 4.

13. **E-mail de reengajamento** — cron job (Vercel Cron ou Supabase pg_cron) que identifica trials expirando em 3 dias e envia e-mail via Resend ou Supabase Edge Function. Depende do passo 12.

### Technical Dependencies

- **Conta Supabase** com projeto criado e variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` configuradas.
- **Conta AbacatePay** com chave de API e URL de webhook configurada para `https://{dominio}/api/webhooks/abacatepay`.
- **Vercel Pro** (ou ao menos validar limites) para timeout de 60s na função de PDF.
- **Resend** (ou Supabase Auth SMTP) para e-mails transacionais (reengajamento de trial).
- **Twilio ou provider SMS** para OTP via telefone (Supabase Auth suporta configuração de provider externo).

---

## Monitoring and Observability

- **Vercel Analytics + Logs**: monitorar duração das funções serverless, especialmente `/api/quotes/[id]/pdf` (alerta se p95 > 30s).
- **Supabase Dashboard**: monitorar tamanho do banco, uso de Storage e latência de queries. Criar índice em `quotes(user_id, status)` e `customers(user_id)` para buscas frequentes.
- **Webhook AbacatePay**: logar todo payload recebido (sem dados sensíveis) e resultado do processamento. Manter tabela `webhook_logs` com `event_type`, `processed_at`, `status`.
- **Alertas críticos**:
  - Falha na geração de PDF (Puppeteer timeout ou crash) → log estruturado com `quote_id`.
  - Webhook de pagamento recebido mas não processado (HMAC inválido) → log de alerta.
  - Trial expirado sem assinatura → verificar se e-mail de reengajamento foi enviado.

---

## Technical Considerations

### Key Decisions

**Next.js App Router como BFF único**: Route Handlers servem como API, eliminando a necessidade de um backend separado. Trade-off: a Vercel cobra por invocação de função — para o volume esperado no MVP (< 1.000 usuários), custo desprezível.

**Supabase como plataforma completa**: Auth + Postgres + Storage em um único serviço. Trade-off: dependência total de um único vendor. Mitigação: Postgres é portável se necessário migrar no futuro.

**Cálculo de total em tempo de leitura**: o total do orçamento (`SUM(unit_price * quantity)`) é calculado no servidor ao buscar o orçamento, nunca persistido como coluna. Evita inconsistências entre coluna armazenada e itens reais.

**PDF com URL assinada de 7 dias**: o marceneiro compartilha a URL via WhatsApp. O cliente final acessa a URL por até 7 dias sem precisar de autenticação. Após expirar, o marceneiro pode regenerar o PDF (operação idempotente).

### Known Risks

- **Cold start do Puppeteer na Vercel**: a primeira invocação após período de inatividade pode demorar 5–10s. Em mobile, o usuário pode interpretar como travamento. Mitigação: loading state com mensagem "Gerando seu orçamento profissional..." e estimativa de tempo.
- **Limite de tamanho da função serverless**: @sparticuz/chromium adiciona ~45MB. Com o restante da aplicação, deve ficar abaixo de 250MB (limite Vercel Pro). Monitorar após deploy.
- **Sem staging environment na Fase 1**: bugfix vai direto para produção. Mitigação: feature flags simples via variável de ambiente para desativar features instáveis sem rollback.
- **AbacatePay sem SDK oficial**: manutenção manual de tipos e chamadas REST. Mitigação: isolar toda integração em `lib/abacatepay/` com tipos explícitos.

---

## Architecture Decision Records

- [ADR-001: Escopo Completo (A+B+C) em vez de MVP Mínimo](adrs/adr-001.md) — Incluir módulo de clientes e versões múltiplas desde o lançamento para maximizar valor percebido.
- [ADR-002: Puppeteer + @sparticuz/chromium para Geração de PDF](adrs/adr-002.md) — Renderização HTML→PDF server-side para visual pixel-perfect com suporte a Vercel serverless.
- [ADR-003: Snapshot de Preço nos Itens de Orçamento](adrs/adr-003.md) — Preços copiados no momento da inserção; alterações no catálogo não afetam orçamentos existentes.
- [ADR-004: Templates do Sistema Armazenados no Postgres com Seed](adrs/adr-004.md) — Templates em tabelas Postgres permitem correções em produção sem novo deploy.
