---
status: completed
title: Callback de auth: suporte ao param ?next=
type: backend
complexity: low
dependencies:
  - task_05
---

# Task 06: Callback de auth: suporte ao param ?next=

## Overview

Adiciona suporte ao parâmetro de query `?next=` na rota `app/api/auth/callback/route.ts` para que o fluxo de reset de senha redirecione o usuário para `/nova-senha` após a troca de code por session. Mudança mínima de 2 linhas que desbloqueia o fluxo end-to-end do reset.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC seção "API Endpoints" para o contrato exato da mudança
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE ler o parâmetro `next` da query string da URL recebida no callback
- DEVE usar `next ?? '/dashboard'` como fallback para não quebrar fluxos existentes que chamam `/api/auth/callback` sem o parâmetro
- DEVE redirecionar para o valor de `next` após `exchangeCodeForSession` bem-sucedido
- DEVE manter o comportamento atual de redirect para `/login?error=invalid_code` em caso de falha
- NÃO DEVE aceitar valores de `next` externos sem validação — apenas paths internos (começando com `/`)
</requirements>

## Subtasks

- [x] 6.1 Ler `requestUrl.searchParams.get('next')` na rota de callback
- [x] 6.2 Validar que o valor de `next` começa com `/` (path interno) antes de usar
- [x] 6.3 Substituir o redirect fixo para `/dashboard` pelo redirect para `next ?? '/dashboard'`
- [x] 6.4 Garantir que o fluxo de login via OTP existente (se algum teste ainda o usa) não quebra

## Implementation Details

Arquivo a modificar: `app/api/auth/callback/route.ts`.

O arquivo já implementa `exchangeCodeForSession(code)` e redireciona para `/dashboard`. A mudança é localizada: extrair o param `next` antes do redirect final e usá-lo como destino. A validação de path interno (começa com `/`) previne open redirect.

Veja a seção "API Endpoints" do TechSpec para o trecho de código de referência.

### Relevant Files

- `app/api/auth/callback/route.ts` — único arquivo a modificar

### Dependent Files

- `app/(auth)/redefinir-senha/page.tsx` (task_05) — passa `?next=/nova-senha` no `redirectTo` do `resetPasswordForEmail`
- `app/(auth)/nova-senha/page.tsx` (task_05) — destino do redirect após o callback

### Related ADRs

- [ADR-002: Substituição de OTP por Email+Senha via Supabase signInWithPassword](../adrs/adr-002.md) — Callback reutilizado para processar o token de reset

## Deliverables

- `app/api/auth/callback/route.ts` atualizado com suporte a `?next=`
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] Request com `?next=/nova-senha` e code válido redireciona para `/nova-senha`
  - [x] Request sem parâmetro `next` e code válido redireciona para `/dashboard` (comportamento atual mantido)
  - [x] Request com `?next=https://evil.com` (path externo) redireciona para `/dashboard` (open redirect bloqueado)
  - [x] Request com code inválido redireciona para `/login?error=invalid_code` independente do `next`
- Testes de integração:
  - [ ] Fluxo completo reset: `resetPasswordForEmail` → email → callback `?next=/nova-senha` → `/nova-senha` carregada com sessão ativa
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Fluxo de reset de senha end-to-end funcional: link no email leva o usuário para `/nova-senha`
- Fluxo de cadastro via `signUp` (que também pode usar callback) não é afetado
- Nenhum open redirect possível via parâmetro `next`
