/**
 * Tipos TypeScript para integração com AbacatePay REST API.
 * Todos os payloads de webhook e respostas de API são tipados aqui.
 */

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface CreateCheckoutPayload {
  /** Valor em centavos */
  amount: number;
  /** URL de retorno após pagamento */
  redirect_url: string;
  /** Identificador do usuário no sistema */
  customer_id: string;
  /** Descrição do plano */
  description?: string;
}

export interface CreateCheckoutResponse {
  id: string;
  checkout_url: string;
  status: string;
  created_at: string;
}

// ─── Cancel Subscription ──────────────────────────────────────────────────────

export interface CancelSubscriptionResponse {
  id: string;
  status: string;
  cancelled_at: string;
}

// ─── Webhook Events ───────────────────────────────────────────────────────────

export type WebhookEventType =
  | "subscription.completed"
  | "subscription.activated"
  | "subscription.renewed"
  | "subscription.cancelled"
  | "subscription.payment_failed"
  | "subscription.trial_started"
  | "subscription.plan_changed";

export interface WebhookSubscriptionData {
  id: string;
  customer_id: string;
  status: string;
  current_period_end?: string;
  cancelled_at?: string;
  metadata?: Record<string, string>;
}

export interface WebhookPayload {
  event_type: WebhookEventType;
  abacatepay_subscription_id: string;
  data: WebhookSubscriptionData;
  created_at: string;
}
