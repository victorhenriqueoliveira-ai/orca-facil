---
status: completed
title: "GET /api/alerts + badge de alertas in-app no layout"
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 06: GET /api/alerts + badge de alertas in-app no layout

## Overview

Implementa o endpoint `GET /api/alerts` que computa, via query direta ao banco, três categorias de alertas (orçamentos aprovados, aguardando follow-up e prestes a vencer) e exibe um badge com o total no layout do produto. Sem tabela nova — os alertas são derivados do estado dos orçamentos conforme ADR-002.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `app/api/alerts/route.ts` com handler `GET` autenticado (cookie client, `getUser()`).
- DEVE retornar JSON no formato `AlertsResponse` conforme definido no TechSpec (campos `approved`, `followup`, `expiring`).
- A categoria `approved` DEVE listar orçamentos onde `status = 'accepted'` e que foram aprovados nas últimas 24h (a definir: campo sentinela ou data de aceitação — consultar TechSpec).
- A categoria `followup` DEVE listar orçamentos onde `status = 'sent'` e `sent_at < now() - followup_days * interval '1 day'` e `followup_notified_at IS NULL`.
- A categoria `expiring` DEVE listar orçamentos onde `status = 'sent'` e `approval_token_expires_at BETWEEN now() AND now() + interval '3 days'` e `expiry_notified_at IS NULL`.
- DEVE incluir `quote_id`, `quote_number`, `customer_name`, `action_url` e `expires_at` (quando aplicável) em cada item.
- DEVE ler `followup_days` do perfil do usuário autenticado (campo adicionado na migration 012).
- DEVE adicionar badge numérico no layout `app/(app)/layout.tsx` consumindo esse endpoint via fetch no lado do servidor.
- O badge DEVE exibir o total de alertas `(approved.length + followup.length + expiring.length)`.
- O badge DEVE ser omitido quando o total for zero.
</requirements>

## Subtasks

- [x] 6.1 Criar `app/api/alerts/route.ts` com as três queries computadas
- [x] 6.2 Tipar o response com `AlertsResponse` e `QuoteAlert` conforme TechSpec
- [x] 6.3 Integrar leitura do `followup_days` do perfil do usuário na query de follow-up
- [x] 6.4 Adicionar badge de alertas ao layout `app/(app)/layout.tsx`
- [x] 6.5 Adicionar testes unitários para as três categorias de alerta

## Implementation Details

Veja as seções "Core Interfaces" e "API Endpoints — Endpoints novos" do TechSpec para os contratos exatos de `AlertsResponse` e `QuoteAlert`.

As três queries são independentes e podem ser executadas em paralelo com `Promise.all`. O `followup_days` é lido do perfil do usuário na mesma chamada que busca os alertas de follow-up.

O badge no layout é um Server Component que faz `fetch('/api/alerts', { cache: 'no-store' })` — sem state no cliente. Se o fetch falhar, omite o badge silenciosamente (não quebra o layout).

### Relevant Files

- `app/(app)/layout.tsx` — layout a modificar para adicionar o badge
- `app/api/quotes/route.ts` — padrão de query com cookie client e `getUser()`
- `app/api/profile/route.ts` — padrão de leitura de campos do perfil

### Dependent Files

- `app/(app)/layout.tsx` — DEVE ser atualizado com o badge
- `app/api/cron/daily-notifications/route.ts` (task_14) — usa as mesmas condições de follow-up e expiry para disparar e-mails

### Related ADRs

- [ADR-002: Alertas in-app como computed queries (sem tabela nova)](adrs/adr-002.md) — fundamenta a abordagem de query direta

## Deliverables

- `app/api/alerts/route.ts`
- `app/(app)/layout.tsx` atualizado com badge
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `GET /api/alerts` sem sessão retorna 401
  - [ ] `GET /api/alerts` com usuário sem orçamentos retorna `{ approved: [], followup: [], expiring: [] }`
  - [ ] `GET /api/alerts` com orçamento `status='sent'` e `sent_at` há mais de `followup_days` dias retorna o orçamento na categoria `followup`
  - [ ] `GET /api/alerts` com orçamento `status='sent'` e `approval_token_expires_at` em 2 dias retorna na categoria `expiring`
  - [ ] `GET /api/alerts` com orçamento `status='accepted'` e aprovado hoje retorna na categoria `approved`
  - [ ] Orçamento com `followup_notified_at IS NOT NULL` NÃO aparece na categoria `followup`
  - [ ] Orçamento com `expiry_notified_at IS NOT NULL` NÃO aparece na categoria `expiring`
  - [ ] Response inclui `quote_id`, `quote_number`, `customer_name` e `action_url` em cada item
- Testes de integração:
  - [ ] Badge no layout exibe número correto somando as três categorias
  - [ ] Badge é omitido quando todas as categorias retornam arrays vazios
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Endpoint retorna as três categorias com dados corretos
- Badge aparece no layout com total correto quando há alertas
- Badge omitido quando total é zero
