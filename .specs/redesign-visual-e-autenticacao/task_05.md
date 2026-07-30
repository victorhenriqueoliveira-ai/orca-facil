---
status: completed
title: Páginas de autenticação: login, cadastro, reset de senha
type: frontend
complexity: high
dependencies:
  - task_01
  - task_04
---

# Task 05: Páginas de autenticação: login, cadastro, reset de senha

## Overview

Substitui completamente o fluxo de autenticação OTP por email+senha. Inclui reescrita da página de login, criação das páginas de cadastro, solicitação de reset e definição de nova senha, além da remoção da página `verify`. Este é o fluxo de entrada de todos os novos usuários e o caminho de migração dos usuários existentes.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC seção "Core Interfaces" para os contratos Supabase Auth e seção "ADR-002" para a estratégia de migração de usuários OTP
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE reescrever `app/(auth)/login/page.tsx` substituindo `signInWithOtp` por `signInWithPassword`; ao falhar, exibir mensagem que orienta o usuário a usar "Esqueci minha senha" para usuários OTP existentes
- DEVE criar `app/(auth)/cadastro/page.tsx` com campos nome, email, senha e confirmação de senha; chamar `supabase.auth.signUp()` com `options.data.name`; redirecionar para `/dashboard` após sucesso
- DEVE criar `app/(auth)/redefinir-senha/page.tsx` com campo de email; chamar `resetPasswordForEmail` com `redirectTo: ${origin}/api/auth/callback?next=/nova-senha`
- DEVE criar `app/(auth)/nova-senha/page.tsx` como Client Component; chamar `supabase.auth.updateUser({ password })` após o usuário preencher e confirmar a nova senha
- DEVE remover `app/(auth)/verify/page.tsx` (não tem mais uso com email+senha)
- DEVE usar componentes `Button` e `Input` da task_04 em todas as páginas
- DEVE exibir estados de loading (botão desabilitado durante chamada assíncrona) e erro (mensagem inline) em todas as páginas
- DEVE aplicar a nova paleta via tokens da task_01: fundo `bg-bg-base`, botão primário `bg-brand-primary`
- DEVERIA validar que senha tem mínimo de 8 caracteres antes de chamar a API
</requirements>

## Subtasks

- [x] 5.1 Reescrever `app/(auth)/login/page.tsx` com form email+senha e hint de migração
- [x] 5.2 Criar `app/(auth)/cadastro/page.tsx` com signup completo (nome, email, senha, confirmação)
- [x] 5.3 Criar `app/(auth)/redefinir-senha/page.tsx` com envio de link de reset
- [x] 5.4 Criar `app/(auth)/nova-senha/page.tsx` para definição de nova senha pós-link
- [x] 5.5 Deletar `app/(auth)/verify/page.tsx`
- [x] 5.6 Garantir que o link "Cadastre-se" no login aponta para `/cadastro` e vice-versa

## Implementation Details

Arquivos a modificar/criar:
- `app/(auth)/login/page.tsx` — reescrita
- `app/(auth)/cadastro/page.tsx` — novo
- `app/(auth)/redefinir-senha/page.tsx` — novo
- `app/(auth)/nova-senha/page.tsx` — novo (Client Component — usa `supabase.auth.updateUser` que requer sessão pós-callback)
- `app/(auth)/verify/page.tsx` — deletar

Veja a seção "Core Interfaces" do TechSpec para os contratos exatos de cada chamada Supabase. Veja ADR-002 para entender o comportamento esperado ao falhar `signInWithPassword` para usuários OTP.

A página `/nova-senha` depende da task_06 para funcionar corretamente end-to-end (o callback precisa redirecionar para ela após o reset), mas pode ser desenvolvida e testada de forma isolada.

### Relevant Files

- `app/(auth)/login/page.tsx` — arquivo a reescrever
- `app/(auth)/verify/page.tsx` — arquivo a deletar
- `lib/supabase/client.ts` — client browser usado nas páginas de auth (Client Components)

### Dependent Files

- `app/api/auth/callback/route.ts` (task_06) — recebe o redirect após `resetPasswordForEmail` e encaminha para `/nova-senha`
- `components/ui/button.tsx` (task_04) — usado em todos os formulários de auth
- `components/ui/input.tsx` (task_04) — usado em todos os formulários de auth

### Related ADRs

- [ADR-002: Substituição de OTP por Email+Senha via Supabase signInWithPassword](../adrs/adr-002.md) — Define os métodos Auth usados e a estratégia de migração

## Deliverables

- `app/(auth)/login/page.tsx` reescrito
- `app/(auth)/cadastro/page.tsx` criado
- `app/(auth)/redefinir-senha/page.tsx` criado
- `app/(auth)/nova-senha/page.tsx` criado
- `app/(auth)/verify/page.tsx` removido
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para o fluxo de cadastro e login **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] Login: submeter form com email e senha válidos chama `signInWithPassword` com os valores corretos
  - [x] Login: erro de `signInWithPassword` exibe mensagem com orientação para reset de senha
  - [x] Login: botão fica desabilitado durante o loading
  - [x] Cadastro: submeter com email já cadastrado exibe mensagem de erro "email já em uso"
  - [x] Cadastro: senha e confirmação divergentes exibe erro antes de chamar a API
  - [x] Cadastro: senha com menos de 8 caracteres exibe erro de validação
  - [x] Redefinir senha: submeter email válido exibe mensagem de sucesso ("verifique seu email")
  - [x] Nova senha: senha e confirmação divergentes exibe erro sem chamar `updateUser`
- Testes de integração:
  - [x] Fluxo cadastro → redirect para `/dashboard` com usuário autenticado
  - [x] Login com credenciais inválidas → mensagem de erro → link "Esqueci" navega para `/redefinir-senha`
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Usuário novo consegue cadastrar com email+senha e acessa o dashboard
- Usuário existente (OTP) recebe orientação clara ao tentar login
- Página `/verify` retorna 404 (arquivo removido)
- Todos os formulários têm estados de loading e erro funcionais
