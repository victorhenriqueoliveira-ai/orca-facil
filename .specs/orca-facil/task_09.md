---
status: pending
title: Wizard — Etapa 3 (revisão e totais com margem)
type: frontend
complexity: medium
dependencies:
  - task_08
---

# Task 09: Wizard — Etapa 3 (revisão e totais com margem)

## Overview

Implementa a tela de revisão do orçamento: exibe totais por ambiente, aplica margem de lucro configurável e mostra o valor global. O marceneiro pode editar quantidades e preços diretamente nesta tela antes de gerar o PDF. Não há novo endpoint — os dados já estão no banco após as etapas anteriores.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE buscar o orçamento completo via `GET /api/quotes/[id]` (inclui versions, rooms e items) ao entrar na etapa 3
- DEVE calcular total por ambiente: `SUM(item.unit_price * item.quantity)` para cada `quote_room`
- DEVE aplicar margem de lucro: `total_com_margem = total_bruto * (1 + profit_margin_pct / 100)`
- DEVE exibir total por ambiente e total global com margem destacado
- DEVE permitir editar `quantity` e `unit_price` de qualquer item diretamente na tela de revisão (inline edit), chamando `PATCH .../items/[id]` ao confirmar edição
- DEVE criar Route Handler `PATCH /api/quotes/[id]/versions/[vid]/rooms/[rid]/items/[iid]` para atualização de item
- DEVE exibir campo de margem de lucro (%) editável, inicialmente preenchido com o valor do perfil (`profiles.profit_margin_pct`); ao alterar aqui, chama `PATCH /api/quotes/[id]` para persistir a margem no orçamento
- DEVE criar Route Handler `PATCH /api/quotes/[id]` (se não criado na task_08)
- DEVERIA mostrar o total claramente formatado em BRL (R$ X.XXX,XX)
</requirements>

## Subtasks

- [ ] 9.1 Buscar e exibir orçamento completo na etapa 3 com totais calculados por ambiente
- [ ] 9.2 Implementar cálculo de total com margem de lucro (client-side, sem API extra)
- [ ] 9.3 Implementar edição inline de quantidade e preço de item na revisão
- [ ] 9.4 Criar Route Handler `PATCH .../items/[iid]` para atualizar item
- [ ] 9.5 Implementar campo de margem de lucro editável com persistência via `PATCH /api/quotes/[id]`
- [ ] 9.6 Exibir total global com margem em destaque visual

## Implementation Details

Veja as seções "API Endpoints → Ambientes e itens" e "Data Models → Core Interfaces" do TechSpec para os tipos `QuoteItem`, `QuoteRoom` e `QuoteVersion` usados nos cálculos.

O cálculo de total é puramente client-side (sem chamada de API) — os dados já foram buscados no carregamento da etapa. Só há chamada de API quando o usuário edita um item ou a margem:

```
total_ambiente = SUM(item.unit_price * item.quantity) // sem margem
total_com_margem = total_ambiente * (1 + margin / 100)
total_global = SUM(total_com_margem de todos os ambientes)
```

### Relevant Files

- `components/wizard/step-review.tsx` — componente da etapa 3
- `app/api/quotes/[id]/route.ts` — PATCH de cabeçalho do orçamento (margem, notas)
- `app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/[iid]/route.ts` — PATCH de item
- `lib/quotes/calculate.ts` — função pura de cálculo de totais (testável isoladamente)

### Dependent Files

- `app/(app)/orcamentos/novo/page.tsx` (task_08) — shell do wizard que hospeda este step
- `app/api/quotes/[id]/pdf/route.ts` (task_10) — usa os mesmos cálculos de total para o PDF

### Related ADRs

- [ADR-003: Snapshot de Preço nos Itens de Orçamento](adrs/adr-003.md) — a edição de preço aqui altera o snapshot do item no orçamento, não o catálogo

## Deliverables

- Etapa 3 do wizard com revisão completa e totais corretos
- Edição inline de itens funcionando
- Campo de margem persistindo no banco
- `lib/quotes/calculate.ts` com função pura de cálculo
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração para edição e cálculo **(OBRIGATÓRIO)**

## Tests

- Testes unitários (`lib/quotes/calculate.ts`):
  - [ ] `calculateTotal` com 2 itens (2 unid × R$100 e 3 unid × R$50) retorna R$350,00
  - [ ] `calculateTotal` com `margin_pct = 30` e total bruto R$1000 retorna R$1300,00
  - [ ] `calculateTotal` com `margin_pct = 0` retorna o mesmo que total bruto
  - [ ] `calculateTotal` com `quantity = 0.5` (decimal) calcula corretamente
- Testes de integração:
  - [ ] `PATCH .../items/[iid]` com `unit_price: 200` → `GET /api/quotes/[id]` reflete novo valor
  - [ ] `PATCH /api/quotes/[id]` com `profit_margin_pct: 25` → total exibido na etapa 3 atualiza corretamente
  - [ ] Editar quantidade de item na revisão → total por ambiente recalculado em tempo real no cliente

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Total formatado corretamente em BRL em todos os cenários
- Edição inline de item reflete no total sem reload da página
- Margem de lucro persiste no banco e é usada pelo PDF (task_10)
