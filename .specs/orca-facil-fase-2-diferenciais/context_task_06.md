# Contexto — task_06

## Requisitos do PRD
Endpoint `GET /api/alerts` + badge numérico no layout da aplicação mostrando alertas pendentes.

## Especificação Técnica

### Arquivo a criar
`app/api/alerts/route.ts`

### Response format
```typescript
interface AlertsResponse {
  approved: QuoteAlert[];   // aceitos nas últimas 48h
  followup: QuoteAlert[];   // sent_at + followup_days <= now, followup_notified_at IS NULL
  expiring: QuoteAlert[];   // vence em <= 3 dias, expiry_notified_at IS NULL
}

interface QuoteAlert {
  quote_id: string;
  quote_number: number;
  customer_name: string | null;
  action_url: string;        // /orcamentos/[id]
  expires_at?: string;       // apenas para expiring
}
```

### Queries
Três queries paralelas com `Promise.all`:
1. **approved**: `status='accepted'` e `sent_at >= now() - interval '48 hours'` (usar `sent_at` como proxy de "aprovado recentemente")
2. **followup**: `status='sent'`, `sent_at < now() - (followup_days * interval '1 day')`, `followup_notified_at IS NULL` — join com profiles para pegar `followup_days` do usuário
3. **expiring**: `status='sent'`, `approval_token_expires_at BETWEEN now() AND now() + interval '3 days'`, `expiry_notified_at IS NULL`

Para cada alerta: incluir join com `customers(name)`.

### Badge no layout
Arquivo a modificar: `app/(app)/layout.tsx` (Server Component) e/ou `components/sidebar.tsx` (Client Component)

Estratégia recomendada:
- Criar componente client `components/alerts-badge.tsx` que faz `fetch('/api/alerts')` no mount e exibe o total (approved.length + followup.length + expiring.length)
- Adicionar o badge ao lado de "Orçamentos" na sidebar e no bottom nav
- Badge: círculo vermelho com número, visível apenas quando total > 0
- Revalidar a cada 5 minutos com `setInterval`

## Estado de dependências
- task_01 ✓ — colunas `sent_at`, `followup_notified_at`, `expiry_notified_at`, `approval_token_expires_at` criadas
