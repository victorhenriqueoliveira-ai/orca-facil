---
status: pending
title: Múltiplas versões de orçamento
type: frontend
complexity: high
dependencies:
  - task_10
---

# Task 12: Múltiplas versões de orçamento

## Overview

Adiciona suporte a variantes (versões) de um mesmo orçamento — ex.: "Padrão" e "Premium" — com ambientes e itens independentes por versão. Inclui a UI de gerenciamento de versões no wizard, os endpoints de criação/edição/remoção de versões e a geração de PDF comparativo quando múltiplas versões são selecionadas.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar Route Handler `POST /api/quotes/[id]/versions` para criar nova variante com `{ name }` — o orçamento sempre tem ao menos 1 versão (criada na task_08)
- DEVE criar Route Handler `PATCH /api/quotes/[id]/versions/[vid]` para renomear variante
- DEVE criar Route Handler `DELETE /api/quotes/[id]/versions/[vid]` que proíbe deletar se for a única versão restante (retorna 409)
- A UI de etapa 2 do wizard DEVE exibir abas de versões com opção de adicionar nova versão
- O usuário DEVE conseguir trocar de versão para editar ambientes/itens de cada versão independentemente
- A etapa 4 (envio) DEVE mostrar selector de versões para escolher quais incluir no PDF
- `POST /api/quotes/[id]/pdf` (task_10) DEVE já suportar `version_ids` múltiplos — verificar se implementação está completa
- O HTML do PDF com múltiplas versões DEVE incluir tabela comparativa no topo (versão A × versão B, totais lado a lado) seguida do detalhamento de cada versão selecionada
- DEVERIA iniciar o seletor de versões na etapa 4 com todas as versões marcadas por padrão
</requirements>

## Subtasks

- [ ] 12.1 Criar Route Handler `POST /api/quotes/[id]/versions`
- [ ] 12.2 Criar Route Handler `PATCH /api/quotes/[id]/versions/[vid]`
- [ ] 12.3 Criar Route Handler `DELETE /api/quotes/[id]/versions/[vid]` com guard de mínimo 1 versão
- [ ] 12.4 Adicionar abas de versões na etapa 2 do wizard com troca de contexto
- [ ] 12.5 Implementar botão "Adicionar versão" com modal de nome
- [ ] 12.6 Implementar seletor de versões na etapa 4 antes de gerar PDF
- [ ] 12.7 Atualizar template HTML do PDF para suportar tabela comparativa multi-versão

## Implementation Details

Veja as seções "API Endpoints → Versões do orçamento" e "Features Principais → 5. Múltiplas Versões de Orçamento" do PRD e TechSpec para os contratos e comportamentos esperados.

A troca de versão na etapa 2 NÃO recarrega a página — apenas muda qual `version_id` está ativo no estado do wizard. Os ambientes/itens são buscados para a versão ativa. A versão padrão (criada em task_08) tem `name = 'Padrão'` e `sort_order = 0`.

Tabela comparativa no PDF (multi-versão):
```
| Ambiente       | Versão Padrão | Versão Premium |
|----------------|--------------|----------------|
| Cozinha        | R$ 5.000     | R$ 8.000       |
| Quarto         | R$ 3.000     | R$ 5.000       |
| **Total**      | **R$ 8.000** | **R$ 13.000**  |
```

### Relevant Files

- `app/api/quotes/[id]/versions/route.ts` — POST de nova versão
- `app/api/quotes/[id]/versions/[vid]/route.ts` — PATCH e DELETE
- `components/wizard/step-rooms.tsx` (task_08) — adicionar abas de versões
- `components/wizard/step-send.tsx` (task_10) — adicionar seletor de versões
- `lib/pdf/template.ts` (task_10) — atualizar para suportar multi-versão com tabela comparativa

### Dependent Files

- `app/api/quotes/[id]/pdf/route.ts` (task_10) — já recebe `version_ids[]`, verificar completude para multi-versão

### Related ADRs

- [ADR-001: Escopo Completo (A+B+C)](adrs/adr-001.md) — múltiplas versões é a feature C, justificada como diferencial de fechamento de venda

## Deliverables

- Abas de versões funcionando na etapa 2 do wizard
- CRUD de versões via Route Handlers
- Seletor de versões na etapa 4
- PDF comparativo com tabela multi-versão
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração de versões múltiplas **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `DELETE /api/quotes/[id]/versions/[vid]` com única versão existente retorna 409
  - [ ] `POST /api/quotes/[id]/versions` com orçamento de outro usuário retorna 403
  - [ ] Template HTML com 2 `version_ids` inclui tabela comparativa com 2 colunas
  - [ ] Template HTML com 1 `version_id` não inclui tabela comparativa
- Testes de integração:
  - [ ] Criar versão "Premium", adicionar ambiente diferente, gerar PDF com ambas → PDF contém tabela comparativa correta
  - [ ] Renomear versão via PATCH → nome reflete nas abas do wizard
  - [ ] Deletar versão "Premium" com versão "Padrão" ainda ativa → versão removida, orçamento intacto

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Troca de versão no wizard não perde dados da versão anterior
- PDF com 2 versões é visualmente claro e comparável
- Mínimo de 1 versão sempre garantido (guard no DELETE)
