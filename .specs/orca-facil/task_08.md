---
status: pending
title: Wizard — Etapas 1 e 2 (cliente + ambientes)
type: frontend
complexity: high
dependencies:
  - task_02
  - task_04
  - task_06
  - task_07
---

# Task 08: Wizard — Etapas 1 e 2 (cliente + ambientes)

## Overview

Implementa o núcleo do produto: o wizard de criação de orçamento nas etapas 1 (seleção/criação de cliente) e 2 (adição de ambientes via templates ou catálogo próprio). O orçamento é persistido no Postgres ao avançar de etapa. Essa tarefa entrega o fluxo mais crítico para a métrica de ativação do PRD.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar shell do wizard em `/orcamentos/novo` com navegação entre 4 etapas (steps 1-4) e barra de progresso
- DEVE implementar o estado do wizard como Client Component com `useReducer` ou `useState` local; a persistência ocorre apenas ao avançar de etapa (veja seção "Autosave do wizard" do TechSpec)
- **Etapa 1 — Cliente**: campo de busca que chama `GET /api/customers?q=` com debounce; opção de selecionar cliente existente ou cadastrar novo inline (nome + telefone mínimos); ao selecionar/criar, chama `POST /api/quotes` que retorna `{ quote_id, version_id }` para ser usado nas etapas seguintes
- **Etapa 2 — Ambientes**: listar ambientes já adicionados; botão "Adicionar ambiente" que abre seletor de templates (dados de `GET /api/templates`) ou opção "Ambiente personalizado" (sem template); para cada ambiente, listar itens com quantidade editável; botão "Adicionar item" que abre seletor de catálogo próprio (`GET /api/catalog`) ou campo de item avulso; cada item adicionado faz `POST` no endpoint de items com snapshot de preço
- DEVE chamar `POST /api/quotes` ao avançar da etapa 1 para a 2, criando o orçamento no banco
- DEVE chamar `POST /api/quotes/[id]/versions/[vid]/rooms` ao adicionar ambiente
- DEVE chamar `POST /api/quotes/[id]/versions/[vid]/rooms/[rid]/items` ao adicionar item
- Ao adicionar ambiente de template, DEVE pré-popular itens via `POST` individual de cada item do template com snapshot
- DEVERIA desabilitar o botão "Avançar" da etapa 2 enquanto não houver ao menos um ambiente com um item
</requirements>

## Subtasks

- [ ] 8.1 Criar shell do wizard com steps, barra de progresso e navegação anterior/próximo
- [ ] 8.2 Implementar Etapa 1: busca e seleção de cliente + criação inline + `POST /api/quotes`
- [ ] 8.3 Criar Route Handlers: `POST /api/quotes`, `GET /api/templates`
- [ ] 8.4 Implementar Etapa 2: listagem de ambientes e botão de adição
- [ ] 8.5 Implementar seletor de templates com pré-população de itens
- [ ] 8.6 Criar Route Handlers: `POST /api/quotes/[id]/versions/[vid]/rooms`, `POST .../items`
- [ ] 8.7 Implementar adição de item do catálogo próprio com snapshot de preço

## Implementation Details

Veja as seções "API Endpoints → Orçamentos", "API Endpoints → Versões do orçamento", "API Endpoints → Ambientes e itens" e "Core Interfaces" do TechSpec para os contratos de todos os endpoints desta tarefa.

O `quote_id` retornado pelo `POST /api/quotes` deve ser armazenado no estado do wizard e incluído em todas as chamadas subsequentes de rooms e items. O wizard não deve criar novo orçamento se o usuário navegar para trás — deve reutilizar o `quote_id` já criado.

A pré-população de itens ao selecionar template deve fazer N chamadas `POST .../items` em paralelo (`Promise.all`), uma para cada `system_template_item`, copiando `name`, `type`, `unit` e usando `unit_price = 0` como padrão (o marceneiro precisa preencher os preços, pois os templates do sistema não têm preços — somente itens do catálogo próprio têm).

### Relevant Files

- `app/(app)/orcamentos/novo/page.tsx` — shell do wizard
- `components/wizard/step-client.tsx` — etapa 1
- `components/wizard/step-rooms.tsx` — etapa 2
- `components/wizard/room-item-form.tsx` — formulário de item avulso ou do catálogo
- `app/api/quotes/route.ts` — POST de criação de orçamento
- `app/api/templates/route.ts` — GET de templates do sistema
- `app/api/quotes/[id]/versions/[vid]/rooms/route.ts` — POST de ambiente
- `app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/route.ts` — POST de item

### Dependent Files

- `app/(app)/orcamentos/novo/` — etapas 3 e 4 (tasks 09 e 10) adicionam steps a este mesmo wizard
- `app/api/catalog/route.ts` (task_06) — usado na seleção de itens do catálogo
- `app/api/customers/route.ts` (task_07) — usado na busca de clientes

### Related ADRs

- [ADR-003: Snapshot de Preço nos Itens de Orçamento](adrs/adr-003.md) — ao adicionar item do catálogo, o preço atual é copiado para `quote_items.unit_price`

## Deliverables

- Wizard funcional com etapas 1 e 2 em mobile
- Orçamento criado no banco ao avançar da etapa 1 para 2
- Ambientes adicionados via template com itens pré-populados
- Itens do catálogo adicionados com snapshot de preço correto
- Route Handlers das etapas com validação e respostas tipadas
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração do fluxo completo das etapas 1 e 2 **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `POST /api/quotes` com `customer_id` nulo cria orçamento com `customer_id = null` (cliente avulso)
  - [ ] `POST /api/quotes` chama `next_quote_number` e armazena o número sequencial correto
  - [ ] `POST .../rooms` com `template_id` válido retorna 201 com `id` do novo ambiente
  - [ ] `POST .../items` com `unit_price: -5` retorna 400
  - [ ] `POST .../items` com campos de snapshot (`name`, `unit`, `unit_price`, `quantity`) persiste exatamente esses valores, sem join no catálogo
- Testes de integração:
  - [ ] Selecionar template "Cozinha" → ambiente criado com os itens do template pré-populados (verificar via `GET /api/quotes/[id]`)
  - [ ] Alterar preço de item do catálogo após adicionar ao orçamento → `quote_items.unit_price` permanece inalterado
  - [ ] Avançar para etapa 2 sem selecionar cliente → orçamento criado com `customer_id = null`
  - [ ] Criação inline de cliente na etapa 1 → cliente persistido em `customers` e associado ao orçamento

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Fluxo de etapas 1+2 concluível em < 3 minutos em mobile com template de cozinha
- Snapshot de preço correto para todos os itens adicionados do catálogo
- Orçamento salvo no banco ao avançar de etapa (não perde dados ao sair e voltar)
