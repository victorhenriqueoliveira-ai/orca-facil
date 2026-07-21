---
status: completed
title: E-mail de reengajamento de trial
type: backend
complexity: medium
dependencies:
  - task_13
---

# Task 14: E-mail de reengajamento de trial

## Overview

Implementa o envio automático de e-mail de reengajamento para marceneiros cujo trial expira em 3 dias e ainda não assinaram. O cron job roda diariamente, identifica os usuários elegíveis, envia o e-mail via Resend e registra o envio para evitar duplicatas. É a última linha de defesa antes de o usuário entrar em modo read-only.

<critical>
- SEMPRE LEIA o PRD e o TechSpec antes de começar
- REFERENCIE O TECHSPEC para detalhes de implementação — não duplique aqui
- FOQUE NO "QUÊ" — descreva o que precisa ser realizado, não como
- MINIMIZE CÓDIGO — mostre código apenas para ilustrar a estrutura atual ou áreas problemáticas
- TESTES OBRIGATÓRIOS — toda tarefa DEVE incluir testes nos deliverables
</critical>

<requirements>
- DEVE criar Route Handler `POST /api/cron/trial-reminder` protegido por `Authorization: Bearer {CRON_SECRET}` (não por Supabase Auth)
- DEVE consultar usuários com `subscriptions.status = 'trial'` E `trial_ends_at BETWEEN now() AND now() + interval '3 days'` que ainda não receberam o e-mail de reengajamento
- DEVE enviar e-mail via **Resend** (provider de e-mail transacional) com conteúdo: nome da marcenaria, quantos orçamentos criou no trial, dias restantes e link direto para `/assinar`
- DEVE registrar envio em nova coluna `subscriptions.trial_reminder_sent_at timestamptz` para evitar envio duplicado
- DEVE configurar cron job na Vercel (`vercel.json`) para executar `POST /api/cron/trial-reminder` diariamente às 09:00 horário de Brasília
- DEVERIA usar template de e-mail HTML simples com o mesmo visual do produto
- DEVERIA adicionar variáveis de ambiente: `RESEND_API_KEY`, `CRON_SECRET`
</requirements>

## Subtasks

- [x] 14.1 Adicionar coluna `trial_reminder_sent_at` em `subscriptions` via nova migration
- [x] 14.2 Criar `lib/email/resend.ts` com função de envio tipada
- [x] 14.3 Criar template de e-mail HTML em `lib/email/templates/trial-reminder.ts`
- [x] 14.4 Criar Route Handler `POST /api/cron/trial-reminder` com proteção por Bearer token
- [x] 14.5 Configurar cron job no `vercel.json`

## Implementation Details

Veja a seção "Development Sequencing → Build Order → passo 13" do TechSpec para o contexto desta tarefa.

A query de elegíveis:
```sql
SELECT s.user_id, p.business_name, p.id as profile_id,
       s.trial_ends_at, COUNT(q.id) as quote_count
FROM subscriptions s
JOIN profiles p ON p.id = s.user_id
LEFT JOIN quotes q ON q.user_id = s.user_id
WHERE s.status = 'trial'
  AND s.trial_ends_at BETWEEN now() AND now() + interval '3 days'
  AND s.trial_reminder_sent_at IS NULL
GROUP BY s.user_id, p.business_name, p.id, s.trial_ends_at
```

Após envio bem-sucedido do e-mail, atualizar: `UPDATE subscriptions SET trial_reminder_sent_at = now() WHERE user_id = :userId`.

A proteção do cron endpoint:
```typescript
const authHeader = request.headers.get('Authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

A Vercel injeta automaticamente o `Authorization: Bearer {CRON_SECRET}` quando configura o cron no `vercel.json`.

### Relevant Files

- `supabase/migrations/003_trial_reminder.sql` — adiciona `trial_reminder_sent_at`
- `lib/email/resend.ts` — client Resend tipado
- `lib/email/templates/trial-reminder.ts` — template HTML do e-mail
- `app/api/cron/trial-reminder/route.ts` — handler do cron
- `vercel.json` — configuração do cron schedule

### Dependent Files

- `subscriptions` table (task_02, task_13) — esta tarefa adiciona coluna e lê `status` e `trial_ends_at`

### Related ADRs

Nenhum ADR específico para esta tarefa.

## Deliverables

- Migration adicionando `trial_reminder_sent_at` a `subscriptions`
- Route Handler do cron protegido e funcional
- Cron job configurado no `vercel.json`
- E-mail HTML com dados personalizados (nome da marcenaria, contagem de orçamentos)
- Proteção contra envio duplicado
- Testes unitários com 80%+ de cobertura **(OBRIGATÓRIO)**
- Testes de integração do fluxo de identificação e envio **(OBRIGATÓRIO)**

## Tests

- Testes unitários:
  - [x] `POST /api/cron/trial-reminder` sem `Authorization` header retorna 401
  - [x] `POST /api/cron/trial-reminder` com token errado retorna 401
  - [x] Template de e-mail com `{ business_name: 'Madeirarte', quote_count: 5, days_left: 2 }` inclui esses valores no HTML
  - [x] Função de envio retorna erro descritivo quando Resend API falha (sem lançar exception não tratada)
- Testes de integração:
  - [x] Usuário com `trial_ends_at = now() + 2 dias` e `status = 'trial'` aparece na query de elegíveis
  - [x] Usuário com `trial_reminder_sent_at IS NOT NULL` NÃO aparece na query (sem duplicata)
  - [x] Usuário com `status = 'active'` NÃO aparece na query
  - [x] Após execução do cron, `subscriptions.trial_reminder_sent_at` está preenchido para usuários que receberam e-mail

## Success Criteria

- Todos os testes passando
- Cobertura de testes >=80%
- E-mail enviado exatamente uma vez por usuário elegível (sem duplicatas mesmo com múltiplas execuções do cron)
- Cron executando conforme schedule no Vercel Dashboard
- E-mail recebido com nome da marcenaria e contagem de orçamentos corretos
