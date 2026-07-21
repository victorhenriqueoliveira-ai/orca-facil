import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";

/**
 * Replica da função de validação de assinatura HMAC do webhook handler.
 * Testada isoladamente para garantir comportamento correto.
 */
function validateWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

function makeSignature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

describe("validateWebhookSignature", () => {
  const secret = "test-webhook-secret-abc123";
  const body = JSON.stringify({ event_type: "subscription.activated", abacatepay_subscription_id: "sub_123" });

  it("retorna true com secret correto e body correto", () => {
    const signature = makeSignature(body, secret);
    expect(validateWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("retorna false com body alterado", () => {
    const signature = makeSignature(body, secret);
    const alteredBody = body + " ";
    expect(validateWebhookSignature(alteredBody, signature, secret)).toBe(false);
  });

  it("retorna false com secret errado", () => {
    const signature = makeSignature(body, "wrong-secret");
    expect(validateWebhookSignature(body, signature, secret)).toBe(false);
  });

  it("retorna false com assinatura vazia", () => {
    expect(validateWebhookSignature(body, "", secret)).toBe(false);
  });

  it("retorna false com assinatura completamente diferente", () => {
    expect(validateWebhookSignature(body, "invalid-signature", secret)).toBe(false);
  });

  it("diferencia body com espaços extras", () => {
    const bodyWithSpaces = JSON.stringify({ event_type: "subscription.activated", abacatepay_subscription_id: "sub_123" }, null, 2);
    const signatureForCompact = makeSignature(body, secret);
    // corpo com formatação diferente → assinatura inválida
    expect(validateWebhookSignature(bodyWithSpaces, signatureForCompact, secret)).toBe(false);
  });
});
