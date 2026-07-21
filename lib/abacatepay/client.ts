/**
 * Cliente HTTP para a API REST do AbacatePay.
 * Não há SDK oficial — integração direta via fetch.
 * Variáveis de ambiente: ABACATEPAY_API_KEY (server-only, nunca NEXT_PUBLIC_)
 */

import type {
  CreateCheckoutPayload,
  CreateCheckoutResponse,
  CancelSubscriptionResponse,
} from "./types";

const ABACATEPAY_BASE_URL = "https://api.abacatepay.com/v1";

function getApiKey(): string {
  const key = process.env.ABACATEPAY_API_KEY;
  if (!key) {
    throw new Error("ABACATEPAY_API_KEY environment variable is not set");
  }
  return key;
}

async function abacateRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();
  const url = `${ABACATEPAY_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `AbacatePay API error ${res.status}: ${errorText}`
    );
  }

  return res.json() as Promise<T>;
}

/**
 * Inicia um checkout de assinatura no AbacatePay.
 * Retorna a URL de checkout para redirecionar o usuário.
 */
export async function createCheckout(
  payload: CreateCheckoutPayload
): Promise<CreateCheckoutResponse> {
  return abacateRequest<CreateCheckoutResponse>("/subscriptions/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Cancela uma assinatura ativa no AbacatePay.
 * Deve ser seguido pela atualização do status no banco de dados.
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<CancelSubscriptionResponse> {
  return abacateRequest<CancelSubscriptionResponse>(
    `/subscriptions/${subscriptionId}/cancel`,
    { method: "POST" }
  );
}
