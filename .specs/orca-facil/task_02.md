---
status: pending
title: Schema Postgres + RLS + seed de templates
type: infra
complexity: medium
dependencies:
  - task_01
---

# Task 02: Schema Postgres + RLS + seed de templates

## Overview

Cria o schema completo do banco de dados Postgres no Supabase: 10 tabelas, políticas de Row Level Security para todas elas, a função `next_quote_number` e o seed de templates de ambiente do sistema. Essa tarefa é a fundação de dados de todo o produto — nenhuma feature pode ser implementada sem ela.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar as 10 tabelas definidas na seção "Data Models" do TechSpec: `profiles`, `subscriptions`, `customers`, `catalog_items`, `system_templates`, `system_template_items`, `quotes`, `quote_versions`, `quote_rooms`, `quote_items`, `quote_pdfs`
- DEVE ativar RLS em todas as tabelas e criar políticas conforme definido na seção "Row Level Security" do TechSpec
- DEVE criar a função PL/pgSQL `next_quote_number(p_user_id uuid)` conforme o TechSpec
- DEVE criar `supabase/migrations/001_initial_schema.sql` com todas as definições de tabela e RLS
- DEVE criar `supabase/seed.sql` com os templates iniciais para: cozinha, quarto (roupeiro), sala, escritório, banheiro e área de serviço — cada um com ao menos 4 itens padrão
- DEVE configurar os dois buckets no Supabase Storage: `logos` (privado) e `pdfs` (privado)
- DEVE validar que políticas RLS impedem usuário A de ler dados do usuário B
- DEVERIA usar Supabase CLI (`supabase db push` ou `supabase migration up`) para versionamento das migrations
</requirements>

## Subtasks

- [ ] 2.1 Escrever migration com todas as tabelas, constraints e índices
- [ ] 2.2 Escrever políticas RLS para cada tabela conforme o TechSpec
- [ ] 2.3 Criar função `next_quote_number` em PL/pgSQL
- [ ] 2.4 Criar `supabase/seed.sql` com templates dos 6 ambientes padrão
- [ ] 2.5 Configurar buckets `logos` e `pdfs` no Supabase Storage
- [ ] 2.6 Executar migrations e seed no ambiente Supabase local
- [ ] 2.7 Validar isolamento de dados via RLS com dois usuários de teste

## Implementation Details

Veja a seção "Data Models → Schema Postgres" e "Data Models → Row Level Security" do TechSpec para o schema completo, constraints, checks e políticas.

Estrutura de arquivos após esta tarefa:
```
supabase/
  migrations/
    001_initial_schema.sql
  seed.sql
  config.toml
```

Índices recomendados para queries frequentes (veja seção "Monitoring and Observability" do TechSpec):
- `CREATE INDEX ON quotes(user_id, status)`
- `CREATE INDEX ON customers(user_id)`
- `CREATE INDEX ON catalog_items(user_id, is_active)`

### Relevant Files

- `supabase/migrations/001_initial_schema.sql` — schema completo com tabelas, RLS e função
- `supabase/seed.sql` — dados iniciais de templates do sistema
- `supabase/config.toml` — configuração do projeto Supabase local

### Dependent Files

- `lib/supabase/client.ts`, `lib/supabase/server.ts` (task_01) — usarão este schema para todas as queries
- Todas as tasks de feature (03-14) dependem deste schema

### Related ADRs

- [ADR-003: Snapshot de Preço nos Itens de Orçamento](adrs/adr-003.md) — explica por que `quote_items` armazena snapshot e `catalog_item_id` é referência opcional sem FK constraint
- [ADR-004: Templates do Sistema no Postgres com Seed](adrs/adr-004.md) — justifica `system_templates` como tabela seeded, não código estático

## Deliverables

- `supabase/migrations/001_initial_schema.sql` com schema completo
- `supabase/seed.sql` com 6 templates e seus itens
- Políticas RLS validadas por testes
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para isolamento RLS **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `next_quote_number` retorna 1 para usuário sem orçamentos anteriores
  - [ ] `next_quote_number` retorna `MAX(quote_number) + 1` para usuário com orçamentos existentes
  - [ ] `next_quote_number` com dois usuários diferentes retorna sequências independentes
- Testes de integração (usando Supabase local):
  - [ ] Usuário autenticado como A não consegue `SELECT` em `quotes` do usuário B (retorna 0 rows)
  - [ ] Usuário autenticado como A não consegue `INSERT` em `customers` com `user_id` do usuário B (retorna erro RLS)
  - [ ] `SELECT` em `system_templates` retorna todos os 6 templates para qualquer usuário autenticado
  - [ ] `INSERT` em `system_templates` via client autenticado falha (sem permissão de escrita)
  - [ ] Upload para bucket `logos` com path `{outro_user_id}/logo.png` falha para usuário A

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Migration executa sem erros em ambiente Supabase local e em produção
- Seed popula 6 templates com itens corretos
- RLS validado: nenhum vazamento de dados entre usuários
- Todos os 10 buckets/tabelas configurados com os constraints e checks definidos no TechSpec
