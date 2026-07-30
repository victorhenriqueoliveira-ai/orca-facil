# TechSpec — Orça Fácil Fase 2: Plataforma de Fechamento de Vendas

**Data:** 2026-07-25  
**Status:** Rascunho  
**PRD:** [_prd.md](./_prd.md)

---

## Executive Summary

A Fase 2 estende o Orça Fácil com 9 features implementadas inteiramente dentro da stack Next.js App Router + Supabase existente, sem novos serviços externos além do Resend (já em uso). O principal trade-off da abordagem: alertas in-app são derivados em tempo real via query (sem tabela `notifications`) — simples e consistentes, mas sem histórico persistente de alertas lidos.

A implementação divide-se em quatro grupos independentes: (1) link de aprovação e token (schema + PATCH + rota pública + e-mail); (2) notificações automáticas (cron unificado + templates de e-mail); (3) ferramentas do wizard (calculadora de chapas, fotos, mensagem WhatsApp); (4) inteligência (dashboard de conversão, alerta de preços, catálogo regional). Cada grupo pode ser implementado e entregue em produção de forma independente.

---

## System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────┐
│  Next.js App Router                                  │
│                                                      │
│  (app)/          → rotas autenticadas existentes     │
│  (app)/desempenho → dashboard de conversão (novo)    │
│  (auth)/         → autenticação existente            │
│  o/[token]/      → página pública de aprovação (novo)│
│                                                      │
│  api/quotes/[id]       → PATCH estendido (token)     │
│  api/quotes/[id]/approve → aprovação pública (novo)  │
│  api/alerts            → computed alerts (novo)      │
│  api/dashboard/conversion → métricas (novo)          │
│  api/catalog/regional-suggestions → catálogo (novo)  │
│  api/catalog/import-suggestions   → importar (novo)  │
│  api/cron/daily-notifications     → cron (novo)      │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│  Supabase                                            │
│  Postgres:  quotes* + profiles* + catalog_items*     │
│             quote_room_photos (nova tabela)           │
│  Storage:   logos/ (existente), pdfs/ (existente)    │
│             quote-photos/ (novo bucket)               │
│  Auth:      sem alteração                            │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│  Serviços Externos                                   │
│  Resend — 3 novos templates de e-mail                │
│  Vercel Crons — 1 nova entrada no vercel.json        │
└─────────────────────────────────────────────────────┘
```

(*) tabelas existentes com novas colunas via migration.

---

## Implementation Design

### Core Interfaces

```typescript
// Retorno do GET /api/alerts
interface AlertsResponse {
  approved: QuoteAlert[];   // aceitos nas últimas 48h
  followup: QuoteAlert[];   // sent_at + followup_days <= now
  expiring: QuoteAlert[];   // vence em <= 3 dias
}

interface QuoteAlert {
  quote_id: string;
  quote_number: number;
  customer_name: string | null;
  action_url: string;        // /orcamentos/[id]
  expires_at?: string;       // ISO 8601, só para expiring
}

// Retorno do GET /o/[token] (Server Component props)
interface ApprovalPageData {
  quote_number: number;
  business_name: string;
  logo_url: string | null;
  phone: string | null;
  customer_name: string | null;
  validity_date: string;
  versions: ApprovalVersion[];
  is_expired: boolean;
  is_accepted: boolean;
}

interface ApprovalVersion {
  name: string;
  rooms: { name: string; total: number }[];
  total: number;
}

// Retorno do GET /api/dashboard/conversion
interface ConversionMetrics {
  sent: number;
  approved: number;
  conversion_rate: number;    // 0-100
  avg_ticket: number;
  total_approved: number;
  period_start: string;
  period_end: string;
}

// lib/catalog/regional-defaults.ts
type RegionalItem = {
  name: string;
  type: 'material' | 'service';
  unit: string;
  unit_price: number;
};
```

### Data Models

#### Migrations — novas colunas em tabelas existentes

**Migration 011 — quotes: campos de aprovação e rastreamento**
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

**Migration 012 — profiles: novos campos de configuração**
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS followup_days              int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS price_alert_days           int NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS sheet_waste_pct            numeric(4,2) NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS whatsapp_message_template  text;
```

