---
status: completed
title: BottomNav redesenhado com nova paleta
type: frontend
complexity: low
dependencies:
  - task_01
  - task_04
---

# Task 08: BottomNav redesenhado com nova paleta

## Overview

Atualiza o componente `BottomNav` existente para usar a nova paleta de cores da identidade Orca Fácil, substituindo `text-blue-600` (ativo) e `text-gray-500` (inativo) pelos tokens do design system. Adiciona suporte à prop `className` para que o layout possa aplicar `lg:hidden`.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC seção "System Architecture — Component Overview" e ADR-004
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE substituir `text-blue-600` (item ativo) por `text-brand-primary`
- DEVE substituir `text-gray-500` (item inativo) por `text-text-base/50` ou neutro equivalente
- DEVE substituir `bg-white border-gray-200` do container por `bg-bg-base border-border`
- DEVE adicionar prop `className` ao elemento `<nav>` raiz para permitir `lg:hidden` do layout
- DEVE manter toda a lógica de navegação, acessibilidade (`aria-label`, `aria-current`) e `safe-area-pb` sem alteração
- NÃO DEVE alterar os ícones SVG, hrefs ou labels dos itens
</requirements>

## Subtasks

- [x] 8.1 Substituir as classes de cor do item ativo (`text-blue-600` → `text-brand-primary`)
- [x] 8.2 Substituir as classes de cor do item inativo e do container
- [x] 8.3 Adicionar prop `className` ao elemento `<nav>` raiz
- [x] 8.4 Confirmar que acessibilidade (`aria-current`, `safe-area-pb`) está preservada

## Implementation Details

Arquivo a modificar: `components/bottom-nav.tsx`.

É uma tarefa de substituição de classes CSS — a lógica do componente não muda. As classes a substituir estão documentadas na exploração do codebase: `text-blue-600` (ativo), `text-gray-500` (inativo), `bg-white`, `border-gray-200`.

Veja ADR-004 para entender por que a prop `className` é necessária (o layout aplica `lg:hidden` externamente).

### Relevant Files

- `components/bottom-nav.tsx` — único arquivo a modificar

### Dependent Files

- `app/(app)/layout.tsx` (task_09) — aplica `className="lg:hidden"` ao `<BottomNav />`

### Related ADRs

- [ADR-004: Layout Responsivo com Sidebar + Bottom Nav no Mesmo Arquivo](../adrs/adr-004.md) — BottomNav precisa aceitar `className` para ser ocultado em desktop

## Deliverables

- `components/bottom-nav.tsx` atualizado com nova paleta e prop `className`
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] Item ativo renderiza com classe contendo `brand-primary` (não `blue-600`)
  - [x] Item inativo não tem classe `blue-600`
  - [x] Container não tem classe `bg-white` nem `border-gray-200`
  - [x] Prop `className="lg:hidden"` é aplicada ao elemento `<nav>` raiz
  - [x] `aria-current="page"` ainda está presente no item ativo
  - [x] `aria-label="Navegação principal"` ainda está presente no `<nav>`
- Testes de integração:
  - [ ] BottomNav renderizado com `className="lg:hidden"` fica oculto em viewport ≥ 1024px (verificação visual — depende de task_09)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Nenhuma classe `blue-600` residual no componente
- Item ativo exibe cor terracota (`brand-primary`) visualmente
- Acessibilidade preservada (verificar no DevTools de acessibilidade)
