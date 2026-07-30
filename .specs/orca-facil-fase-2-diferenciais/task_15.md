---
status: completed
title: "Endpoints + tela de onboarding do catálogo regional"
type: backend
complexity: medium
dependencies:
  - task_01
  - task_02
---

# Task 15: Endpoints + tela de onboarding do catálogo regional

## Overview

Cria o endpoint `GET /api/catalog/regional-suggestions` e o fluxo de onboarding que oferece ao marceneiro um catálogo base pré-preenchido com preços regionais ao concluir o cadastro. Usa o JSON estático de fallback (task_02) como fonte de dados conforme ADR-005.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar `app/api/catalog/regional-suggestions/route.ts` com handler `GET` autenticado.
- O endpoint DEVE derivar o estado (UF) do perfil do usuário autenticado (`city` ou campo de UF — verificar schema).
- DEVE retornar `RegionalItem[]` da UF correspondente usando `REGIONAL_DEFAULTS` de `lib/catalog/regional-defaults.ts` (task_02).
- DEVE retornar 200 com array vazio quando a UF não for encontrada em `REGIONAL_DEFAULTS` (não 404).
- DEVE criar `POST /api/catalog/regional-suggestions/import` que recebe `{ item_ids: string[] }` ou `{ all: true }` e insere os itens selecionados na tabela `catalog_items` do usuário.
- O import DEVE verificar se o item já existe (por nome) e pular duplicatas (não gerar erro).
- DEVE criar a tela de onboarding de catálogo regional (localizar onde é mostrada após o cadastro — provavelmente em `app/(app)/` ou como modal no primeiro acesso).
- A tela DEVE exibir a lista de sugestões regionais com checkbox por item e botão "Importar selecionados".
- DEVE exibir botão "Pular por agora" para marceneiros que não querem usar o catálogo pré-preenchido.
- DEVE marcar o onboarding como concluído (campo em profiles ou cookie) para não exibir novamente.
</requirements>

## Subtasks

- [x] 15.1 Criar `GET /api/catalog/regional-suggestions` retornando itens da UF do usuário
- [x] 15.2 Criar `POST /api/catalog/regional-suggestions/import` com inserção em lote ignorando duplicatas
- [x] 15.3 Criar tela de onboarding de catálogo com lista de itens, checkboxes e botões de ação
- [x] 15.4 Implementar lógica para não exibir onboarding novamente após conclusão ou skip
- [x] 15.5 Adicionar testes unitários para os endpoints e o fluxo de import

## Implementation Details

Veja as seções "API Endpoints — Endpoints novos" e "ADR-005 — Notas de Implementação" do TechSpec para os contratos exatos.

O campo de UF do usuário: verificar `profiles.city` para extrair o estado — se `city` for texto livre (ex.: "São Paulo - SP"), extrair os dois últimos caracteres como UF. Alternativamente, verificar se há campo `state` no schema de `profiles`. Consultar `supabase/migrations/001_initial_schema.sql`.

O import em lote usa `INSERT INTO catalog_items (...) VALUES ... ON CONFLICT (user_id, name) DO NOTHING` para pular duplicatas sem erro.

A tela de onboarding pode ser um modal exibido na primeira visita ao catálogo (verificar `profiles.catalog_onboarded_at` ou similar — se não existir, adicionar via migration ou usar localStorage como alternativa simples).

### Relevant Files

- `lib/catalog/regional-defaults.ts` (task_02) — fonte de dados de sugestões regionais
- `supabase/migrations/001_initial_schema.sql` — schema de `profiles` e `catalog_items`
- `app/api/catalog/route.ts` — padrão de endpoint de catálogo existente
- `app/(app)/` — verificar estrutura de rotas para posicionar a tela de onboarding

### Dependent Files

- `lib/catalog/regional-defaults.ts` (task_02) — DEVE existir antes desta task

### Related ADRs

- [ADR-005: Dados de fallback do catálogo regional como JSON estático](adrs/adr-005.md) — justifica o uso de `REGIONAL_DEFAULTS` em vez de fonte externa

## Deliverables

- `app/api/catalog/regional-suggestions/route.ts` (GET)
- `app/api/catalog/regional-suggestions/import/route.ts` (POST)
- Tela de onboarding de catálogo regional
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `GET /api/catalog/regional-suggestions` sem sessão retorna 401
  - [x] `GET /api/catalog/regional-suggestions` com usuário de SP retorna itens de `REGIONAL_DEFAULTS['SP']`
  - [x] `GET /api/catalog/regional-suggestions` com usuário de UF não mapeada retorna 200 com array vazio
  - [x] `POST /api/catalog/regional-suggestions/import` com `{ all: true }` insere todos os itens da UF
  - [x] `POST /api/catalog/regional-suggestions/import` ignora itens já existentes (sem erro de duplicata)
  - [x] Tela de onboarding exibe lista de itens da UF do usuário com checkboxes
  - [x] Clicar em "Pular por agora" fecha o onboarding sem importar nada
  - [x] Após importar, onboarding não é exibido novamente
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Sugestões regionais corretas retornadas para UF do usuário
- Import em lote sem erros de duplicata
- Onboarding exibido apenas uma vez após o cadastro
