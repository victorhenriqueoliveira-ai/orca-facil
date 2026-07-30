---
status: completed
title: "Approval token: PATCH e GET de orçamento estendidos"
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 04: Approval token: PATCH e GET de orçamento estendidos

## Overview

Estende os handlers `PATCH /api/quotes/[id]` e `GET /api/quotes/[id]` para gerar, persistir e retornar o `approval_token` quando o status muda para `'sent'`. Esta é a peça central que conecta o fluxo do marceneiro (enviar orçamento) com o link de aprovação para o cliente.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE gerar `approval_token` (UUID v4 via `crypto.randomUUID()`) no PATCH quando `status === 'sent'` e `approval_token IS NULL`.
- DEVE calcular `approval_token_expires_at` como `created_at + validity_days` do orçamento.
- DEVE persistir `sent_at = now()` junto com o token no mesmo UPDATE.
- DEVE reusar o token existente (não sobrescrever) em chamadas PATCH subsequentes com `status = 'sent'` quando token já existir.
- DEVE retornar `approval_link` (URL completa: `${NEXT_PUBLIC_APP_URL}/o/${token}`) no response do PATCH quando token for gerado ou já existir.
- DEVE incluir `approval_token`, `approval_link` e `sent_at` no response do `GET /api/quotes/[id]` quando `status IN ('sent', 'accepted')`.
- NÃO DEVE gerar token quando status for diferente de `'sent'`.
- O UPDATE de token DEVE usar `WHERE approval_token IS NULL` para prevenir race condition.
</requirements>

## Subtasks

- [x] 4.1 Estender o PATCH handler: detectar `status === 'sent'`, gerar UUID, calcular expiração, persistir com `WHERE approval_token IS NULL`
- [x] 4.2 Estender o response do PATCH para incluir `approval_link` quando status for `'sent'`
- [x] 4.3 Estender o SELECT do GET handler para incluir `approval_token`, `approval_token_expires_at`, `sent_at`
- [x] 4.4 Construir e retornar `approval_link` no response do GET quando status for `'sent'` ou `'accepted'`
- [x] 4.5 Adicionar testes unitários e de integração para os dois handlers modificados

## Implementation Details

Veja a seção "API Endpoints — Endpoints modificados" e "ADR-004 — Notas de Implementação" do TechSpec para o padrão exato de UPDATE atômico.

A lógica de geração do link é: `const approvalLink = \`${process.env.NEXT_PUBLIC_APP_URL}/o/${token}\``. A variável `NEXT_PUBLIC_APP_URL` já existe no ambiente.

Evitar buscar o `validity_days` em query separada: o PATCH já recebe o `quoteId` e pode fazer `SELECT validity_days, created_at` inline antes do UPDATE de token.

### Relevant Files

- `app/api/quotes/[id]/route.ts` — arquivo principal a modificar (PATCH e GET)
- `supabase/migrations/011_approval_token.sql` (task_01) — colunas `approval_token`, `approval_token_expires_at`, `sent_at` devem existir

### Dependent Files

- `app/o/[token]/page.tsx` (task_05) — consome o token gerado aqui
- `app/api/quotes/[id]/approve/route.ts` (task_05) — valida o token gerado aqui
- `components/wizard/step-send.tsx` (task_10) — exibe o `approval_link` retornado pelo PATCH

### Related ADRs

- [ADR-004: Geração do approval_token no PATCH de status 'sent'](adrs/adr-004.md) — justifica a integração no PATCH existente

## Deliverables

- `app/api/quotes/[id]/route.ts` modificado (PATCH + GET)
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para o fluxo de geração de token **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] PATCH com `{ status: 'sent' }` em orçamento sem token gera `approval_token` UUID e retorna `approval_link` no response
  - [ ] PATCH com `{ status: 'sent' }` em orçamento que já tem token NÃO sobrescreve o token e retorna o link existente
  - [ ] PATCH com `{ status: 'draft' }` (ou outro status) não gera token
  - [ ] PATCH com `{ status: 'sent' }` persiste `sent_at` com timestamp correto
  - [ ] GET de orçamento com `status = 'sent'` inclui `approval_link` no response
  - [ ] GET de orçamento com `status = 'accepted'` inclui `approval_link` no response
  - [ ] GET de orçamento com `status = 'draft'` NÃO inclui `approval_link` no response
  - [ ] `approval_token_expires_at` é calculado como `created_at + validity_days` do orçamento
- Testes de integração:
  - [ ] PATCH com `status='sent'` → GET do mesmo orçamento retorna `approval_token` e `approval_link` consistentes
  - [ ] Dois PATCHes consecutivos com `status='sent'` retornam o mesmo `approval_link`
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- `approval_token` único gerado por orçamento ao primeiro PATCH com `status='sent'`
- `approval_link` retornado no response de PATCH e GET
- Token não sobrescrito em PATCHes subsequentes
