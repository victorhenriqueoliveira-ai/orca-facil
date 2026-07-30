# Contexto — task_03

## Requisitos do PRD
Cria três novos templates de e-mail HTML e funções de envio, seguindo o padrão do `trial-reminder` existente.

## Especificação Técnica

### Padrão existente
O arquivo `lib/email/resend.ts` exporta `createResendClient()` e funções de envio.
O template `lib/email/templates/trial-reminder.ts` define o padrão de HTML com CSS inline.

### Arquivos a criar

**`lib/email/templates/quote-approved.ts`**
```typescript
export interface QuoteApprovedData {
  business_name: string | null;
  quote_number: number;
  customer_name: string | null;
  quote_url: string; // link para /orcamentos/[id]
}
export function buildQuoteApprovedHtml(data: QuoteApprovedData): string { ... }
export async function sendQuoteApproved(to: string, data: QuoteApprovedData): Promise<{ success: boolean; id?: string; error?: string }> { ... }
```

**`lib/email/templates/quote-followup.ts`**
```typescript
export interface QuoteFollowupData {
  business_name: string | null;
  quote_number: number;
  customer_name: string | null;
  quote_url: string;
  days_since_sent: number;
}
export function buildQuoteFollowupHtml(data: QuoteFollowupData): string { ... }
export async function sendQuoteFollowup(to: string, data: QuoteFollowupData): Promise<{ success: boolean; id?: string; error?: string }> { ... }
```

**`lib/email/templates/quote-expiring.ts`**
```typescript
export interface QuoteExpiringData {
  business_name: string | null;
  quote_number: number;
  customer_name: string | null;
  quote_url: string;
  days_until_expiry: number;
}
export function buildQuoteExpiringHtml(data: QuoteExpiringData): string { ... }
export async function sendQuoteExpiring(to: string, data: QuoteExpiringData): Promise<{ success: boolean; id?: string; error?: string }> { ... }
```

### Atualização do `lib/email/resend.ts`
Adicionar imports e re-exportar as três novas funções de envio mantendo as exportações existentes.

### Padrões obrigatórios
- Remetente: `Orça Fácil <noreply@orcafacil.com.br>`
- CSS 100% inline (sem Tailwind, sem CDN)
- Mesmo esquema de cores do trial-reminder: `#2D5D5A` (header), `#C2703A` (accent), `#FAF7F2` (background)
- Retorno `{ success: boolean; id?: string; error?: string }` em todas as funções de envio
- Usar `createResendClient()` de `lib/email/resend.ts`

## Estado de dependências
Nenhuma dependência — task independente.
