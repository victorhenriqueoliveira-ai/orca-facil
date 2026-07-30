---
status: completed
title: Componentes UI base: Button, Input, Card, Badge
type: frontend
complexity: medium
dependencies:
  - task_01
---

# Task 04: Componentes UI base: Button, Input, Card, Badge

## Overview

Cria os quatro componentes reutilizáveis que formam a base do design system do Orca Fácil: `Button`, `Input`, `Card` e `Badge`. Estes componentes encapsulam a nova paleta, tipografia e padrões de acessibilidade (área de toque mínima 44px, contraste AA) e serão usados em todas as páginas de auth, internas e na landing page.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC seção "Core Interfaces" para as assinaturas de tipo dos componentes
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `components/ui/button.tsx` com variantes `primary`, `secondary` e `ghost`, e tamanhos `sm`, `md`, `lg` conforme interface definida no TechSpec seção "Core Interfaces"
- DEVE criar `components/ui/input.tsx` com suporte a `label`, `error` e `disabled`; borda `border-border`, foco com `ring-brand-primary`
- DEVE criar `components/ui/card.tsx` com fundo `bg-white` (ou `bg-bg-base`), borda `border-border`, bordas arredondadas e sombra sutil
- DEVE criar `components/ui/badge.tsx` com variantes de cor para cada status do sistema: `success`, `warning`, `error`, `neutral`
- DEVE garantir área de toque mínima de 44×44px no `Button` via `min-h-[44px]`
- DEVE garantir contraste AA (WCAG 2.1) entre texto e fundo em todas as variantes
- DEVE exportar todos os componentes de `components/ui/index.ts` para import centralizado
- DEVERIA usar `cn()` (utility de merge de classes) para composição de className
</requirements>

## Subtasks

- [x] 4.1 Criar `components/ui/button.tsx` com as três variantes e três tamanhos
- [x] 4.2 Criar `components/ui/input.tsx` com label, mensagem de erro e estado disabled
- [x] 4.3 Criar `components/ui/card.tsx` com slot para header e body
- [x] 4.4 Criar `components/ui/badge.tsx` com variantes de status
- [x] 4.5 Criar `components/ui/index.ts` com re-exports de todos os componentes
- [x] 4.6 Verificar contraste AA de todas as combinações de cor nos componentes

## Implementation Details

Arquivos a criar em `components/ui/`: `button.tsx`, `input.tsx`, `card.tsx`, `badge.tsx`, `index.ts`.

O projeto não usa shadcn/ui nem qualquer component library — os componentes são implementados do zero com Tailwind. Use a função `cn()` do pacote `clsx` ou `tailwind-merge` se já presente no projeto; caso contrário, uma implementação simples inline é suficiente.

Veja a seção "Core Interfaces" do TechSpec para a assinatura completa do `Button` e siga o mesmo padrão para os demais componentes.

Os `Badge` devem substituir os badges de status existentes nas páginas de orçamentos (`Rascunho`, `Enviado`, `Aprovado`, `Rejeitado`, `Expirado`) — mapear as cores atuais para as variantes do design system.

### Relevant Files

- `app/globals.css` (task_01) — tokens de cor que os componentes referenciam via classes Tailwind

### Dependent Files

- `app/(auth)/login/page.tsx` (task_05) — usa `Button` e `Input`
- `app/(auth)/cadastro/page.tsx` (task_05) — usa `Button` e `Input`
- `app/(auth)/redefinir-senha/page.tsx` (task_05) — usa `Button` e `Input`
- `app/(auth)/nova-senha/page.tsx` (task_05) — usa `Button` e `Input`
- `components/sidebar.tsx` (task_07) — usa estilos consistentes com o design system
- `app/(marketing)/page.tsx` (task_13) — usa `Button` e `Card`
- Todas as páginas internas (task_10, task_11) — substituem componentes ad-hoc pelos UI base

### Related ADRs

- [ADR-003: Tokens de Design via @theme em globals.css (Tailwind v4)](../adrs/adr-003.md) — Componentes usam as classes geradas pelos tokens

## Deliverables

- `components/ui/button.tsx`, `input.tsx`, `card.tsx`, `badge.tsx`, `index.ts`
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para composição dos componentes **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `Button` variante `primary` renderiza com classe `bg-brand-primary`
  - [x] `Button` variante `ghost` renderiza sem background preenchido
  - [x] `Button` com `disabled={true}` tem `pointer-events-none` e `opacity-50`
  - [x] `Button` tem altura mínima de 44px em todas as variantes
  - [x] `Input` com `error="mensagem"` exibe a mensagem de erro abaixo do campo
  - [x] `Input` com `disabled={true}` não é interativo
  - [x] `Badge` variante `success` usa cor `bg-success` (ou equivalente)
  - [x] `Badge` variante `error` usa cor `bg-error`
  - [x] Todos os componentes aceitam e aplicam `className` adicional via prop
- Testes de integração:
  - [x] `Button` dentro de `Card` renderiza sem conflito de estilos
  - [x] Formulário com `Input` + `Button` submit funciona corretamente
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Todos os componentes exportados de `components/ui/index.ts`
- Nenhum componente usa cores hardcoded (ex.: `bg-[#C2703A]`) — apenas tokens via classes Tailwind
- Contraste AA verificado manualmente nas variantes primárias
