/**
 * Cliente HTTP para a API REST do AbacatePay v2.
 * Variável de ambiente: ABACATEPAY_API_KEY (server-only, nunca NEXT_PUBLIC_)
 */

import type {
  CreateCustomerPayload,
  CreateCustomerResponse,
  CreateCheckoutPayload,
  CreateCheckoutResponse,
  CancelSubscriptionResponse,
} from "./types";

const ABACATEPAY_BASE_URL = "https://api.abacatepay.com/v2";

function getApiKey(): string {
  const key = process.env.ABACATEPAY_API_KEY;
  if (!key) throw new Error("ABACATEPAY_API_KEY environment variable is not set");
  return key;
}

async function abacateRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${ABACATEPAY_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`AbacatePay API error ${res.status}: ${errorText}`);
  }

  return res.json() as Promise<T>;
}

export async function createCustomer(
  payload: CreateCustomerPayload
): Promise<CreateCustomerResponse> {
  return abacateRequest<CreateCustomerResponse>("/customers/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createCheckout(
  payload: CreateCheckoutPayload
): Promise<CreateCheckoutResponse> {
  return abacateRequest<CreateCheckoutResponse>("/subscriptions/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<CancelSubscriptionResponse> {
  return abacateRequest<CancelSubscriptionResponse>(
    `/subscriptions/${subscriptionId}/cancel`,
    { method: "POST" }
  );
}
