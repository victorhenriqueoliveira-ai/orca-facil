/**
 * Tipos TypeScript para integração com AbacatePay REST API v2.
 */

// ─── Customer ─────────────────────────────────────────────────────────────────

export interface CreateCustomerPayload {
  email: string;
  name?: string;
  cellphone?: string;
  taxId?: string;
  metadata?: Record<string, string>;
}

export interface CreateCustomerResponse {
  data: {
    id: string;
    email: string;
    name: string | null;
    cellphone: string | null;
    taxId: string | null;
    devMode: boolean;
  };
  success: boolean;
  error: string | null;
}

// ─── Subscription Checkout ────────────────────────────────────────────────────

export interface CreateCheckoutPayload {
  items: Array<{ id: string; quantity: number }>;
  customerId?: string;
  externalId?: string;
  completionUrl?: string;
  returnUrl?: string;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutResponse {
  data: {
    id: string;
    url: string;
    amount: number;
    status: string;
    customerId: string;
    externalId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  success: boolean;
  error: string | null;
}

// ─── Cancel Subscription ──────────────────────────────────────────────────────

export interface CancelSubscriptionResponse {
  data: {
    id: string;
    status: string;
  };
  success: boolean;
  error: string | null;
}

// ─── Webhook Events ───────────────────────────────────────────────────────────

export type WebhookEventType =
  | "subscription.completed"
  | "subscription.renewed"
  | "subscription.cancelled"
  | "checkout.completed"
  | "checkout.refunded"
  | "payout.completed"
  | "payout.failed";

export interface WebhookSubscriptionData {
  id: string;
  customerId: string;
  status: string;
  currentPeriodEnd?: string;
  cancelledAt?: string;
  metadata?: Record<string, string>;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEventType;
  apiVersion: number;
  devMode: boolean;
  data: WebhookSubscriptionData;
}
