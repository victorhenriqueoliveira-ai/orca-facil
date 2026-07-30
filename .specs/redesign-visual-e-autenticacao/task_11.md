---
status: completed
title: Redesign páginas internas grupo 2: clientes + catálogo + config + assinar
type: frontend
complexity: high
dependencies:
  - task_09
---

# Task 11: Redesign páginas internas grupo 2: clientes + catálogo + config + assinar

## Overview

Aplica a nova identidade visual nas páginas de clientes, catálogo de materiais, configurações e assinatura. Segue a mesma estratégia da task_10: substituição sistemática de classes `blue-*`/`gray-*` pelos tokens do design system e adoção dos componentes UI base, sem alterar nenhuma lógica funcional.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC seção "Impact Analysis" para o nível de risco por página
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE substituir todas as ocorrências de `blue-600`, `blue-700`, `indigo-600` por `brand-primary` nas páginas do grupo
- DEVE substituir classes `gray-*` de fundo e borda pelos tokens semânticos `bg-bg-base` e `border-border`
- DEVE usar `<Button>` da task_04 nos botões de ação (ex.: "Adicionar Cliente", "Salvar Material")
- DEVE usar `<Card>` da task_04 nos cards de lista de clientes e catálogo
- DEVE garantir que a página `/assinar` usa `bg-brand-primary` no botão de CTA de assinatura
- DEVE atualizar metadados de cada página (título contextual via `generateMetadata` ou `metadata` exportado) — ex.: "Clientes — Orça Fácil"
- NÃO DEVE alterar nenhuma lógica de negócio, chamadas de API ou comportamento funcional
</requirements>

## Subtasks

- [ ] 11.1 Redesenhar `app/(app)/clientes/page.tsx` e `app/(app)/clientes/[id]/page.tsx`
- [ ] 11.2 Redesenhar `app/(app)/catalogo/page.tsx`
- [ ] 11.3 Redesenhar `app/(app)/configuracoes/page.tsx`
- [ ] 11.4 Redesenhar `app/(app)/assinar/page.tsx` com CTA em `brand-primary`
- [ ] 11.5 Adicionar `metadata` com título contextual em cada página do grupo
- [ ] 11.6 Verificar que nenhuma classe `blue-*` ou `indigo-*` permanece nas páginas do grupo

## Implementation Details

Arquivos a modificar:
- `app/(app)/clientes/page.tsx`
- `app/(app)/clientes/[id]/page.tsx`
- `app/(app)/catalogo/page.tsx`
- `app/(app)/configuracoes/page.tsx`
- `app/(app)/assinar/page.tsx`

Usar a mesma estratégia de grep da task_10 para localizar classes antes de editar. A página `/assinar` tem importância especial: o CTA de conversão ("Assinar agora") deve usar `Button` com variante `primary` e receber destaque visual com a cor terracota para maximizar conversão.

Os metadados contextuais devem ser adicionados via `export const metadata: Metadata = { title: 'Clientes — Orça Fácil' }` em cada `page.tsx` (Server Component).

### Relevant Files

- `app/(app)/clientes/page.tsx`, `app/(app)/clientes/[id]/page.tsx`
- `app/(app)/catalogo/page.tsx`
- `app/(app)/configuracoes/page.tsx`
- `app/(app)/assinar/page.tsx`

### Dependent Files

- Nenhum arquivo depende das páginas internas diretamente

### Related ADRs

- [ADR-003: Tokens de Design via @theme em globals.css (Tailwind v4)](../adrs/adr-003.md) — Tokens usados nas substituições

## Deliverables

- As 5 páginas do grupo redesenhadas sem classes `blue-*` ou `indigo-*`
- Metadados contextuais adicionados em cada página
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `app/(app)/clientes/page.tsx` não contém `blue-600` nem `indigo-600` (snapshot ou grep)
  - [ ] `app/(app)/catalogo/page.tsx` não contém `blue-600`
  - [ ] `app/(app)/assinar/page.tsx` contém `brand-primary` no botão de CTA
  - [ ] `app/(app)/clientes/page.tsx` exporta `metadata.title` contendo "Clientes"
  - [ ] `app/(app)/configuracoes/page.tsx` exporta `metadata.title` contendo "Configurações"
- Testes de integração:
  - [ ] Página de clientes carrega e exibe lista sem erros de console
  - [ ] Busca em tempo real de clientes continua funcional após redesign
  - [ ] Upload de logo em `/configuracoes` continua funcional
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Zero ocorrências de `blue-600`, `blue-700`, `indigo-600` nas 5 páginas do grupo
- Toda funcionalidade existente continua operacional
- Cada página exibe título contextual correto na aba do navegador
