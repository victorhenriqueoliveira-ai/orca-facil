---
status: completed
title: "Cron de notificações diárias unificado"
type: backend
complexity: medium
dependencies:
  - task_01
  - task_03
---

# Task 14: Cron de notificações diárias unificado

## Overview

Cria o endpoint unificado `POST /api/cron/daily-notifications` que roda diariamente via Vercel Cron, identifica orçamentos que precisam de follow-up ou que estão prestes a vencer, envia os e-mails correspondentes e marca os campos sentinela para evitar reenvio.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `app/api/cron/daily-notifications/route.ts` seguindo o padrão de `app/api/cron/trial-reminder/route.ts`.
- DEVE validar `Authorization: Bearer ${CRON_SECRET}` antes de processar.
- DEVE buscar orçamentos de follow-up: `status='sent'`, `sent_at < now() - followup_days * interval '1 day'`, `followup_notified_at IS NULL` (join com `profiles` para ler `followup_days` por usuário).
- DEVE buscar orçamentos de vencimento: `status='sent'`, `approval_token_expires_at BETWEEN now() AND now() + interval '3 days'`, `expiry_notified_at IS NULL`.
- DEVE enviar `sendQuoteFollowup` para cada orçamento de follow-up (task_03).
- DEVE enviar `sendQuoteExpiring` para cada orçamento de vencimento (task_03).
- DEVE atualizar `followup_notified_at = now()` após envio bem-sucedido de follow-up (UPDATE individual por orçamento).
- DEVE atualizar `expiry_notified_at = now()` após envio bem-sucedido de vencimento.
- DEVE registrar em log (console.log) o número de e-mails enviados por tipo.
- DEVE adicionar o cron a `vercel.json` com schedule `"0 9 * * *"` (9h UTC diariamente).
- NÃO DEVE marcar `notified_at` quando o envio do e-mail falhar.
</requirements>

## Subtasks

- [x] 14.1 Criar `app/api/cron/daily-notifications/route.ts` com autenticação CRON_SECRET
- [x] 14.2 Implementar query de orçamentos de follow-up com join em profiles para `followup_days`
- [x] 14.3 Implementar query de orçamentos prestes a vencer
- [x] 14.4 Implementar loop de envio com update de campos sentinela após sucesso
- [x] 14.5 Adicionar entrada no `vercel.json` e testes unitários

## Implementation Details

Veja a seção "Integration Points — Vercel Cron" e "ADR-003 — Endpoint Unificado" do TechSpec para a estrutura exata do handler.

O padrão a seguir está em `app/api/cron/trial-reminder/route.ts`: verificação do header Authorization, uso do service client Supabase, loop sobre usuários/orçamentos, chamada de envio e update individual.

A query de follow-up precisa de JOIN em `profiles` para obter `followup_days` de cada marceneiro, pois o valor é por usuário. A condição usa comparação relativa: `sent_at < now() - (profiles.followup_days || 5) * interval '1 day'`.

### Relevant Files

- `app/api/cron/trial-reminder/route.ts` — padrão exato a seguir
- `vercel.json` — adicionar entrada do novo cron
- `lib/email/resend.ts` (task_03) — funções `sendQuoteFollowup` e `sendQuoteExpiring`
- `lib/supabase/service.ts` — service client para queries sem RLS

### Dependent Files

- `vercel.json` — DEVE ser atualizado com o novo cron schedule

### Related ADRs

- [ADR-003: Cron de notificações diárias unificado](adrs/adr-003.md) — justifica o endpoint único em vez de dois separados

## Deliverables

- `app/api/cron/daily-notifications/route.ts`
- `vercel.json` atualizado com novo cron
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `POST /api/cron/daily-notifications` sem header Authorization retorna 401
  - [x] `POST /api/cron/daily-notifications` com token incorreto retorna 401
  - [x] `POST /api/cron/daily-notifications` com token correto e sem orçamentos elegíveis retorna 200 com `{ followup: 0, expiring: 0 }`
  - [x] Orçamento com `followup_notified_at IS NOT NULL` NÃO recebe e-mail de follow-up
  - [x] Orçamento com `expiry_notified_at IS NOT NULL` NÃO recebe e-mail de vencimento
  - [x] Após envio bem-sucedido de follow-up, `followup_notified_at` é atualizado
  - [x] Após falha no envio de e-mail, `followup_notified_at` NÃO é atualizado
  - [x] Cron usa `followup_days` específico de cada perfil de usuário (não um valor global)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Cron configurado em `vercel.json` com schedule correto
- E-mails disparados apenas uma vez por orçamento (campos sentinela funcionando)
- `followup_days` respeitado por usuário (não global)
