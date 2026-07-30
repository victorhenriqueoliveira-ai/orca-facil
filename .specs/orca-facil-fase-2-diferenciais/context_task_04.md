# Contexto — task_04

## Requisitos do PRD
Estende PATCH e GET de `/api/quotes/[id]` para gerar e retornar `approval_token` quando status muda para `'sent'`.

## Especificação Técnica

### Arquivo a modificar
`app/api/quotes/[id]/route.ts`

### PATCH — mudanças necessárias
Quando `status === 'sent'`:
1. Buscar o quote atual com `approval_token` e `created_at` e `validity_days` da versão (via `quote_versions.profit_margin_pct` já existe — adicionar `approval_token` ao select)
2. Se `approval_token IS NULL`: gerar `crypto.randomUUID()`, calcular `approval_token_expires_at` como `created_at + quote_validity_days dias` (buscar `quote_validity_days` do perfil via `profiles` ou da versão)
3. Se `approval_token` já existe: reusar (não sobrescrever)
4. Persistir: `approval_token`, `approval_token_expires_at`, `sent_at = new Date().toISOString()`
5. Retornar no response: `{ success: true, approval_link: "https://[NEXT_PUBLIC_APP_URL]/o/[token]", approval_token }`

### GET — mudanças necessárias
Incluir no SELECT: `approval_token`, `approval_token_expires_at`, `sent_at`
No response, quando `status IN ('sent', 'accepted')`, adicionar:
```json
{
  "approval_token": "uuid",
  "approval_link": "https://APP_URL/o/uuid",
  "sent_at": "2026-01-01T00:00:00Z"
}
```

### Variável de ambiente
`process.env.NEXT_PUBLIC_APP_URL` — fallback para `'https://orcafacil.com.br'` se não definida

### Buscar quote_validity_days
Fazer join ou query separada: `SELECT quote_validity_days FROM profiles WHERE user_id = auth.uid()`. Default 15 se null.

## Estado de dependências
- task_01 ✓ — migrations com colunas `approval_token`, `approval_token_expires_at`, `sent_at` já criadas
