---
status: completed
title: Redesign páginas internas grupo 1: dashboard + orçamentos
type: frontend
complexity: high
dependencies:
  - task_09
---

# Task 10: Redesign páginas internas grupo 1: dashboard + orçamentos

## Overview

Aplica a nova identidade visual do Orca Fácil nas páginas de dashboard e no grupo de orçamentos (lista, detalhe e wizard de criação). Substitui todas as classes Tailwind `blue-*`, `indigo-*` e `gray-*` pelos tokens do design system, e atualiza componentes ad-hoc (cards, botões, badges inline) pelos componentes UI base da task_04.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC seção "Impact Analysis" para a lista de mudanças esperadas por componente
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE substituir todas as ocorrências de `blue-600`, `blue-700`, `indigo-600` por `brand-primary` nas páginas do grupo
- DEVE substituir `gray-50`, `gray-100`, `gray-200`, `gray-300` por `bg-bg-base` ou `border-border` conforme o contexto semântico
- DEVE substituir `text-gray-900`, `text-gray-700`, `text-gray-600` por `text-text-base` ou variações semânticas
- DEVE usar `<Button>` da task_04 nos botões de ação principal (ex.: "+ Novo", "Criar Orçamento", "Salvar")
- DEVE usar `<Badge>` da task_04 para os badges de status de orçamento (Rascunho, Enviado, Aprovado, Rejeitado, Expirado)
- DEVE usar `<Card>` da task_04 nos cards de lista de orçamentos
- DEVE garantir que os estados de vazio (zero orçamentos) e loading estão redesenhados com a nova paleta
- NÃO DEVE alterar nenhuma lógica de negócio, chamadas de API ou comportamento funcional
</requirements>

## Subtasks

- [ ] 10.1 Redesenhar `app/(app)/dashboard/page.tsx` com nova paleta e componentes UI base
- [ ] 10.2 Redesenhar `app/(app)/orcamentos/page.tsx` (lista com filtros e cards)
- [ ] 10.3 Redesenhar `app/(app)/orcamentos/[id]/page.tsx` (detalhe, ações, PDF)
- [ ] 10.4 Redesenhar `app/(app)/orcamentos/novo/page.tsx` (wizard de criação)
- [ ] 10.5 Verificar que nenhuma classe `blue-*` ou `indigo-*` permanece nas páginas do grupo

## Implementation Details

Arquivos a modificar:
- `app/(app)/dashboard/page.tsx`
- `app/(app)/orcamentos/page.tsx`
- `app/(app)/orcamentos/[id]/page.tsx`
- `app/(app)/orcamentos/novo/page.tsx`
- Componentes de wizard em `components/wizard/` se existirem

Estratégia: usar grep para localizar todas as ocorrências de classes `blue-`, `indigo-` e `gray-` nas páginas do grupo antes de editar. Substituir sistematicamente seguindo o mapeamento: `blue-600`/`blue-700` → `brand-primary`, `gray-200`/`gray-300` → `border`/`border-border`, `gray-50`/`gray-100` → `bg-bg-base`.

Veja a seção "Impact Analysis" do TechSpec para o nível de risco de cada arquivo.

### Relevant Files

- `app/(app)/dashboard/page.tsx`
- `app/(app)/orcamentos/page.tsx`
- `app/(app)/orcamentos/[id]/page.tsx`
- `app/(app)/orcamentos/novo/page.tsx`
- `components/wizard/` — componentes do wizard de criação de orçamento

### Dependent Files

- Nenhum arquivo depende das páginas internas diretamente; mudanças são de apresentação

### Related ADRs

- [ADR-003: Tokens de Design via @theme em globals.css (Tailwind v4)](../adrs/adr-003.md) — Tokens que substituem as classes hardcoded

## Deliverables

- As 4 páginas do grupo redesenhadas sem classes `blue-*` ou `indigo-*`
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `app/(app)/dashboard/page.tsx` não contém as strings `blue-600`, `blue-700`, `indigo-600` (snapshot ou grep)
  - [ ] `app/(app)/orcamentos/page.tsx` não contém `blue-600` nem `indigo-600`
  - [ ] Badge de status "Enviado" usa variante `neutral` ou `warning` (não `blue-*`)
  - [ ] Badge de status "Aprovado" usa variante `success`
  - [ ] Badge de status "Rejeitado" usa variante `error`
  - [ ] Estado de lista vazia (zero orçamentos) renderiza mensagem e CTA com nova paleta
- Testes de integração:
  - [ ] Página de lista de orçamentos carrega e exibe cards com nova paleta sem erros de console
  - [ ] Ação "Marcar como enviado" continua funcional após redesign
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Zero ocorrências de `blue-600`, `blue-700`, `indigo-600` nas 4 páginas do grupo
- Todas as ações funcionais (criar, duplicar, mudar status, gerar PDF) continuam funcionando
- Layout correto em 375px (mobile) e 1440px (desktop com sidebar)
