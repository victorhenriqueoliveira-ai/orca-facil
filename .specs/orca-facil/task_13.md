---
status: pending
title: Assinatura e cobrança via AbacatePay + webhook
type: backend
complexity: high
dependencies:
  - task_02
  - task_04
---

# Task 13: Assinatura e cobrança via AbacatePay + webhook

## Overview

Implementa o ciclo completo de monetização: checkout de assinatura via AbacatePay, processamento de webhooks de pagamento com validação HMAC, atualização automática de status da assinatura no banco e fluxo de cancelamento. É a feature que converte trial em receita recorrente.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar Route Handler `POST /api/subscription/checkout` que chama a API REST do AbacatePay e retorna `{ checkout_url }` para redirect do cliente
- DEVE criar Route Handler `POST /api/subscription/cancel` que cancela a assinatura ativa via API do AbacatePay e atualiza `subscriptions.status = 'cancelled'`
- DEVE criar Route Handler `GET /api/subscription` que retorna o status atual da assinatura do usuário autenticado
- DEVE criar Route Handler `POST /api/webhooks/abacatepay` que:
  - Valida a assinatura HMAC-SHA256 do header `X-AbacatePay-Signature` usando `ABACATEPAY_WEBHOOK_SECRET`
  - Retorna 401 para assinaturas inválidas (sem processar)
  - Processa eventos: `subscription.activated` → `status = 'active'`; `subscription.renewed` → atualiza `current_period_end`; `subscription.cancelled` → `status = 'cancelled'`; `subscription.payment_failed` → `status = 'read_only'`
- DEVE usar `service_role` key no webhook handler (sem contexto de usuário autenticado)
- DEVE logar cada webhook recebido com `event_type`, `abacatepay_subscription_id` e resultado do processamento
- A página `/assinar` DEVE exibir: preço do plano, lista de benefícios e botão "Assinar agora" que aciona o checkout
- DEVE exibir botão de cancelamento na página de configurações quando `status = 'active'`
- DEVERIA isolar toda integração AbacatePay em `lib/abacatepay/` com tipos TypeScript explícitos
- DEVERIA configurar variáveis de ambiente: `ABACATEPAY_API_KEY`, `ABACATEPAY_WEBHOOK_SECRET`
</requirements>

## Subtasks

- [ ] 13.1 Criar `lib/abacatepay/client.ts` com funções tipadas para checkout e cancel
- [ ] 13.2 Criar Route Handler `POST /api/subscription/checkout`
- [ ] 13.3 Criar Route Handler `GET /api/subscription`
- [ ] 13.4 Criar Route Handler `POST /api/subscription/cancel`
- [ ] 13.5 Criar Route Handler `POST /api/webhooks/abacatepay` com validação HMAC e processamento de eventos
- [ ] 13.6 Atualizar página `/assinar` com preço, benefícios e botão de checkout funcional
- [ ] 13.7 Adicionar botão de cancelamento na página `/configuracoes`

## Implementation Details

Veja a seção "Integration Points → AbacatePay" do TechSpec para os eventos suportados, o header de validação HMAC e a nota sobre ausência de SDK oficial.

Validação HMAC no webhook:
```typescript
import { createHmac } from 'crypto'

function validateWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  return expected === signature
}
```
O body deve ser lido como texto raw (não JSON parsed) para calcular o HMAC corretamente — usar `req.text()` antes de `JSON.parse`.

O checkout deve passar `{ redirect_url: process.env.NEXT_PUBLIC_APP_URL + '/dashboard?subscribed=1' }` para retornar o usuário ao app após pagamento.

### Relevant Files

- `lib/abacatepay/client.ts` — funções de integração AbacatePay
- `lib/abacatepay/types.ts` — tipagem dos payloads de webhook e respostas
- `app/api/subscription/checkout/route.ts`
- `app/api/subscription/cancel/route.ts`
- `app/api/subscription/route.ts` — GET
- `app/api/webhooks/abacatepay/route.ts`
- `app/(app)/assinar/page.tsx` — atualizar com checkout funcional

### Dependent Files

- `components/subscription-provider.tsx` (task_04) — lê status atualizado pelo webhook
- `app/(app)/configuracoes/page.tsx` (task_05) — exibe botão de cancelamento
- `lib/subscription/get-status.ts` (task_04) — retorna status atual, incluindo `active` pós-webhook

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- Checkout AbacatePay funcional (redireciona para página de pagamento e volta ao app)
- Webhook processando 4 eventos com validação HMAC
- Status de assinatura atualizado automaticamente via webhook
- Página `/assinar` com call-to-action funcional
- Cancelamento self-service na página de configurações
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração do fluxo de webhook **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [ ] `validateWebhookSignature` com secret correto e body correto retorna `true`
  - [ ] `validateWebhookSignature` com body alterado retorna `false`
  - [ ] `validateWebhookSignature` com secret errado retorna `false`
  - [ ] Webhook com `event_type = 'subscription.activated'` atualiza `status = 'active'` e `current_period_end` correto
  - [ ] Webhook com `event_type = 'subscription.payment_failed'` atualiza `status = 'read_only'`
  - [ ] Webhook com header HMAC inválido retorna 401 sem processar evento
- Testes de integração:
  - [ ] `POST /api/subscription/checkout` retorna `{ checkout_url }` com URL válida do AbacatePay (mock do AbacatePay em teste)
  - [ ] Webhook `subscription.activated` → `GET /api/subscription` retorna `status = 'active'`
  - [ ] `POST /api/subscription/cancel` atualiza banco e marca assinatura como cancelada

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- Webhook processa evento em < 1s e retorna HTTP 200
- Status da assinatura atualiza em tempo real após webhook (sem precisar reload manual)
- Checkout redireciona corretamente para AbacatePay e volta ao app após pagamento
