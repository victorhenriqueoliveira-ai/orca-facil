---
status: completed
title: Tokens de design no @theme do globals.css
type: chore
complexity: low
dependencies: []
---

# Task 01: Tokens de design no @theme do globals.css

## Overview

Adiciona o bloco `@theme` em `app/globals.css` com todos os tokens semânticos de cor e fonte da nova identidade visual do Orca Fácil. Este é o passo fundacional que habilita todas as classes Tailwind como `bg-brand-primary`, `text-brand-support` e `border-border` para uso em qualquer componente sem configuração adicional.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC seção "Core Interfaces" para os valores exatos dos tokens
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE adicionar bloco `@theme` em `app/globals.css` com os 8 tokens de cor e 1 token de fonte definidos no TechSpec (seção "Core Interfaces")
- DEVE usar prefixos `brand-` para cores de identidade e nomes semânticos (`bg-base`, `text-base`, `border`) para neutros, evitando colisão com tokens default do Tailwind v4
- DEVE manter as variáveis CSS existentes (`--background`, `--foreground`) sem alteração para não quebrar código atual
- DEVE remover a declaração `font-family: Arial, Helvetica, sans-serif` do seletor `body` em `globals.css` (será substituída pela fonte Manrope na task_02)
- DEVERIA adicionar comentário de seção identificando o bloco como "Identidade Orca Fácil" para facilitar manutenção futura
</requirements>

## Subtasks

- [x] 1.1 Adicionar bloco `@theme` com os 8 tokens de cor da identidade visual
- [x] 1.2 Adicionar token `--font-sans` referenciando a variável CSS da fonte que será definida na task_02
- [x] 1.3 Remover declaração `font-family: Arial` do seletor `body`
- [x] 1.4 Verificar que nenhum token colide com defaults do Tailwind v4 (ex.: `--color-background`)
- [x] 1.5 Confirmar que classes `bg-brand-primary`, `text-brand-support`, `bg-bg-base` são reconhecidas pelo Tailwind

## Implementation Details

Arquivo a modificar: `app/globals.css`.

O projeto usa Tailwind v4 com `@theme inline` — não há `tailwind.config.ts`. O bloco `@theme` é a forma nativa de estender tokens. Veja a seção "Core Interfaces" do TechSpec para os valores exatos de cada token.

Atenção ao escopo do token `--font-sans`: ele deve referenciar `var(--font-manrope)`, que só existirá após a task_02 injetar a variável via `next/font`. Na task_01, adicione o token mas saiba que a fonte só ativará com a task_02 concluída.

### Relevant Files

- `app/globals.css` — arquivo a modificar; contém os imports Tailwind e as CSS vars atuais

### Dependent Files

- `components/ui/button.tsx` (task_04) — usará classes `bg-brand-primary`
- `components/ui/input.tsx` (task_04) — usará classes `border-border`
- `components/sidebar.tsx` (task_07) — usará `bg-brand-support`
- `components/bottom-nav.tsx` (task_08) — usará `text-brand-primary`
- `app/page.tsx` (task_13) — usará `bg-bg-base` e `text-text-base`

### Related ADRs

- [ADR-003: Tokens de Design via @theme em globals.css (Tailwind v4)](../adrs/adr-003.md) — Define por que os tokens ficam em globals.css e não em arquivo separado

## Deliverables

- `app/globals.css` atualizado com bloco `@theme` contendo todos os tokens
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] Verificar que `globals.css` contém exatamente os 8 tokens de cor definidos no TechSpec (snapshot ou grep)
  - [ ] Verificar que `--color-brand-primary` tem valor `#C2703A`
  - [ ] Verificar que `--color-brand-support` tem valor `#2D5D5A`
  - [ ] Verificar que `--color-background` (token original) ainda existe e não foi alterado
  - [ ] Verificar que `font-family: Arial` não aparece mais no seletor `body`
- Testes de integração:
  - [ ] Build Next.js (`next build`) sem erros de CSS após a mudança
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- `next build` conclui sem erros ou warnings de CSS
- Classes `bg-brand-primary` e `text-brand-support` disponíveis para uso em qualquer componente
- Nenhuma classe existente no projeto quebra após a mudança
