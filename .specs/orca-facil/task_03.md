---
status: pending
title: Autenticação OTP (e-mail e telefone)
type: backend
complexity: medium
dependencies:
  - task_01
  - task_02
---

# Task 03: Autenticação OTP (e-mail e telefone)

## Overview

Implementa o fluxo de autenticação sem senha via OTP: o marceneiro digita e-mail ou telefone, recebe um código de verificação e acessa o sistema. Inclui a criação automática do perfil (`profiles`) e da assinatura de trial (`subscriptions`) no primeiro acesso, além do middleware Next.js que protege todas as rotas da aplicação.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar página `/login` com toggle entre e-mail e telefone e campo único de entrada
- DEVE criar página `/auth/verify` para digitação do código OTP recebido
- DEVE criar Route Handler `GET /api/auth/callback` que troca o code pelo token de sessão Supabase
- DEVE criar `middleware.ts` na raiz do projeto que protege todas as rotas do grupo `(app)` — redireciona para `/login` se não autenticado
- DEVE criar o perfil na tabela `profiles` automaticamente após o primeiro login (via Supabase Database Webhook ou trigger Postgres)
- DEVE criar a assinatura de trial na tabela `subscriptions` com `status = 'trial'` e `trial_ends_at = now() + interval '30 days'` no primeiro login
- DEVE permitir logout com invalidação da sessão Supabase
- DEVERIA exibir mensagem de erro acionável se OTP expirar ou for inválido
- DEVERIA usar `@supabase/ssr` para gerenciamento de cookies de sessão (não localStorage)
</requirements>

## Subtasks

- [ ] 3.1 Criar página `/login` mobile-first com campo de e-mail/telefone e toggle entre os dois
- [ ] 3.2 Criar página `/auth/verify` com campo de 6 dígitos para OTP
- [ ] 3.3 Criar Route Handler `/api/auth/callback` para troca de code por sessão
- [ ] 3.4 Criar `middleware.ts` com proteção de rotas `(app)` e redirecionamento para `/login`
- [ ] 3.5 Criar trigger Postgres que cria `profiles` e `subscriptions` automaticamente no primeiro login
- [ ] 3.6 Adicionar botão/rota de logout

## Implementation Details

Veja a seção "Integration Points → Supabase" do TechSpec para detalhes sobre `@supabase/ssr`, gerenciamento de cookies e a diferença entre client browser e server client.

O trigger Postgres para criação automática de perfil e assinatura:
```sql
-- Criar função e trigger no Supabase
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO subscriptions (user_id, status, trial_ends_at)
    VALUES (NEW.id, 'trial', now() + interval '30 days')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```
Adicionar esta função à migration `001_initial_schema.sql` ou criar `002_auth_trigger.sql`.

### Relevant Files

- `app/(auth)/login/page.tsx` — página de login
- `app/(auth)/verify/page.tsx` — página de verificação OTP
- `app/api/auth/callback/route.ts` — callback de autenticação
- `middleware.ts` — proteção de rotas
- `supabase/migrations/002_auth_trigger.sql` — trigger de criação de perfil e assinatura

### Dependent Files

- `lib/supabase/client.ts`, `lib/supabase/server.ts` (task_01) — clientes usados no fluxo de auth
- `app/(app)/layout.tsx` (task_04) — lê a sessão para verificar assinatura

### Related ADRs

Nenhum ADR específico — decisão de stack (Supabase Auth) está documentada no PRD.

## Deliverables

- Páginas de login e verificação OTP funcionando em mobile
- Middleware protegendo rotas `(app)` corretamente
- Trigger de criação automática de perfil e assinatura validado
- Logout funcional com limpeza de sessão
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração do fluxo completo de autenticação **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `middleware.ts`: requisição sem cookie de sessão para `/dashboard` retorna redirect para `/login`
  - [ ] `middleware.ts`: requisição com sessão válida para `/dashboard` passa sem redirect
  - [ ] `middleware.ts`: requisição para `/login` passa sem redirect mesmo sem sessão
  - [ ] Route Handler `/api/auth/callback` com `code` inválido retorna redirect para `/login?error=invalid_code`
- Testes de integração (Supabase local):
  - [ ] Novo usuário se autentica via OTP de e-mail e é redirecionado para `/dashboard`
  - [ ] Após autenticação, `profiles` contém registro com `id` do usuário
  - [ ] Após autenticação, `subscriptions` contém registro com `status = 'trial'` e `trial_ends_at` ~30 dias à frente
  - [ ] Logout invalida sessão e próxima requisição para rota `(app)` redireciona para `/login`
  - [ ] OTP expirado exibe mensagem de erro acionável na tela de verificação

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Fluxo completo (login → OTP → dashboard) funciona em dispositivo móvel real ou emulador
- Perfil e assinatura criados automaticamente no primeiro login sem intervenção manual
- Rotas `(app)` inacessíveis sem sessão ativa
