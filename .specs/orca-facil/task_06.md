---
status: pending
title: Catálogo próprio (materiais e serviços)
type: frontend
complexity: medium
dependencies:
  - task_03
  - task_04
---

# Task 06: Catálogo próprio (materiais e serviços)

## Overview

Implementa o catálogo de materiais e serviços do marceneiro — a lista de itens com preços que ele configura uma vez e reutiliza em todos os orçamentos. O catálogo é opcional: orçamentos podem ser criados usando apenas os templates do sistema (task_02), mas marceneiros com itens próprios precisam cadastrá-los aqui.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar Route Handler `GET /api/catalog` que lista itens com `?include_inactive=true` como flag opcional
- DEVE criar Route Handler `POST /api/catalog` que cria item com campos: `name`, `type` ('material'|'service'), `unit`, `unit_price`
- DEVE criar Route Handler `PATCH /api/catalog/[id]` que atualiza campos parciais e permite alternar `is_active`
- DEVE validar `unit_price >= 0` e que `type` é 'material' ou 'service'
- A página DEVE listar materiais e serviços em abas separadas
- DEVE ter botão de adicionar item (abre bottom sheet/modal em mobile) com formulário simples
- DEVE permitir inativar item (sem exclusão) via toggle ou swipe action
- DEVE separar visualmente itens ativos de inativos
- DEVERIA ordenar lista alfabeticamente por nome
</requirements>

## Subtasks

- [ ] 6.1 Criar Route Handler `GET /api/catalog`
- [ ] 6.2 Criar Route Handler `POST /api/catalog` com validação
- [ ] 6.3 Criar Route Handler `PATCH /api/catalog/[id]` para edição e inativação
- [ ] 6.4 Criar página `/catalogo` com abas Materiais / Serviços
- [ ] 6.5 Criar bottom sheet/modal de adição e edição de item
- [ ] 6.6 Implementar toggle de inativação na listagem

## Implementation Details

Veja a seção "API Endpoints → Catálogo" e "Data Models → catalog_items" do TechSpec para campos e validações.

A inativação não exclui o registro — apenas alterna `is_active = false`. Isso preserva o nome/unidade nos `quote_items` já criados (que têm snapshot, conforme ADR-003), mas remove o item da seleção em novos orçamentos.

### Relevant Files

- `app/(app)/catalogo/page.tsx` — página de listagem do catálogo
- `app/api/catalog/route.ts` — GET e POST
- `app/api/catalog/[id]/route.ts` — PATCH
- `components/catalog-item-form.tsx` — formulário de criação/edição

### Dependent Files

- `app/(app)/orcamentos/novo/` (task_08) — busca itens do catálogo para oferecer na seleção de ambientes
- `app/api/quotes/.../items/route.ts` (task_08) — valida se o item do catálogo existe antes de criar snapshot

### Related ADRs

- [ADR-003: Snapshot de Preço nos Itens de Orçamento](adrs/adr-003.md) — inativar item do catálogo não afeta orçamentos existentes porque os itens já têm snapshot

## Deliverables

- Página `/catalogo` com abas e lista de itens
- CRUD completo de itens via Route Handlers
- Toggle de inativação funcionando
- Formulário de adição/edição validado
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para CRUD e validações **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `POST /api/catalog` com `unit_price: -1` retorna 400
  - [ ] `POST /api/catalog` com `type: 'produto'` retorna 400 (tipo inválido)
  - [ ] `PATCH /api/catalog/[id]` com `is_active: false` retorna 200 e item não aparece em `GET /api/catalog` (sem flag)
  - [ ] `GET /api/catalog?include_inactive=true` retorna itens ativos e inativos
- Testes de integração:
  - [ ] Criar item via `POST`, buscar via `GET`, editar via `PATCH` — dados persistem corretamente
  - [ ] Item inativado não aparece na listagem padrão mas aparece com `?include_inactive=true`
  - [ ] Usuário B não consegue editar item do usuário A (RLS)

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Adição de novo item reflete na lista sem reload da página
- Inativação não apaga item do banco
- Formulário acessível em mobile com teclado numérico para `unit_price`
