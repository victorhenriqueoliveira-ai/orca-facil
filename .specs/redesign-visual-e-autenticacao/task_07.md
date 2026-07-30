---
status: completed
title: Componente Sidebar (desktop)
type: frontend
complexity: medium
dependencies:
  - task_01
  - task_04
---

# Task 07: Componente Sidebar (desktop)

## Overview

Cria o componente `Sidebar` que exibe a navegação lateral em telas de 1024px ou mais. A sidebar contém o logotipo tipográfico da marca, os quatro itens de navegação principais e um atalho de perfil/logout no rodapé. Em mobile, é completamente oculta via CSS (`hidden lg:flex`).

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC seção "System Architecture — Component Overview" para o contrato de uso da Sidebar no layout
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `components/sidebar.tsx` como Client Component (usa `usePathname` para item ativo)
- DEVE exibir os 4 itens de navegação: Orçamentos (`/orcamentos`), Clientes (`/clientes`), Catálogo (`/catalogo`), Configurações (`/configuracoes`)
- DEVE destacar o item ativo com cor primária (`text-brand-primary` ou `bg-brand-primary/10`) e os demais em neutro
- DEVE exibir o logotipo tipográfico "Orça Fácil" no topo, em Manrope Bold, cor petróleo (`text-brand-support`)
- DEVE exibir link de logout ou atalho de perfil no rodapé da sidebar
- DEVE ter largura fixa de `w-64` (256px) e altura `min-h-screen` para cobrir toda a viewport
- DEVE aceitar `className` como prop para permitir que o layout aplique `hidden lg:flex`
- DEVERIA usar os mesmos ícones SVG do `BottomNav` para consistência visual
</requirements>

## Subtasks

- [x] 7.1 Criar estrutura base do componente com logo no topo, nav no meio e logout no rodapé
- [x] 7.2 Implementar lista de itens de navegação com highlight do item ativo via `usePathname`
- [x] 7.3 Aplicar cores da nova paleta: fundo `bg-brand-support` (petróleo) ou `bg-white` com borda lateral
- [x] 7.4 Adicionar logotipo tipográfico "Orça Fácil" no topo
- [x] 7.5 Adicionar atalho de logout no rodapé

## Implementation Details

Arquivo a criar: `components/sidebar.tsx`.

O componente é Client Component por usar `usePathname`. A prop `className` permite ao layout aplicar `hidden lg:flex` externamente sem condicional dentro do componente.

Referência de ícones: os SVGs dos itens de navegação estão em `components/bottom-nav.tsx` — reaproveitar os mesmos ícones para consistência.

O logout deve chamar `GET /api/auth/logout` ou usar o client Supabase para `supabase.auth.signOut()` — manter o mesmo padrão já existente no projeto.

Veja a seção "Core Interfaces — Layout responsivo" do TechSpec para o contrato de uso da Sidebar no `app/(app)/layout.tsx`.

### Relevant Files

- `components/bottom-nav.tsx` — referência dos ícones SVG e do padrão de highlight de item ativo
- `app/api/auth/logout/route.ts` — rota de logout a ser chamada pelo atalho no rodapé

### Dependent Files

- `app/(app)/layout.tsx` (task_09) — importa e usa `<Sidebar className="hidden lg:flex w-64 shrink-0" />`

### Related ADRs

- [ADR-004: Layout Responsivo com Sidebar + Bottom Nav no Mesmo Arquivo](../adrs/adr-004.md) — Define como Sidebar e BottomNav coexistem e por que a Sidebar aceita `className`

## Deliverables

- `components/sidebar.tsx` completo e funcional
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] Sidebar renderiza os 4 itens de navegação com labels corretos
  - [ ] Item `/orcamentos` recebe classe de destaque quando `pathname === '/orcamentos'`
  - [ ] Item `/clientes` não recebe classe de destaque quando `pathname === '/orcamentos'`
  - [ ] Logotipo "Orça Fácil" está presente no topo do componente
  - [ ] Prop `className` é aplicada ao elemento raiz do componente
  - [ ] Link de logout está presente no rodapé
- Testes de integração:
  - [ ] Sidebar renderizada dentro do `AppLayout` em viewport 1280px está visível
  - [ ] Sidebar renderizada dentro do `AppLayout` em viewport 768px está oculta (classe `hidden`)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Sidebar visível em 1024px+ com navegação funcional
- Item ativo destacado corretamente ao navegar entre rotas
- Logotipo e cores da marca aplicados corretamente
