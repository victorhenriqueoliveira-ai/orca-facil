---
status: completed
title: Root layout: Manrope + metadados root
type: frontend
complexity: low
dependencies:
  - task_01
---

# Task 02: Root layout: Manrope + metadados root

## Overview

Substitui a fonte Geist por Manrope via `next/font/google` em `app/layout.tsx` e atualiza os metadados root (title, description, OG tags base). Após esta tarefa, toda a interface do produto usa Manrope como fonte padrão e os metadados genéricos do Next.js são substituídos por informações reais da marca.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC seção "Integration Points" para detalhes do carregamento de fontes
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE substituir `Geist` e `Geist_Mono` por `Manrope` como fonte principal via `next/font/google`
- DEVE expor a fonte como variável CSS `--font-manrope` para que o token `--font-sans` da task_01 resolva corretamente
- DEVE atualizar `metadata.title` de "Create Next App" para "Orça Fácil — Orçamentos de Móveis Planejados para Marceneiros"
- DEVE atualizar `metadata.description` com descrição real do produto (ver PRD seção "Visão Geral")
- DEVE definir `metadata.robots` com `index: true, follow: true` para a landing page e `noindex` para páginas de auth (via `generateMetadata` em cada página de auth)
- DEVE atualizar `lang="en"` para `lang="pt-BR"` na tag `<html>`
- DEVERIA configurar `display: 'swap'` na fonte para garantir legibilidade enquanto a fonte carrega
</requirements>

## Subtasks

- [x] 2.1 Substituir import de `Geist`/`Geist_Mono` por `Manrope` em `app/layout.tsx`
- [x] 2.2 Configurar variável CSS `--font-manrope` com `subsets: ['latin']` e `display: 'swap'`
- [x] 2.3 Atualizar objeto `metadata` com title e description reais
- [x] 2.4 Alterar `lang="en"` para `lang="pt-BR"` no elemento `<html>`
- [x] 2.5 Verificar que o token `--font-sans: var(--font-manrope)` da task_01 resolve na interface

## Implementation Details

Arquivo a modificar: `app/layout.tsx`.

A fonte Geist é importada de `next/font/google` — o processo de substituição por Manrope é idêntico. O token `--font-manrope` deve ter o mesmo nome que o referenciado em `globals.css` (task_01). Source Serif 4 **não** é carregada aqui — será usada apenas no template do PDF (lib/pdf/template.ts) e pode ser carregada inline naquele contexto se necessário no futuro.

Veja a seção "Integration Points — Google Fonts" do TechSpec para a estratégia de carregamento.

### Relevant Files

- `app/layout.tsx` — arquivo principal a modificar

### Dependent Files

- `app/globals.css` (task_01) — contém `--font-sans: var(--font-manrope)` que depende desta task para resolver
- Todos os componentes com `font-sans` (herdam automaticamente via CSS cascade)

### Related ADRs

- [ADR-003: Tokens de Design via @theme em globals.css (Tailwind v4)](../adrs/adr-003.md) — O token `--font-sans` no globals.css referencia `--font-manrope` definido aqui

## Deliverables

- `app/layout.tsx` atualizado com Manrope, metadados reais e `lang="pt-BR"`
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] Verificar que `app/layout.tsx` importa `Manrope` de `next/font/google` (não Geist)
  - [x] Verificar que `metadata.title` contém "Orça Fácil" (não "Create Next App")
  - [x] Verificar que `metadata.description` não é a string padrão do Next.js
  - [x] Verificar que o elemento `<html>` tem `lang="pt-BR"`
- Testes de integração:
  - [ ] `next build` sem warnings de fonte ausente
  - [ ] Página renderizada exibe Manrope como fonte (verificar no DevTools ou via snapshot)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Interface exibe Manrope em vez de Geist em todos os componentes
- Title da aba do navegador exibe "Orça Fácil — Orçamentos de Móveis Planejados para Marceneiros"
- `<html lang="pt-BR">` presente no HTML renderizado
