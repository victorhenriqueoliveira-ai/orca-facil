---
status: completed
title: "Configurações ampliadas (profile + tela de configurações)"
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 11: Configurações ampliadas (profile + tela de configurações)

## Overview

Estende o endpoint `PATCH /api/profile` e a tela de configurações do produto para expor os novos campos de perfil adicionados pela migration 012: `followup_days`, `price_alert_days`, `sheet_waste_pct` e `whatsapp_message_template`. O marceneiro pode ajustar esses valores na tela de configurações.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE estender `app/api/profile/route.ts` (PATCH) para aceitar e persistir os campos: `followup_days` (int, 1–30), `price_alert_days` (int, 7–365), `sheet_waste_pct` (numeric, 0–50), `whatsapp_message_template` (string, max 1000 chars).
- DEVE estender `app/api/profile/route.ts` (GET) para retornar os quatro novos campos.
- DEVE adicionar campos de configuração na tela de configurações existente (localizar o arquivo de página de configurações — provavelmente `app/(app)/configuracoes/page.tsx` ou similar).
- Os novos campos DEVEM ter validação de range no handler PATCH (retornar 422 com mensagem de erro para valores fora do intervalo).
- DEVE exibir os valores atuais como placeholder/default quando o usuário abre a tela.
- NÃO DEVE quebrar os campos existentes do PATCH de perfil (business_name, city, phone, pix_key, bank_info, quote_validity_days, profit_margin_pct).
</requirements>

## Subtasks

- [x] 11.1 Estender `PATCH /api/profile` para aceitar os quatro novos campos com validação de range
- [x] 11.2 Estender `GET /api/profile` para incluir os quatro novos campos no response
- [x] 11.3 Localizar a tela de configurações existente e adicionar os campos de UI
- [x] 11.4 Adicionar testes unitários para as validações e o fluxo de atualização

## Implementation Details

Veja a seção "API Endpoints — Endpoints modificados" do TechSpec para os campos e ranges exatos.

O `app/api/profile/route.ts` já tem um padrão de PATCH com lista de campos permitidos. Adicionar os quatro novos campos à lista e incluir validação de range antes do UPDATE.

A tela de configurações pode não existir ainda — verificar `app/(app)/` para encontrar o arquivo. Se não existir, criar `app/(app)/configuracoes/page.tsx` com os campos existentes + novos. Se existir, apenas adicionar as novas seções.

Os campos `followup_days`, `price_alert_days` e `sheet_waste_pct` são numéricos — usar `<input type="number">` com `min` e `max`. O `whatsapp_message_template` usa `<textarea>`.

### Relevant Files

- `app/api/profile/route.ts` — endpoint principal a modificar
- `app/(app)/` — verificar se existe página de configurações

### Dependent Files

- `app/api/alerts/route.ts` (task_06) — lê `followup_days` do perfil
- `components/wizard/step-rooms.tsx` (task_07) — lê `sheet_waste_pct` do perfil
- `components/wizard/step-send.tsx` (task_10) — lê `whatsapp_message_template` do perfil
- `app/api/cron/daily-notifications/route.ts` (task_14) — lê `followup_days` e `price_alert_days`

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- `app/api/profile/route.ts` modificado (GET + PATCH estendidos)
- Tela de configurações com os novos campos (criar ou modificar)
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `PATCH /api/profile` com `followup_days: 0` retorna 422
  - [x] `PATCH /api/profile` com `followup_days: 31` retorna 422
  - [x] `PATCH /api/profile` com `followup_days: 7` retorna 200 e persiste o valor
  - [x] `PATCH /api/profile` com `price_alert_days: 6` retorna 422
  - [x] `PATCH /api/profile` com `sheet_waste_pct: 51` retorna 422
  - [x] `PATCH /api/profile` com `whatsapp_message_template` de 1001 caracteres retorna 422
  - [x] `GET /api/profile` retorna os quatro novos campos com valores padrão quando nulos
  - [x] PATCH dos campos novos não quebra campos existentes (business_name etc.)
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Campos persistidos corretamente no banco após PATCH
- Tela de configurações exibe e permite editar os quatro novos campos
- Validações de range retornam erros descritivos
