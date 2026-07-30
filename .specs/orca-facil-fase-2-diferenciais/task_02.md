---
status: completed
title: "JSON de fallback do catálogo regional"
type: backend
complexity: low
dependencies: []
---

# Task 02: JSON de fallback do catálogo regional

## Overview

Cria o arquivo `lib/catalog/regional-defaults.ts` com dados estáticos de materiais e serviços de marcenaria por estado brasileiro. Esses dados são usados como fallback pelo endpoint `GET /api/catalog/regional-suggestions` quando a fonte externa estiver indisponível ou ainda não configurada.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE exportar o tipo `RegionalItem` com campos `name: string`, `type: 'material' | 'service'`, `unit: string`, `unit_price: number`.
- DEVE exportar `REGIONAL_DEFAULTS: Record<string, RegionalItem[]>` com ao menos um item por cada uma das 27 UFs do Brasil.
- DEVE conter ao menos 10 itens por UF cobrindo materiais comuns (MDF 15mm, MDF 18mm, ferragens, dobradiça, corrediça) e serviços (mão de obra hora, montagem projeto).
- DEVE ter `unit_price > 0` em todos os itens.
- DEVE incluir comentário com a data da revisão dos preços no topo do arquivo.
- NÃO DEVE depender de banco de dados, API externa ou qualquer estado global.
</requirements>

## Subtasks

- [x] 2.1 Definir interface `RegionalItem` e tipo do mapa `REGIONAL_DEFAULTS`
- [x] 2.2 Preencher dados para as regiões Sul e Sudeste (SP, RJ, MG, PR, SC, RS)
- [x] 2.3 Preencher dados para as demais regiões (Centro-Oeste, Nordeste, Norte)
- [x] 2.4 Verificar que todas as 27 UFs estão representadas e todos os `unit_price > 0`

## Implementation Details

Veja a seção "ADR-005 — Notas de Implementação" do TechSpec para a estrutura exata do tipo e exemplo de dados. O arquivo deve ser um módulo TypeScript puro sem imports externos.

Os preços de referência devem ser compatíveis com o mercado 2026 para marcenaria autônoma: MDF 15mm m² entre R$75–95 dependendo da região, mão de obra hora entre R$60–90.

### Relevant Files

- `lib/catalog/` — diretório a criar (não existe ainda)
- `lib/email/templates/trial-reminder.ts` — referência de padrão de exportação de módulo tipado

### Dependent Files

- `app/api/catalog/regional-suggestions/route.ts` (task_15) — importa `REGIONAL_DEFAULTS`

### Related ADRs

- [ADR-005: Dados de fallback do catálogo regional como JSON estático](adrs/adr-005.md) — fundamenta a escolha deste padrão

## Deliverables

- `lib/catalog/regional-defaults.ts` com dados de 27 UFs
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `REGIONAL_DEFAULTS` contém exatamente 27 chaves correspondentes às UFs brasileiras (AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO)
  - [x] Todos os itens de todas as UFs têm `unit_price > 0`
  - [x] Todos os itens têm `type` igual a `'material'` ou `'service'`
  - [x] Todos os itens têm `unit` não vazio
  - [x] Cada UF tem ao menos 5 itens
  - [x] O tipo `RegionalItem` tem todos os campos obrigatórios (name, type, unit, unit_price)
- Testes de integração:
  - [x] Import direto de `REGIONAL_DEFAULTS['SP']` retorna array com ao menos 5 itens sem erro de runtime
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Todas as 27 UFs presentes no mapa
- Nenhum item com `unit_price <= 0` ou campos faltando
