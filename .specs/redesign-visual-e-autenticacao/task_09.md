---
status: completed
title: App layout: sidebar + bottom nav responsivos
type: frontend
complexity: medium
dependencies:
  - task_07
  - task_08
---

# Task 09: App layout: sidebar + bottom nav responsivos

## Overview

Atualiza `app/(app)/layout.tsx` para integrar `<Sidebar>` e `<BottomNav>` em uma estrutura flex responsiva: sidebar visível em desktop (≥ 1024px) e bottom nav visível em mobile (< 1024px). A lógica de proteção de rota e carregamento de subscription permanece sem alteração.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC seção "Core Interfaces — Layout responsivo" para a estrutura JSX exata
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE adicionar `<Sidebar className="hidden lg:flex w-64 shrink-0" />` dentro do layout, antes do container de conteúdo
- DEVE adicionar `<BottomNav className="lg:hidden" />` após o `<main>`, dentro do container de conteúdo
- DEVE usar `min-w-0` no container filho para prevenir overflow em viewports estreitas com sidebar
- DEVE remover `pb-16` do `<main>` em desktop via `lg:pb-0` (padding só necessário para bottom nav em mobile)
- DEVE aplicar `bg-bg-base` ao container raiz do layout
- DEVE manter toda a lógica existente: `getUser()`, `getSubscriptionStatus()`, `SubscriptionProvider`, `TrialBanner`
- DEVE garantir que `TrialBanner` aparece acima do conteúdo (mas abaixo da sidebar — sidebar é fixa lateral)
</requirements>

## Subtasks

- [x] 9.1 Envolver o conteúdo atual em estrutura `flex` com sidebar lateral
- [x] 9.2 Mover `<BottomNav />` para dentro do container filho com `className="lg:hidden"`
- [x] 9.3 Adicionar `<Sidebar className="hidden lg:flex w-64 shrink-0" />` como primeiro filho do flex container
- [x] 9.4 Ajustar padding do `<main>`: `pb-16 lg:pb-0` e adicionar `p-4 lg:p-8`
- [x] 9.5 Testar em 375px, 768px, 1024px e 1440px

## Implementation Details

Arquivo a modificar: `app/(app)/layout.tsx`.

A estrutura JSX de referência está na seção "Core Interfaces — Layout responsivo" do TechSpec. O arquivo é Server Component — nenhuma parte do layout se torna Client Component nesta tarefa.

Atenção: o `TrialBanner` atual é renderizado dentro do `<div className="flex flex-col min-h-screen">`. Com a nova estrutura, ele deve aparecer no container filho (coluna direita) para não deslocar a sidebar.

### Relevant Files

- `app/(app)/layout.tsx` — arquivo a modificar
- `components/sidebar.tsx` (task_07) — importado aqui
- `components/bottom-nav.tsx` (task_08) — já importado, recebe `className`
- `components/trial-banner.tsx` — mantido, apenas reposicionado no JSX

### Dependent Files

- `app/(app)/orcamentos/page.tsx` (task_10) — herda o novo layout com sidebar
- `app/(app)/dashboard/page.tsx` (task_10) — herda o novo layout
- `app/(app)/clientes/page.tsx` (task_11) — herda o novo layout
- `app/(app)/catalogo/page.tsx` (task_11) — herda o novo layout

### Related ADRs

- [ADR-004: Layout Responsivo com Sidebar + Bottom Nav no Mesmo Arquivo](../adrs/adr-004.md) — Decisão de usar um único layout com CSS responsivo

## Deliverables

- `app/(app)/layout.tsx` atualizado com sidebar + bottom nav responsivos
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para coexistência de sidebar e bottom nav **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] Layout renderiza `<Sidebar>` com `className` contendo `hidden lg:flex`
  - [x] Layout renderiza `<BottomNav>` com `className` contendo `lg:hidden`
  - [x] `SubscriptionProvider` ainda envolve todo o conteúdo
  - [x] `TrialBanner` ainda é renderizado quando `subscription.status === 'trial'`
  - [x] `<main>` tem classes `pb-16 lg:pb-0`
- Testes de integração:
  - [x] Em viewport 1440px: sidebar visível, bottom nav ausente (display:none)
  - [x] Em viewport 375px: sidebar ausente (display:none), bottom nav visível
  - [x] Em viewport 1024px: sidebar visível e conteúdo sem overflow horizontal
  - [x] Usuário não autenticado é redirecionado para `/login` (comportamento preservado)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Sidebar e bottom nav nunca aparecem ao mesmo tempo em nenhum viewport
- Layout sem overflow horizontal em qualquer resolução entre 375px e 1440px
- Lógica de auth e subscription preservada sem alteração funcional
