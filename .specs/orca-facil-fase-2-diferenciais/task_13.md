---
status: completed
title: "Dashboard de conversão"
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 13: Dashboard de conversão

## Overview

Cria o endpoint `GET /api/metrics/conversion` e a tela de dashboard de conversão que exibe as métricas de desempenho do marceneiro: orçamentos enviados vs. aprovados, taxa de conversão, ticket médio e valor total aprovado no período selecionado.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `app/api/metrics/conversion/route.ts` com handler `GET` autenticado.
- DEVE aceitar query params `period_start` e `period_end` (ISO 8601) para filtro de período.
- DEVE retornar JSON no formato `ConversionMetrics` conforme definido no TechSpec: `{ sent, approved, conversion_rate, avg_ticket, total_approved, period_start, period_end }`.
- `conversion_rate` DEVE ser calculado como `(approved / sent) * 100` (0 quando `sent = 0`).
- `avg_ticket` DEVE ser a média dos valores totais dos orçamentos com `status = 'accepted'` no período.
- `total_approved` DEVE ser a soma dos valores totais dos orçamentos com `status = 'accepted'` no período.
- Os valores monetários DEVEM ser somados a partir dos `quote_versions` (usar a versão mais recente de cada orçamento, ou a versão aprovada).
- DEVE criar página de dashboard em `app/(app)/dashboard/page.tsx` (ou rota equivalente) com seletor de período e exibição das métricas.
- O período padrão DEVE ser o mês atual.
</requirements>

## Subtasks

- [x] 13.1 Criar `app/api/metrics/conversion/route.ts` com as queries de contagem e soma
- [x] 13.2 Implementar cálculo de `conversion_rate`, `avg_ticket` e `total_approved`
- [x] 13.3 Criar página de dashboard com seletor de período (mês atual como padrão)
- [x] 13.4 Adicionar cards de métricas com formatação monetária brasileira (R$)
- [x] 13.5 Adicionar testes unitários para o endpoint e os cálculos de métricas

## Implementation Details

Veja as seções "Core Interfaces — ConversionMetrics" e "API Endpoints — Endpoints novos" do TechSpec para os contratos exatos.

A query de valor total dos orçamentos aprovados soma a partir dos `quote_versions` associados a cada orçamento. Verificar se o schema tem um campo de total calculado nas versões ou se precisa somar os `quote_items`.

A página de dashboard usa filtro de período com dois `<input type="date">` ou um seletor de mês pré-definido (Jan/Fev/.../Dez + Ano). Os valores são formatados com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.

### Relevant Files

- `app/api/quotes/route.ts` — padrão de query com filtros de período
- `supabase/migrations/001_initial_schema.sql` — estrutura de `quote_versions` e `quote_items`
- `app/(app)/` — verificar estrutura de rotas existente para posicionar o dashboard

### Dependent Files

- `app/(app)/layout.tsx` — adicionar link de navegação para o dashboard

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- `app/api/metrics/conversion/route.ts`
- Página de dashboard em `app/(app)/dashboard/page.tsx`
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `GET /api/metrics/conversion` sem sessão retorna 401
  - [ ] `GET /api/metrics/conversion` sem orçamentos retorna `{ sent: 0, approved: 0, conversion_rate: 0, avg_ticket: 0, total_approved: 0 }`
  - [ ] `conversion_rate` retorna 0 quando `sent = 0` (não divide por zero)
  - [ ] `GET /api/metrics/conversion?period_start=2026-01-01&period_end=2026-01-31` filtra apenas orçamentos do período
  - [ ] Com 10 enviados e 4 aprovados: `conversion_rate = 40`
  - [ ] `avg_ticket` é a média correta dos valores dos orçamentos aprovados
  - [ ] `total_approved` é a soma correta dos valores dos orçamentos aprovados
  - [ ] Orçamentos com `status = 'draft'` NÃO são contados em `sent`
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Dashboard exibe métricas corretas para o período selecionado
- Formato monetário em Real brasileiro (R$)
- Taxa de conversão exibida como percentual