**Migration 013 — catalog_items: rastreamento de atualização de preço**
```sql
ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS price_updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill: marcar todos os itens existentes com a data de criação
UPDATE catalog_items SET price_updated_at = created_at WHERE price_updated_at IS NULL;

CREATE INDEX IF NOT EXISTS catalog_items_price_updated_idx
  ON catalog_items (user_id, price_updated_at);
```

**Migration 014 — nova tabela quote_room_photos**
```sql
CREATE TABLE quote_room_photos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   uuid NOT NULL REFERENCES quote_rooms(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  position  int NOT NULL DEFAULT 0
);

CREATE INDEX ON quote_room_photos(room_id);

ALTER TABLE quote_room_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_room_photos" ON quote_room_photos
  USING (
    EXISTS (
      SELECT 1 FROM quote_rooms qr
      JOIN quote_versions qv ON qv.id = qr.version_id
      JOIN quotes q ON q.id = qv.quote_id
      WHERE qr.id = room_id AND q.user_id = auth.uid()
    )
  );
```

**Migration 015 — bucket quote-photos**
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-photos', 'quote-photos', false)
  ON CONFLICT DO NOTHING;

-- Upload: apenas dono da room pode fazer upload (validado no Route Handler via service client)
-- Download: URL assinada gerada server-side
```

### API Endpoints

#### Endpoints novos

**`GET /api/alerts`**
- Auth: cookie de sessão (usuário autenticado)
- Retorna: `AlertsResponse` com três arrays de alertas computados
- Queries: três SELECTs paralelos na tabela `quotes` com filtros de estado
- Resposta 200 + JSON; 401 se não autenticado

**`GET /o/[token]`** *(Server Component, sem auth)*
- Parâmetro: `token` na URL (UUIDv4)
- Busca quote via `approval_token` com service client (ignora RLS)
- Retorna: `ApprovalPageData` ou renderiza estado de erro (expirado/inválido)
- Sem cookies, sem headers de auth

**`POST /api/quotes/[id]/approve`**
- Auth: nenhuma (validação por token no body)
- Body: `{ token: string }`
- Valida `approval_token` + `approval_token_expires_at > now()` + `status NOT IN ('accepted','cancelled')`
- Em caso de sucesso: UPDATE `status = 'accepted'`; envia e-mail ao marceneiro via Resend
- Resposta 200 `{ success: true }`; 404 token inválido; 409 já aprovado/expirado

**`GET /api/dashboard/conversion`**
- Auth: cookie de sessão
- Query params: `period` (`1m`|`3m`|`6m`|`custom`), `from`, `to`
- Retorna: `ConversionMetrics`
- Usa aggregate SQL: `COUNT(*) FILTER (WHERE status = 'sent' OR ...)` sobre `quotes` + `quote_versions`

**`GET /api/catalog/regional-suggestions?state=[UF]`**
- Auth: cookie de sessão (assinatura não obrigatória — disponível em trial)
- Valida UF (array de 27 UFs válidas)
- Tenta fonte externa (a definir); em fallback retorna `REGIONAL_DEFAULTS[uf]`
- Resposta 200 + array de `RegionalItem`; 400 se UF inválida

**`POST /api/catalog/import-suggestions`**
- Auth: cookie de sessão + assinatura ativa (não read_only)
- Body: `{ state: string, item_ids: string[] }` — IDs dos itens selecionados da sugestão regional
- Busca itens do `REGIONAL_DEFAULTS[state]` pelos índices informados, insere em `catalog_items` com `user_id` do usuário
- Resposta 201 `{ created: number }`

**`POST /api/cron/daily-notifications`**
- Auth: `Authorization: Bearer ${CRON_SECRET}` (sem sessão de usuário)
- Processa sequencialmente: (1) follow-ups elegíveis, (2) vencimentos elegíveis
- Retorna `{ followup: { sent, errors }, expiry: { sent, errors } }`

#### Endpoints modificados

**`PATCH /api/quotes/[id]`** *(estendido)*
- Quando `status === 'sent'` e `approval_token IS NULL`: gera UUID, calcula `approval_token_expires_at`, persiste e retorna `{ approval_link: string }` no response
- Quando `status === 'sent'` e token já existe: reutiliza token existente, retorna o link atual
- Quando `validity_days` é atualizado: regenera token e atualiza `approval_token_expires_at`

**`GET /api/quotes/[id]`** *(estendido)*
- Inclui `approval_token`, `approval_link`, `sent_at` no response quando `status = 'sent'` ou `'accepted'`

**`PATCH /api/profile`** *(estendido)*
- Aceita novos campos: `followup_days`, `price_alert_days`, `sheet_waste_pct`, `whatsapp_message_template`
- Valida: `followup_days IN (3,5,7)`, `price_alert_days IN (30,60,90)`, `sheet_waste_pct BETWEEN 0 AND 50`

**`POST /api/quotes/[id]/pdf`** *(estendido)*
- No modo `detailed`, consulta `quote_room_photos` por `room_id` e inclui imagens no HTML do Puppeteer via `<img src="[signed_url]">` com URLs assinadas (válidas por 1h — tempo suficiente para a renderização)

**`POST /api/catalog/[id]/image` → upload de foto de ambiente** *(adaptado)*
- Novo endpoint **`POST /api/quotes/[id]/versions/[vid]/rooms/[rid]/photos`**:
  - Valida tipo (`image/jpeg`, `image/png`, `image/webp`) e tamanho (≤ 5MB)
  - Upload para `quote-photos/{user_id}/{room_id}/{uuid}.{ext}` via service client
  - Insere em `quote_room_photos`
  - Retorna `{ photo_id, image_url (assinada) }`

**`DELETE /api/quotes/[id]/versions/[vid]/rooms/[rid]/photos/[pid]`** *(novo)*
- Remove de `quote_room_photos` e do bucket Storage

---

## Integration Points

### Resend (e-mail)

Três novos templates em `lib/email/templates/`:

| Arquivo | Assunto | Gatilho |
|---|---|---|
| `quote-approved.ts` | `"✅ [Cliente] aprovou o orçamento #[N]"` | `POST /api/quotes/[id]/approve` |
| `quote-followup.ts` | `"Lembrete: orçamento #[N] ainda aguarda resposta de [Cliente]"` | cron daily-notifications |
| `quote-expiring.ts` | `"Orçamento #[N] vence em 3 dias — renove ou feche"` | cron daily-notifications |

Cada template segue a interface existente: `buildXxxHtml(data): string` + `sendXxx(to, data): Promise<SendResult>`.

Remetente: `Orça Fácil <noreply@orcafacil.com.br>` (já configurado no domínio Resend).

### Vercel Crons

Nova entrada no `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/trial-reminder",        "schedule": "0 12 * * *" },
    { "path": "/api/cron/daily-notifications",   "schedule": "0 9 * * *"  }
  ]
}
```

Variável `CRON_SECRET` já existe no ambiente — reutilizada.

---

## Impact Analysis

| Componente | Tipo de Impacto | Descrição e Risco | Ação Necessária |
|---|---|---|---|
| `quotes` (tabela) | Modificado | +5 novas colunas; índices novos. Risco baixo — ALTER ADD COLUMN é não-bloqueante no Postgres moderno. | Migration 011 |
| `profiles` (tabela) | Modificado | +4 colunas com DEFAULT. Sem impacto em leitura existente. | Migration 012 |
| `catalog_items` (tabela) | Modificado | +1 coluna com backfill. Backfill instantâneo para volume atual. | Migration 013 |
| `quote_room_photos` | Novo | Nova tabela + RLS. Sem impacto em código existente. | Migration 014 |
| `quote-photos` (bucket) | Novo | Novo bucket privado Storage. | Migration 015 |
| `PATCH /api/quotes/[id]` | Modificado | Comportamento condicional ao `status='sent'`. Risco baixo — adição aditiva ao handler existente. | Estender handler |
| `GET /api/quotes/[id]` | Modificado | Novos campos no response (`approval_link`, `sent_at`). Breaking somente se frontend fizer strict type check. | Estender response |
| `POST /api/quotes/[id]/pdf` | Modificado | Consulta `quote_room_photos` + URLs assinadas por ambiente. Risco de timeout se muitas fotos grandes. | Estender PDF template |
| `PATCH /api/profile` | Modificado | Aceita e persiste 4 novos campos. Sem risco em campos existentes. | Estender handler |
| `vercel.json` | Modificado | Nova entrada de cron. Sem risco. | Adicionar entrada |
| `app/(app)/layout.tsx` | Modificado | Adicionar fetch de `/api/alerts` para exibir badge/banner. Risco: latência — usar Suspense ou cache de 60s. | Estender layout |
| `components/wizard/step-send.tsx` | Modificado | Exibir link de aprovação + modal de mensagem WhatsApp. | Refatorar step 4 |
| `components/wizard/step-rooms.tsx` | Modificado | Adicionar upload de fotos + calculadora de chapas. | Estender step 2 |
| `app/(app)/configuracoes/page.tsx` | Modificado | Novas seções de configuração (follow-up, alerta, perda, WhatsApp). | Estender página |
| `app/(app)/catalogo/page.tsx` | Modificado | Badge de alerta de preço por item. | Estender listagem |
| `app/o/[token]/` | Novo | Route group público sem auth. | Criar route group |
| `app/(app)/desempenho/` | Novo | Dashboard de conversão. | Criar página |
| `lib/email/templates/` | Novo (3 arquivos) | Templates de e-mail para aprovação, follow-up e vencimento. | Criar templates |
| `lib/catalog/regional-defaults.ts` | Novo | JSON estático de fallback regional. | Criar arquivo |

---

## Testing Approach

### Unit Tests

- **Calculadora de chapas**: função pura `calculateSheets(areaSqm, wastePct)` — testar casos de borda (0m², 1m², área exata de uma chapa, frações).
- **Computed alerts**: função `buildAlerts(quotes, followupDays)` — testar orçamentos em cada estado (aprovado hoje, follow-up vencido, expirando em 2 dias).
- **Token generation logic**: testar que PATCH com `status='sent'` gera token e que segunda chamada reutiliza.
- **Regional defaults**: testar que `REGIONAL_DEFAULTS` tem ao menos 1 item para cada UF e que unit_price > 0.
- **Email templates**: testar que `buildQuoteApprovedHtml(data)` retorna string com campos preenchidos.

### Integration Tests

- **Fluxo de aprovação end-to-end**: POST `/api/quotes/[id]/approve` com token válido → status='accepted' + e-mail disparado.
- **Cron daily-notifications**: mockar Resend e Supabase; verificar que `followup_notified_at` e `expiry_notified_at` são marcados após envio.
- **Upload de foto + geração de PDF**: upload para `quote-photos/`, referência em `quote_room_photos`, PDF gerado com `<img>` renderizado.
- **Import de catálogo regional**: POST `/api/catalog/import-suggestions` → itens inseridos em `catalog_items` com `user_id` correto.

---

## Development Sequencing

### Build Order

1. **Migrations 011–015** — sem dependências. Pré-requisito de tudo.
2. **`lib/catalog/regional-defaults.ts`** — depende de nada. JSON estático isolado.
3. **Templates de e-mail** (`quote-approved`, `quote-followup`, `quote-expiring`) — dependem somente de Resend já configurado (passo 1 no sentido de infra, mas zero de código).
4. **PATCH /api/quotes/[id] — token generation** — depende de migration 011 (passo 1).
5. **GET /o/[token] + POST /api/quotes/[id]/approve** — dependem do passo 4 (token no banco) e passo 3 (template de e-mail de aprovação).
6. **GET /api/alerts** — depende de migration 011 (passo 1) para `sent_at`.
7. **`app/(app)/layout.tsx` — badge de alertas** — depende do passo 6.
8. **`components/wizard/step-send.tsx` — modal WhatsApp + link de aprovação** — depende do passo 4 (PATCH retornando `approval_link`).
9. **`components/wizard/step-rooms.tsx` — calculadora de chapas** — depende de migration 012 (passo 1, `sheet_waste_pct`); calculadora em si é client-side pura.
10. **Upload de foto de ambiente** (`POST /api/.../rooms/[rid]/photos`) — depende de migrations 014+015 (passo 1).
11. **PDF com fotos** (estender `POST /api/quotes/[id]/pdf`) — depende do passo 10.
12. **`app/(app)/configuracoes/page.tsx` — novos campos** — depende de migration 012 (passo 1) e PATCH /api/profile estendido.
13. **Alerta de preços desatualizados** (badge no catálogo + wizard) — depende de migration 013 (passo 1, `price_updated_at`).
14. **`app/(app)/desempenho/` — dashboard de conversão** — depende de migration 011 (passo 1, `sent_at`).
15. **GET /api/dashboard/conversion** — depende do passo 14 (rota que o usa).
16. **GET /api/catalog/regional-suggestions + POST /api/catalog/import-suggestions** — dependem do passo 2 (`regional-defaults.ts`).
17. **POST /api/cron/daily-notifications** — depende dos passos 3 (templates), 4 (campos no banco).
18. **`vercel.json` — nova entrada de cron** — depende do passo 17.
19. **Onboarding de catálogo regional** (tela pós-cadastro) — depende do passo 16.

### Technical Dependencies

- **Migrations**: devem rodar antes de qualquer deploy de código que use as novas colunas. Usar migração direta via `supabase db push` ou painel do Supabase.
- **Bucket `quote-photos`**: criado via migration SQL (INSERT em `storage.buckets`); sem ação manual no painel.
- **RESEND_API_KEY**: já existe no ambiente — nenhum segredo novo necessário.
- **CRON_SECRET**: já existe no ambiente — nenhum segredo novo necessário.
- **NEXT_PUBLIC_APP_URL**: já existe — usado na construção do `approval_link`.

---

## Monitoring and Observability

### Métricas a acompanhar

- Taxa de links de aprovação gerados por dia (via `quotes` com `approval_token IS NOT NULL`).
- Taxa de aprovações via link (via `quotes` com `status = 'accepted'` e `approval_token IS NOT NULL`).
- Erros do cron `daily-notifications` — monitorar resposta JSON `{ followup.errors, expiry.errors }` nos logs da Vercel.
- Timeout do Puppeteer no PDF com fotos — log de duração em `POST /api/quotes/[id]/pdf`.

### Logs estruturados

Padrão existente de `console.log` com prefixo `[handler/name]`:
- `[cron/daily-notifications] followup sent: N, errors: M`
- `[cron/daily-notifications] expiry sent: N, errors: M`
- `[quotes/approve] token accepted: { quote_id, user_id }`
- `[quotes/approve] token invalid or expired: { token_prefix }`

### Alertas

- Vercel Functions timeout > 10s em `/api/quotes/[id]/pdf`: investigar tamanho das fotos.
- Resend bounce rate > 5%: revisar domínio e templates.

---

## Technical Considerations

### Known Risks

**Timeout do Puppeteer com fotos**
- Risco: cada foto adicionada ao HTML aumenta o tempo de renderização. 3 fotos × 5MB pode ultrapassar os 10s de timeout Vercel Hobby.
- Mitigação: redimensionar imagens no upload (client-side via Canvas API antes do envio) para máximo 1200px × 800px antes de enviar ao servidor; limitar a 3 fotos por ambiente e 5MB por foto conforme PRD.

**Race condition no approval_token**
- Risco: dois cliques simultâneos em "Aprovar" chamam `POST /api/quotes/[id]/approve` ao mesmo tempo.
- Mitigação: usar `UPDATE quotes SET status = 'accepted' WHERE id = $1 AND status = 'sent' AND approval_token = $2` — UPDATE atômico; só um dos dois commits vence. O segundo recebe 409.

**Foto acessível sem auth via URL assinada**
- Risco: URL assinada com validade longa poderia ser compartilhada inadvertidamente.
- Mitigação: URLs de fotos geradas server-side com expiração de 1h (só para uso no Puppeteer). Fotos não são expostas diretamente ao frontend em URL permanente.

**Dashboard de conversão com volume zero**
- Risco: marceneiro com < 5 orçamentos vê métricas pouco representativas.
- Mitigação: exibir mensagem contextual "Volume insuficiente para análise" quando `sent < 5`, sem suprimir os dados — o marceneiro ainda vê os números absolutos.

---

## Architecture Decision Records

- [ADR-001: Modelo de interação no link de aprovação — Aprovação simples](adrs/adr-001.md) — Clique único (Aprovar / Tenho dúvidas), sem entrada de texto nem seleção de versão no link.
- [ADR-002: Alertas in-app como computed queries](adrs/adr-002.md) — Alertas derivados do estado dos orçamentos em tempo real; sem tabela `notifications`.
- [ADR-003: Cron de notificações diárias unificado](adrs/adr-003.md) — Um endpoint `/api/cron/daily-notifications` processa follow-up e vencimento sequencialmente.
- [ADR-004: Geração do approval_token no PATCH de status 'sent'](adrs/adr-004.md) — Token gerado automaticamente ao mudar status para 'sent', reutilizado em re-envios.
- [ADR-005: Fallback do catálogo regional como JSON estático](adrs/adr-005.md) — Dados de referência regional em `lib/catalog/regional-defaults.ts`, atualizados via deploy.
