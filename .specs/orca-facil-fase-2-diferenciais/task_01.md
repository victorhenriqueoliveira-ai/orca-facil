---
status: completed
title: "Migrations 011–015: schema da Fase 2"
type: infra
complexity: low
dependencies: []
---

# Task 01: Migrations 011–015: schema da Fase 2

## Overview

Cria as cinco migrations SQL que adicionam todas as colunas, tabelas, índices e bucket de storage necessários para a Fase 2. Sem essa tarefa nenhuma outra task pode ser iniciada — é o pré-requisito absoluto de toda a implementação.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar migration 011 adicionando em `quotes`: `approval_token uuid UNIQUE`, `approval_token_expires_at timestamptz`, `sent_at timestamptz`, `followup_notified_at timestamptz`, `expiry_notified_at timestamptz` e dois índices (`approval_token`, `(user_id, status, sent_at)`).
- DEVE criar migration 012 adicionando em `profiles`: `followup_days int DEFAULT 5`, `price_alert_days int DEFAULT 60`, `sheet_waste_pct numeric(4,2) DEFAULT 15`, `whatsapp_message_template text`.
- DEVE criar migration 013 adicionando em `catalog_items`: `price_updated_at timestamptz DEFAULT now()` com backfill (`UPDATE catalog_items SET price_updated_at = created_at`) e índice em `(user_id, price_updated_at)`.
- DEVE criar migration 014 com a tabela `quote_room_photos` (id, room_id FK, image_url, position), RLS com política `own_room_photos` e índice em `room_id`.
- DEVE criar migration 015 inserindo o bucket `quote-photos` em `storage.buckets` com `public = false`.
- DEVE seguir a convenção de nomenclatura existente: `NNN_nome_descritivo.sql`.
- DEVE usar `IF NOT EXISTS` em todos os `ALTER TABLE ADD COLUMN` e `CREATE INDEX` para ser reentrante.
</requirements>

## Subtasks

- [x] 1.1 Criar `supabase/migrations/011_approval_token.sql` com colunas e índices em `quotes`
- [x] 1.2 Criar `supabase/migrations/012_profile_fase2_settings.sql` com novos campos em `profiles`
- [x] 1.3 Criar `supabase/migrations/013_catalog_price_tracking.sql` com `price_updated_at` e backfill
- [x] 1.4 Criar `supabase/migrations/014_quote_room_photos.sql` com tabela e RLS
- [x] 1.5 Criar `supabase/migrations/015_quote_photos_bucket.sql` com INSERT em `storage.buckets`
- [x] 1.6 Testes estruturais (43 casos) validam todos os artefatos — aplicação real requer `supabase db push` em ambiente com instância ativa

## Implementation Details

Veja a seção "Data Models — Migrations" do TechSpec para o SQL exato de cada migration. Seguir o padrão das migrations existentes em `supabase/migrations/`.

A política RLS de `quote_room_photos` segue o mesmo padrão encadeado de `quote_items` (join quote_rooms → quote_versions → quotes com `q.user_id = auth.uid()`).

### Relevant Files

- `supabase/migrations/001_initial_schema.sql` — referência de padrão de migration existente
- `supabase/migrations/009_quote_items_image.sql` — exemplo de migration recente
- `supabase/config.toml` — configuração do Supabase local

### Dependent Files

- Todas as demais tasks dependem desta — as colunas novas devem existir antes de qualquer código que as referencie.

### Related ADRs

- [ADR-002: Alertas in-app como computed queries](adrs/adr-002.md) — explica por que `sent_at`, `followup_notified_at` e `expiry_notified_at` ficam em `quotes`
- [ADR-004: Geração do approval_token no PATCH de status 'sent'](adrs/adr-004.md) — explica o índice único em `approval_token`

## Deliverables

- 5 arquivos de migration em `supabase/migrations/` aplicáveis sem erro no ambiente local
- Schema aplicado com `supabase db push` ou equivalente sem erros
- Testes de schema (verificação estrutural) com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `quotes` tem colunas `approval_token`, `approval_token_expires_at`, `sent_at`, `followup_notified_at`, `expiry_notified_at` após migration 011
  - [ ] `approval_token` tem constraint UNIQUE em `quotes`
  - [ ] `profiles` tem colunas `followup_days` (default 5), `price_alert_days` (default 60), `sheet_waste_pct` (default 15), `whatsapp_message_template` após migration 012
  - [ ] `catalog_items` tem coluna `price_updated_at` e registros existentes têm `price_updated_at = created_at` após backfill (migration 013)
  - [ ] Tabela `quote_room_photos` existe com colunas corretas e RLS ativado após migration 014
  - [ ] INSERT em `quote_room_photos` com `user_id` diferente do dono da room é bloqueado pela policy RLS
  - [ ] Bucket `quote-photos` existe em `storage.buckets` com `public = false` após migration 015
- Testes de integração:
  - [ ] `supabase db push` aplica todas as 5 migrations em sequência sem erro em banco limpo
  - [ ] Re-execução das migrations (reentrância via `IF NOT EXISTS`) não gera erro
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- `supabase db push` termina sem erro em banco de desenvolvimento
- Todas as 5 migrations têm número sequencial correto e não conflitam com as existentes (001–010)
