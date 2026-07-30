---
status: completed
title: "Alerta de preços desatualizados (catálogo + wizard)"
type: frontend
complexity: medium
dependencies:
  - task_01
---

# Task 12: Alerta de preços desatualizados (catálogo + wizard)

## Overview

Exibe alertas quando itens do catálogo do marceneiro não têm o preço atualizado há mais de `price_alert_days` dias (padrão: 60). O alerta aparece na tela de catálogo (lista de itens desatualizados) e no wizard ao selecionar um item com preço antigo.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE modificar `GET /api/catalog` para incluir o campo `price_updated_at` no response de cada item (coluna adicionada na migration 013).
- DEVE adicionar alerta visual na tela de catálogo para itens onde `price_updated_at < now() - price_alert_days * interval '1 day'`.
- O alerta DEVE exibir texto: "Preço atualizado há X dias — confira se está correto".
- DEVE adicionar aviso inline no wizard ao adicionar item com preço desatualizado: "O preço deste item foi atualizado há X dias. Verifique antes de continuar."
- Ao atualizar o preço de um item via PATCH em `app/api/catalog/[id]/route.ts`, DEVE atualizar `price_updated_at = now()`.
- O `price_alert_days` usado para comparação DEVE vir do perfil do usuário autenticado.
- NÃO DEVE bloquear o usuário — os alertas são avisos não-bloqueantes.
</requirements>

## Subtasks

- [x] 12.1 Estender `GET /api/catalog` para incluir `price_updated_at` no response
- [x] 12.2 Estender `PATCH /api/catalog/[id]` para atualizar `price_updated_at = now()` ao mudar `unit_price`
- [x] 12.3 Adicionar alerta visual na tela de catálogo para itens com preço desatualizado
- [x] 12.4 Adicionar aviso inline no wizard ao selecionar item desatualizado
- [x] 12.5 Adicionar testes unitários para a lógica de detecção de preço desatualizado

## Implementation Details

Veja a seção "Component Design — Alerta de Preços" do TechSpec para o design da UI dos alertas.

A tela de catálogo existente (localizar em `app/(app)/`) exibe a lista de itens. Adicionar um ícone de aviso (⚠️ ou equivalente Tailwind) ao lado dos itens com preço desatualizado, com tooltip ou texto expandido.

No wizard, ao adicionar um item ao ambiente, verificar se `price_updated_at` do item está além do threshold. Se sim, exibir banner informativo não-bloqueante.

A contagem de dias é calculada no frontend: `Math.floor((Date.now() - new Date(price_updated_at).getTime()) / 86400000)`.

### Relevant Files

- `app/api/catalog/route.ts` — endpoint GET a estender
- `app/api/catalog/[id]/route.ts` — endpoint PATCH a estender
- `app/(app)/` — localizar tela de catálogo existente
- `components/wizard/room-item-form.tsx` — local de adição do item no wizard

### Dependent Files

- `app/(app)/configuracoes/` (task_11) — onde `price_alert_days` é configurado pelo usuário

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- `app/api/catalog/route.ts` estendido com `price_updated_at`
- `app/api/catalog/[id]/route.ts` estendido com atualização de `price_updated_at`
- Tela de catálogo com alertas visuais
- Aviso inline no wizard
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `GET /api/catalog` retorna `price_updated_at` em cada item do response
  - [x] `PATCH /api/catalog/[id]` com novo `unit_price` atualiza `price_updated_at` para o timestamp atual
  - [x] `PATCH /api/catalog/[id]` sem mudança de `unit_price` não altera `price_updated_at`
  - [x] Tela de catálogo exibe ícone de alerta para item com `price_updated_at` de 61 dias atrás (quando `price_alert_days = 60`)
  - [x] Tela de catálogo não exibe alerta para item com `price_updated_at` de 59 dias atrás
  - [x] Wizard exibe aviso ao adicionar item com preço desatualizado
  - [x] Wizard não exibe aviso ao adicionar item com preço atualizado recentemente
- Meta de cobertura de testes: >=80%
- Todos os testes devem passar

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- `price_updated_at` atualizado automaticamente ao editar preço
- Alertas exibidos na tela de catálogo e no wizard para preços desatualizados
- Threshold configurável via `price_alert_days` do perfil
