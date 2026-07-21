import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createHmac } from "crypto";

const WEBHOOK_SECRET = "test-secret-key-for-hmac";

// Mock do service client do Supabase
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockOr = vi.fn();

function buildMockChain(error: unknown = null) {
  mockOr.mockResolvedValue({ error });
  mockEq.mockReturnValue({ or: mockOr, eq: mockEq });
  mockUpdate.mockReturnValue({ eq: mockEq });
}

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  })),
}));

// Handler é importado após os mocks
let POST: typeof import("@/app/api/webhooks/abacatepay/route").POST;
let validateWebhookSignature: typeof import("@/app/api/webhooks/abacatepay/route").validateWebhookSignature;

function makeSignature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function makeRequest(body: string, signature: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/webhooks/abacatepay", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
      "x-abacatepay-signature": signature,
    },
  });
}

function makeValidRequest(payload: Record<string, unknown>): NextRequest {
  const body = JSON.stringify(payload);
  const signature = makeSignature(body, WEBHOOK_SECRET);
  return makeRequest(body, signature);
}

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();

  vi.stubEnv("ABACATEPAY_WEBHOOK_SECRET", WEBHOOK_SECRET);

  vi.mock("@/lib/supabase/service", () => ({
    createServiceClient: vi.fn(() => ({
      from: vi.fn(() => ({
        update: mockUpdate,
      })),
    })),
  }));

  const mod = await import("@/app/api/webhooks/abacatepay/route");
  POST = mod.POST;
  validateWebhookSignature = mod.validateWebhookSignature;
});

describe("POST /api/webhooks/abacatepay", () => {
  describe("validação HMAC", () => {
    it("retorna 401 quando assinatura HMAC é inválida", async () => {
      const body = JSON.stringify({ event_type: "subscription.activated" });
      const req = makeRequest(body, "invalid-signature");

      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toMatchObject({ error: "Invalid signature" });
    });

    it("retorna 401 quando assinatura está ausente", async () => {
      const body = JSON.stringify({ event_type: "subscription.activated" });
      const req = new NextRequest("http://localhost:3000/api/webhooks/abacatepay", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("retorna 500 quando ABACATEPAY_WEBHOOK_SECRET não está configurado", async () => {
      vi.stubEnv("ABACATEPAY_WEBHOOK_SECRET", "");

      const mod = await import("@/app/api/webhooks/abacatepay/route");
      const handler = mod.POST;

      const body = JSON.stringify({ event_type: "subscription.activated" });
      const req = makeRequest(body, makeSignature(body, WEBHOOK_SECRET));

      const res = await handler(req);
      expect(res.status).toBe(500);
    });
  });

  describe("processamento de eventos", () => {
    it("subscription.activated atualiza status para 'active'", async () => {
      mockOr.mockResolvedValue({ error: null });
      mockEq.mockReturnValue({ or: mockOr, eq: mockEq });
      mockUpdate.mockReturnValue({ eq: mockEq });

      const payload = {
        event_type: "subscription.activated",
        abacatepay_subscription_id: "sub_abc123",
        data: {
          id: "sub_abc123",
          customer_id: "user_xyz",
          status: "active",
          current_period_end: "2026-08-21T00:00:00Z",
          metadata: { user_id: "user-uuid-123" },
        },
        created_at: new Date().toISOString(),
      };

      const req = makeValidRequest(payload);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.received).toBe(true);
      expect(json.processed).toBe(true);
    });

    it("subscription.payment_failed atualiza status para 'read_only'", async () => {
      mockEq.mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockEq });

      const payload = {
        event_type: "subscription.payment_failed",
        abacatepay_subscription_id: "sub_abc123",
        data: {
          id: "sub_abc123",
          customer_id: "user_xyz",
          status: "payment_failed",
        },
        created_at: new Date().toISOString(),
      };

      const req = makeValidRequest(payload);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.received).toBe(true);
      expect(json.processed).toBe(true);
    });

    it("subscription.cancelled atualiza status para 'cancelled'", async () => {
      mockEq.mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockEq });

      const payload = {
        event_type: "subscription.cancelled",
        abacatepay_subscription_id: "sub_abc123",
        data: {
          id: "sub_abc123",
          customer_id: "user_xyz",
          status: "cancelled",
        },
        created_at: new Date().toISOString(),
      };

      const req = makeValidRequest(payload);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.received).toBe(true);
      expect(json.processed).toBe(true);
    });

    it("subscription.renewed atualiza current_period_end", async () => {
      mockEq.mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockEq });

      const payload = {
        event_type: "subscription.renewed",
        abacatepay_subscription_id: "sub_abc123",
        data: {
          id: "sub_abc123",
          customer_id: "user_xyz",
          status: "active",
          current_period_end: "2026-09-21T00:00:00Z",
        },
        created_at: new Date().toISOString(),
      };

      const req = makeValidRequest(payload);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.received).toBe(true);
      expect(json.processed).toBe(true);
    });

    it("evento desconhecido retorna received=true mas processed=false", async () => {
      const payload = {
        event_type: "subscription.unknown_event",
        abacatepay_subscription_id: "sub_abc123",
        data: { id: "sub_abc123", customer_id: "user_xyz", status: "unknown" },
        created_at: new Date().toISOString(),
      };

      const req = makeValidRequest(payload);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.received).toBe(true);
      expect(json.processed).toBe(false);
    });
  });
});

describe("validateWebhookSignature (exportada)", () => {
  it("retorna true para assinatura válida", () => {
    const body = '{"event_type":"subscription.activated"}';
    const secret = "my-secret";
    const sig = makeSignature(body, secret);
    expect(validateWebhookSignature(body, sig, secret)).toBe(true);
  });

  it("retorna false para assinatura inválida", () => {
    const body = '{"event_type":"subscription.activated"}';
    expect(validateWebhookSignature(body, "wrong", "my-secret")).toBe(false);
  });
});
