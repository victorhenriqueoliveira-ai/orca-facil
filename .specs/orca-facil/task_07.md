---
status: pending
title: Módulo de clientes
type: frontend
complexity: medium
dependencies:
  - task_03
  - task_04
---

# Task 07: Módulo de clientes

## Overview

Implementa o cadastro e listagem de clientes do marceneiro com busca por nome ou telefone. O módulo elimina o retrabalho de redigitar dados de clientes recorrentes e provê o histórico de orçamentos por cliente — funcionalidade B do PRD.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar Route Handler `GET /api/customers` com busca por query string `?q=` (busca parcial em `name` e `phone`)
- DEVE criar Route Handler `POST /api/customers` com campos: `name` (obrigatório), `phone`, `email`, `address`, `notes`
- DEVE criar Route Handler `PATCH /api/customers/[id]` para atualização parcial de campos
- A página `/clientes` DEVE listar clientes com campo de busca em tempo real (debounce 300ms)
- DEVE ter modal/bottom sheet de criação e edição de cliente
- DEVE exibir histórico de orçamentos do cliente na página de detalhe `/clientes/[id]` (usa `quotes` já existentes, sem nova API — apenas query de orçamentos filtrados por `customer_id`)
- DEVERIA ordenar lista por `name` alfabeticamente
- DEVERIA exibir telefone formatado como número brasileiro
</requirements>

## Subtasks

- [ ] 7.1 Criar Route Handler `GET /api/customers` com busca
- [ ] 7.2 Criar Route Handler `POST /api/customers`
- [ ] 7.3 Criar Route Handler `PATCH /api/customers/[id]`
- [ ] 7.4 Criar página `/clientes` com lista e busca em tempo real
- [ ] 7.5 Criar modal/bottom sheet de criação e edição de cliente
- [ ] 7.6 Criar página `/clientes/[id]` com dados do cliente e histórico de orçamentos

## Implementation Details

Veja a seção "API Endpoints → Clientes" e "Data Models → customers" do TechSpec.

A busca `?q=` deve usar `ILIKE '%{q}%'` tanto em `name` quanto em `phone` com `OR`. Para o histórico de orçamentos em `/clientes/[id]`, fazer query direta em `quotes` com `WHERE customer_id = :id AND user_id = :userId ORDER BY created_at DESC` — sem novo endpoint dedicado.

### Relevant Files

- `app/(app)/clientes/page.tsx` — listagem com busca
- `app/(app)/clientes/[id]/page.tsx` — detalhe e histórico
- `app/api/customers/route.ts` — GET e POST
- `app/api/customers/[id]/route.ts` — PATCH
- `components/customer-form.tsx` — formulário reutilizável

### Dependent Files

- `app/(app)/orcamentos/novo/` (task_08) — usa `GET /api/customers?q=` para busca no step 1 do wizard
- `app/(app)/orcamentos/[id]/` (task_11) — exibe link para cliente associado

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- Página `/clientes` com busca funcional e lista
- Página `/clientes/[id]` com histórico de orçamentos
- CRUD de clientes via Route Handlers
- Busca em tempo real com debounce
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para busca e persistência **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `GET /api/customers?q=joão` retorna apenas clientes com "joão" no nome ou telefone (case-insensitive)
  - [ ] `GET /api/customers?q=` (vazio) retorna todos os clientes do usuário
  - [ ] `POST /api/customers` sem `name` retorna 400
  - [ ] `PATCH /api/customers/[id]` com body `{ phone: '11999999999' }` atualiza só o telefone, mantém demais campos
- Testes de integração:
  - [ ] Criar cliente, buscá-lo por nome parcial — aparece no resultado
  - [ ] Associar cliente a orçamento — aparece no histórico em `/clientes/[id]`
  - [ ] Usuário B não consegue buscar clientes do usuário A

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Busca em tempo real responde em < 500ms em mobile
- Formulário de cliente funciona com teclado numérico em campo de telefone
- Histórico de orçamentos exibe status e valor corretamente
