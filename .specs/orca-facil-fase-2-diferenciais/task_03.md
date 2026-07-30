---
status: completed
title: "Templates de e-mail: aprovação, follow-up e vencimento"
type: backend
complexity: medium
dependencies: []
---

# Task 03: Templates de e-mail: aprovação, follow-up e vencimento

## Overview

Cria três novos templates de e-mail HTML e suas funções de envio correspondentes, seguindo o padrão estabelecido pelo template `trial-reminder`. Esses templates são consumidos pelo endpoint de aprovação (task_05) e pelo cron de notificações (task_14).

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `lib/email/templates/quote-approved.ts` com função `buildQuoteApprovedHtml(data)` e `sendQuoteApproved(to, data)`.
- DEVE criar `lib/email/templates/quote-followup.ts` com função `buildQuoteFollowupHtml(data)` e `sendQuoteFollowup(to, data)`.
- DEVE criar `lib/email/templates/quote-expiring.ts` com função `buildQuoteExpiringHtml(data)` e `sendQuoteExpiring(to, data)`.
- DEVE estender `lib/email/resend.ts` exportando as três novas funções de envio.
- DEVE usar o mesmo padrão de retorno `{ success: boolean; id?: string; error?: string }` de `sendTrialReminder`.
- DEVE usar remetente `Orça Fácil <noreply@orcafacil.com.br>` em todos os templates.
- DEVE usar CSS inline (sem classes Tailwind, sem CDN) para compatibilidade com clientes de e-mail.
- Os assuntos DEVEM estar de acordo com a seção "Integration Points — Resend" do TechSpec.
</requirements>

## Subtasks

- [x] 3.1 Criar `lib/email/templates/quote-approved.ts` com dados `{ quote_number, customer_name, business_name, quote_url }`
- [x] 3.2 Criar `lib/email/templates/quote-followup.ts` com dados `{ quote_number, customer_name, business_name, quote_url, followup_days }`
- [x] 3.3 Criar `lib/email/templates/quote-expiring.ts` com dados `{ quote_number, customer_name, business_name, quote_url, expires_at }`
- [x] 3.4 Exportar as três funções de envio de `lib/email/resend.ts`
- [x] 3.5 Adicionar testes unitários para os três templates

## Implementation Details

Veja as seções "Integration Points — Resend" e "Testing Approach — Unit Tests" do TechSpec. Seguir o padrão de `lib/email/templates/trial-reminder.ts` que já existe: interface de dados, função `buildXxxHtml` exportada, HTML com CSS inline.

Cada template deve ter: saudação com nome da marcenaria, informação central (aprovação/follow-up/vencimento) com destaque visual, link de ação (botão CTA com `quote_url`), rodapé com identidade Orça Fácil.

### Relevant Files

- `lib/email/templates/trial-reminder.ts` — padrão exato a seguir
- `lib/email/resend.ts` — onde adicionar as novas funções `sendXxx`
- `__tests__/lib/email/templates/trial-reminder.test.ts` — padrão de teste a replicar

### Dependent Files

- `app/api/quotes/[id]/approve/route.ts` (task_05) — usa `sendQuoteApproved`
- `app/api/cron/daily-notifications/route.ts` (task_14) — usa `sendQuoteFollowup` e `sendQuoteExpiring`

### Related ADRs

- [ADR-003: Cron de notificações diárias unificado](adrs/adr-003.md) — descreve os três tipos de e-mail necessários

## Deliverables

- `lib/email/templates/quote-approved.ts`
- `lib/email/templates/quote-followup.ts`
- `lib/email/templates/quote-expiring.ts`
- `lib/email/resend.ts` atualizado com três novas exportações
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `buildQuoteApprovedHtml({ quote_number: 42, customer_name: 'João', business_name: 'Marcenaria X', quote_url: 'https://...' })` retorna string HTML contendo `'42'`, `'João'` e `'Marcenaria X'`
  - [ ] `buildQuoteFollowupHtml` com `followup_days: 5` inclui `'5'` no HTML retornado
  - [ ] `buildQuoteExpiringHtml` com `expires_at: '2026-08-25'` inclui a data formatada no HTML
  - [ ] Cada template retorna string HTML não vazia (length > 100)
  - [ ] `sendQuoteApproved('test@example.com', data)` com `RESEND_API_KEY` ausente retorna `{ success: false, error: ... }` sem lançar exceção
- Testes de integração:
  - [ ] `sendQuoteApproved` com Resend mockado retorna `{ success: true, id: '...' }` ao simular resposta bem-sucedida da API
  - [ ] `sendQuoteFollowup` com Resend mockado retorna `{ success: false, error: ... }` ao simular erro da API
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Os três templates geram HTML válido com todos os campos interpolados
- `lib/email/resend.ts` exporta as três novas funções sem quebrar as exportações existentes
