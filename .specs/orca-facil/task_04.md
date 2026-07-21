---
status: pending
title: Layout da aplicação + guarda de assinatura
type: frontend
complexity: medium
dependencies:
  - task_03
---

# Task 04: Layout da aplicação + guarda de assinatura

## Overview

Cria o layout raiz do grupo `(app)` com navegação mobile-first, contexto de assinatura disponível para todos os componentes filhos, banner de trial e lógica de bloqueio read-only. É a camada que traduz o status da assinatura (trial/active/read_only/cancelled) em comportamento de UI para todas as rotas da aplicação.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE buscar `subscriptions` do Postgres no Server Component do layout e injetar o status via React Context
- DEVE exibir banner fixo no topo quando `status = 'trial'` mostrando quantos dias restam até `trial_ends_at`
- DEVE redirecionar para `/assinar` qualquer tentativa de criar ou editar recurso quando `status = 'read_only'` — o redirecionamento DEVE ocorrer tanto no cliente (UI desabilitada/redirect) quanto no servidor (Route Handlers verificam status antes de writes)
- DEVE criar a tela de dashboard em `/dashboard` com o único botão principal "Criar orçamento" em destaque
- DEVE criar navegação inferior (bottom nav) mobile-first com ícones para: Orçamentos, Clientes, Catálogo, Configurações
- DEVE criar página `/assinar` com mensagem de trial encerrado e call-to-action de assinatura (o checkout AbacatePay será implementado na task_13)
- DEVERIA usar Server Component para o layout e Client Component apenas para partes interativas (banner com countdown, botões)
</requirements>

## Subtasks

- [ ] 4.1 Criar `app/(app)/layout.tsx` que busca subscription e provê contexto
- [ ] 4.2 Criar componente `SubscriptionProvider` (Client Component) com contexto de status
- [ ] 4.3 Criar componente `TrialBanner` com contador de dias restantes
- [ ] 4.4 Criar navegação inferior (bottom nav) com 4 destinos
- [ ] 4.5 Criar dashboard `/dashboard` com botão "Criar orçamento" em destaque
- [ ] 4.6 Criar página `/assinar` com mensagem de trial encerrado e placeholder de checkout
- [ ] 4.7 Criar hook `useSubscription()` para componentes que precisam verificar status

## Implementation Details

Veja a seção "System Architecture → Component Overview" e "Known Risks" do TechSpec para o modelo de verificação de assinatura no layout.

O hook `useSubscription()` deve ser consumido pelos Route Handlers (via verificação server-side) E pelos componentes React (via context) para bloquear writes quando `read_only`:

```typescript
// Uso esperado em Route Handler
const { status } = await getSubscriptionStatus(userId)
if (status === 'read_only' || status === 'cancelled') {
  return NextResponse.json({ error: 'Assinatura necessária' }, { status: 403 })
}
```

### Relevant Files

- `app/(app)/layout.tsx` — layout raiz com busca de subscription e providers
- `app/(app)/dashboard/page.tsx` — tela inicial com CTA principal
- `app/(app)/assinar/page.tsx` — página de conversão de trial
- `components/subscription-provider.tsx` — React Context de subscription
- `components/trial-banner.tsx` — banner de trial com countdown
- `components/bottom-nav.tsx` — navegação inferior mobile
- `lib/subscription/get-status.ts` — função server-side para buscar status

### Dependent Files

- Todos os componentes de feature (tasks 05-12) consomem o contexto de subscription
- Route Handlers de escrita (tasks 06-12) usam `lib/subscription/get-status.ts` para guard server-side

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- Layout `(app)` funcional com subscription context
- Trial banner exibindo dias restantes corretamente
- Dashboard com botão "Criar orçamento" centralizado e visível
- Navegação inferior funcionando em mobile
- Guard de read_only bloqueando ações de escrita (UI + server)
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para os guards de assinatura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `TrialBanner` com `trial_ends_at` = hoje + 3 dias exibe "3 dias restantes"
  - [ ] `TrialBanner` com `trial_ends_at` no passado não renderiza (status já é `read_only`)
  - [ ] `useSubscription()` retorna `{ status: 'trial', daysLeft: N }` corretamente
  - [ ] `lib/subscription/get-status.ts` com `status = 'read_only'` retorna `{ canWrite: false }`
- Testes de integração:
  - [ ] Usuário com `status = 'read_only'` é redirecionado para `/assinar` ao acessar `/orcamentos/novo`
  - [ ] Usuário com `status = 'trial'` vê o banner com dias restantes corretos na dashboard
  - [ ] Usuário com `status = 'active'` não vê o trial banner

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Bottom nav visível e funcional em viewport mobile (375px)
- Trial banner exibe informação correta baseada em `trial_ends_at` real do banco
- Usuário em `read_only` não consegue criar orçamentos (bloqueado em UI E em Route Handler)
