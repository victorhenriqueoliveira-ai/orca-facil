---
status: completed
title: "Rota pública /o/[token] + endpoint POST /approve"
type: backend
complexity: high
dependencies:
  - task_01
  - task_03
  - task_04
---

# Task 05: Rota pública /o/[token] + endpoint POST /approve

## Overview

Cria a rota pública de aprovação de orçamento — a feature diferencial central da Fase 2. O cliente recebe um link, visualiza o orçamento no celular sem login e aprova com um clique. O marceneiro é notificado imediatamente por e-mail.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar o route group `app/o/` como grupo sem autenticação (sem middleware guard).
- DEVE criar `app/o/[token]/page.tsx` como Server Component que busca o orçamento pelo token usando service client (ignora RLS).
- A página DEVE exibir: logo da marcenaria (signed URL), nome da marcenaria, dados do cliente, ambientes com totais por versão, comparação de versões (quando múltiplas), prazo de validade, botão "Aprovar" e botão "Tenho dúvidas" (link `wa.me/...`).
- A página DEVE exibir estado "Orçamento já aprovado" (sem botão Aprovar) quando `status = 'accepted'`.
- A página DEVE exibir estado "Link expirado" quando `approval_token_expires_at < now()` ou orçamento com `status = 'cancelled'`.
- A página DEVE exibir estado "Link inválido" para token não encontrado (retornar 404 com mensagem amigável).
- DEVE exibir rodapé "Gerado com Orça Fácil" com link para a landing page.
- DEVE criar `app/api/quotes/[id]/approve/route.ts` como `POST` sem autenticação de sessão.
- O `POST /approve` DEVE validar: token presente no body, token coincide com `approval_token` do orçamento, `approval_token_expires_at > now()`, `status NOT IN ('accepted', 'cancelled', 'expired')`.
- Em caso de aprovação bem-sucedida: UPDATE `status = 'accepted'` e disparar `sendQuoteApproved` ao e-mail do marceneiro.
- POST DEVE retornar 200 `{ success: true }`, 404 para token inválido, 409 para orçamento já aprovado ou expirado.
- A página DEVE ser mobile-first (layout para telas 360px+).
</requirements>

## Subtasks

- [x] 5.1 Criar route group `app/o/` sem guards de autenticação; garantir que o middleware existente não redirecione essa rota para login
- [x] 5.2 Criar `app/o/[token]/page.tsx` com fetch do orçamento via token (service client) e renderização dos três estados (válido / aprovado / expirado)
- [x] 5.3 Implementar layout mobile-first da página de aprovação com logo, ambientes, valores e botões de ação
- [x] 5.4 Criar `app/api/quotes/[id]/approve/route.ts` com validação de token e UPDATE atômico
- [x] 5.5 Integrar `sendQuoteApproved` no handler de aprovação
- [x] 5.6 Adicionar testes para a página e para o endpoint de aprovação

## Implementation Details

Veja a seção "API Endpoints — Endpoints novos" do TechSpec para os contratos exatos de request/response.

A página `app/o/[token]/page.tsx` usa o Supabase service client (não o cookie client) para buscar o orçamento — já que não há sessão de usuário. O service client já existe em `lib/supabase/service.ts`. A query busca em `quotes WHERE approval_token = $1` com todos os JOINs necessários (profiles, customers, quote_versions, quote_rooms, quote_items).

O middleware existente em `middleware.ts` provavelmente redireciona rotas não autenticadas para `/login`. É necessário adicionar `/o/` como rota pública nas exceções do middleware.

A logo da marcenaria é gerada com signed URL de 1h (suficiente para visualização) via `supabase.storage.from('logos').createSignedUrl(...)`.

### Relevant Files

- `app/(app)/layout.tsx` — referência de como outros layouts estão estruturados
- `lib/supabase/service.ts` — client de serviço para query sem RLS
- `lib/email/templates/quote-approved.ts` (task_03) — template de e-mail a disparar
- `app/api/quotes/[id]/route.ts` — padrão de query completa de orçamento
- `middleware.ts` — adicionar `/o/` como rota pública

### Dependent Files

- `middleware.ts` — DEVE ser atualizado para não redirecionar `/o/[token]` para login
- `components/wizard/step-send.tsx` (task_10) — exibe o link que esta rota serve

### Related ADRs

- [ADR-001: Modelo de interação no link de aprovação — Aprovação simples](adrs/adr-001.md) — define dois botões (Aprovar / Tenho dúvidas) sem entrada de texto

## Deliverables

- `app/o/[token]/page.tsx` com três estados de renderização
- `app/api/quotes/[id]/approve/route.ts`
- `middleware.ts` atualizado com rota pública `/o/`
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para o fluxo completo de aprovação **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `GET /o/[token]` com token válido e orçamento ativo renderiza logo, ambientes e botão "Aprovar"
  - [ ] `GET /o/[token]` com orçamento `status = 'accepted'` renderiza estado "já aprovado" sem botão de ação
  - [ ] `GET /o/[token]` com `approval_token_expires_at < now()` renderiza estado "link expirado"
  - [ ] `GET /o/[token]` com token inexistente retorna 404 com mensagem amigável
  - [ ] `POST /api/quotes/[id]/approve` com token válido retorna 200 `{ success: true }`
  - [ ] `POST /api/quotes/[id]/approve` com token válido mas orçamento já em `status = 'accepted'` retorna 409
  - [ ] `POST /api/quotes/[id]/approve` com `approval_token_expires_at < now()` retorna 409
  - [ ] `POST /api/quotes/[id]/approve` com token incorreto (não corresponde ao orçamento) retorna 404
  - [ ] `POST /api/quotes/[id]/approve` sem body retorna 400
- Testes de integração:
  - [ ] Fluxo completo: PATCH status='sent' → GET /o/[token] renderiza página → POST /approve → status = 'accepted' + e-mail disparado
  - [ ] Acesso à rota `/o/[token]` sem cookie de sessão retorna 200 (não redireciona para login)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Página `/o/[token]` acessível sem autenticação em qualquer dispositivo
- Status do orçamento muda para `'accepted'` após clique em "Aprovar"
- E-mail de notificação disparado ao marceneiro após aprovação
- Página exibe os três estados corretos (válido / aprovado / expirado)
