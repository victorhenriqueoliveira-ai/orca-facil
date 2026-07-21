---
status: pending
title: Gestão de orçamentos (lista, filtros, duplicar, status)
type: frontend
complexity: medium
dependencies:
  - task_10
---

# Task 11: Gestão de orçamentos (lista, filtros, duplicar, status)

## Overview

Implementa a tela de listagem de orçamentos com filtros por status e período, duplicação de orçamento existente, atualização manual de status e visualização/download do PDF já gerado. É a tela de "Orçamentos" da bottom nav — o marceneiro acompanha toda sua carteira aqui.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar Route Handler `GET /api/quotes` com filtros opcionais `?status=&page=&limit=` e paginação simples (cursor ou offset)
- DEVE criar Route Handler `POST /api/quotes/[id]/duplicate` que copia o orçamento inteiro (novo `quote_number`, status `draft`, mesmas versions/rooms/items)
- DEVE criar Route Handler `PATCH /api/quotes/[id]` para atualizar `status` manualmente (se não criado em task_09)
- A página `/orcamentos` DEVE listar orçamentos com: número sequencial, nome do cliente, valor total com margem, status badge, data
- DEVE ter filtros por status (todos/rascunho/enviado/aprovado/cancelado) como chips horizontais em mobile
- DEVE ter ação "Duplicar" em cada orçamento (swipe ou menu de contexto)
- DEVE ter ação "Ver PDF" que gera URL assinada do último PDF do orçamento (via `quote_pdfs` — não regera o PDF, apenas retorna a última `signed_url`)
- DEVE ter ação de atualização de status manual (ex.: "Marcar como aprovado")
- DEVERIA criar Route Handler `GET /api/quotes/[id]/pdf/latest` que retorna a signed URL do PDF mais recente em `quote_pdfs` para o orçamento
</requirements>

## Subtasks

- [ ] 11.1 Criar Route Handler `GET /api/quotes` com filtros e paginação
- [ ] 11.2 Criar Route Handler `POST /api/quotes/[id]/duplicate`
- [ ] 11.3 Criar/completar Route Handler `PATCH /api/quotes/[id]` para status
- [ ] 11.4 Criar Route Handler `GET /api/quotes/[id]/pdf/latest`
- [ ] 11.5 Criar página `/orcamentos` com lista, filtros e cards de orçamento
- [ ] 11.6 Implementar ação de duplicar com feedback e navegação para novo orçamento
- [ ] 11.7 Implementar ação "Ver PDF" que abre PDF na nova aba

## Implementation Details

Veja a seção "API Endpoints → Orçamentos" do TechSpec para o contrato de `GET /api/quotes` e `POST /api/quotes/[id]/duplicate`.

A duplicação DEVE clonar recursivamente: `quotes` → `quote_versions` → `quote_rooms` → `quote_items`. Gerar novo `quote_number` via `next_quote_number()`. O orçamento duplicado inicia com `status = 'draft'` e sem registros em `quote_pdfs`.

`GET /api/quotes/[id]/pdf/latest` busca o registro mais recente em `quote_pdfs WHERE quote_id = :id ORDER BY generated_at DESC LIMIT 1` e gera nova URL assinada para o `storage_path` (a URL assinada existente pode ter expirado).

### Relevant Files

- `app/(app)/orcamentos/page.tsx` — listagem de orçamentos
- `app/api/quotes/route.ts` — GET com filtros
- `app/api/quotes/[id]/route.ts` — PATCH de status
- `app/api/quotes/[id]/duplicate/route.ts` — POST de duplicação
- `app/api/quotes/[id]/pdf/latest/route.ts` — GET de URL do PDF mais recente
- `components/quote-card.tsx` — card de orçamento na listagem

### Dependent Files

- `app/(app)/clientes/[id]/page.tsx` (task_07) — histórico de orçamentos por cliente usa a mesma query de `quotes`

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- Página `/orcamentos` com lista, filtros e ações
- Duplicação de orçamento funcionando (clona todos os dados)
- Atualização de status manual
- Acesso ao PDF gerado anteriormente via nova signed URL
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração de duplicação e filtros **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `GET /api/quotes?status=sent` retorna apenas orçamentos com status `sent`
  - [ ] `GET /api/quotes?status=draft&page=2&limit=10` retorna paginação correta
  - [ ] `POST /api/quotes/[id]/duplicate` cria novo orçamento com `status = 'draft'` e `quote_number` diferente
  - [ ] Orçamento duplicado tem os mesmos ambientes e itens do original (verificar recursividade)
- Testes de integração:
  - [ ] Duplicar orçamento com 2 versões e 3 ambientes — duplicata tem estrutura idêntica
  - [ ] `GET /api/quotes/[id]/pdf/latest` após task_10 retorna URL assinada válida
  - [ ] Atualizar status para `'approved'` via `PATCH /api/quotes/[id]` — reflete no card da listagem

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Listagem carrega em < 2s com até 50 orçamentos
- Duplicação completa em < 3s mesmo com orçamento complexo (3 ambientes, 10 itens cada)
- Filtros de status respondem instantaneamente (filtro client-side ou rápida re-fetch)
