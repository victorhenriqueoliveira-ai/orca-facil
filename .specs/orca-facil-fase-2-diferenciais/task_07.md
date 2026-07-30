---
status: completed
title: "Calculadora de chapas embutida no wizard"
type: frontend
complexity: low
dependencies:
  - task_01
---

# Task 07: Calculadora de chapas embutida no wizard

## Overview

Adiciona uma calculadora auxiliar de chapas de MDF ao passo de ambientes do wizard. Dado o somatório de área das peças cadastradas no ambiente, exibe quantas chapas inteiras são necessárias considerando o percentual de perda configurado no perfil (campo `sheet_waste_pct` da migration 012). Informação auxiliar, não obrigatória.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE adicionar a calculadora ao arquivo `components/wizard/step-rooms.tsx` como componente auxiliar inline (sem arquivo separado, dado que a tarefa é low complexity).
- DEVE ler `sheet_waste_pct` do perfil do usuário (disponível no contexto do wizard ou via props).
- DEVE usar dimensões padrão de chapa MDF: 2750mm × 1830mm (área útil = 5,0325 m²).
- O cálculo DEVE ser: `chapas = Math.ceil(area_total_m2 / (area_chapa * (1 - waste_pct/100)))`.
- DEVE exibir o resultado como texto informativo (ex.: "Estimativa: ~3 chapas de MDF") próximo à lista de peças do ambiente.
- DEVE atualizar o cálculo em tempo real à medida que o usuário adiciona ou remove peças.
- DEVE exibir somente quando `area_total > 0` e houver ao menos um item no ambiente.
- NÃO DEVE bloquear o fluxo do wizard — é informação auxiliar que pode ser ignorada.
- NÃO DEVE criar um novo arquivo de componente separado para esta funcionalidade.
</requirements>

## Subtasks

- [x] 7.1 Implementar função pura `calcChapas(areaTotalM2, sheetWastePct)` retornando número de chapas
- [x] 7.2 Integrar cálculo em `step-rooms.tsx` consumindo as medidas das peças já cadastradas
- [x] 7.3 Renderizar informação auxiliar de forma não invasiva no UI de ambientes
- [x] 7.4 Adicionar testes unitários para a função de cálculo

## Implementation Details

Veja a seção "Component Design — Calculadora de Chapas" do TechSpec para a fórmula exata e o local de renderização no componente.

A área de cada peça é `largura_mm * altura_mm / 1_000_000` (conversão para m²). O somatório de área das peças do ambiente já pode ser derivado do estado local de `step-rooms.tsx` que lista os itens do ambiente.

O `sheet_waste_pct` vem do perfil do usuário, que já é carregado no layout principal (`app/(app)/layout.tsx`). Verificar se é passado via props ao wizard ou se precisa de um fetch adicional.

### Relevant Files

- `components/wizard/step-rooms.tsx` — arquivo principal a modificar (18KB)
- `components/wizard/room-item-form.tsx` — formulário de peça individual com campos de medida
- `app/(app)/layout.tsx` — verifica se `sheet_waste_pct` já é carregado e passado via contexto

### Dependent Files

- `components/wizard/step-rooms.tsx` — DEVE ser modificado para incluir a calculadora
- `components/wizard/step-review.tsx` (task_09) — pode reutilizar a função `calcChapas` para exibir totais no resumo

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- `components/wizard/step-rooms.tsx` modificado com calculadora inline
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `calcChapas(10, 15)` retorna `Math.ceil(10 / (5.0325 * 0.85))` = 3 (verificar valor exato)
  - [ ] `calcChapas(0, 15)` retorna 0
  - [ ] `calcChapas(5.0325, 0)` retorna 1 (exatamente uma chapa sem desperdício)
  - [ ] `calcChapas(5.0326, 0)` retorna 2 (arredonda para cima)
  - [ ] Componente não exibe calculadora quando `area_total = 0`
  - [ ] Componente exibe texto com número correto de chapas quando `area_total > 0`
  - [ ] Calculadora atualiza ao adicionar peça nova (re-render reativo)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Calculadora exibe estimativa correta de chapas ao adicionar peças no wizard
- Cálculo usa `sheet_waste_pct` do perfil do usuário
- Informação auxiliar não obstrui o fluxo principal do wizard
