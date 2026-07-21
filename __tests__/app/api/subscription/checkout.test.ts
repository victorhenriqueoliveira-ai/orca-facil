import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock do AbacatePay client
const mockCreateCheckout = vi.fn();
vi.mock("@/lib/abacatepay/client", () => ({
  createCheckout: mockCreateCheckout,
}));

// Mock do Supabase server
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

let POST: typeof import("@/app/api/subscription/checkout/route").POST;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();

  vi.mock("@/lib/abacatepay/client", () => ({
    createCheckout: mockCreateCheckout,
  }));

  vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({
      auth: { getUser: mockGetUser },
    })),
  }));

  const mod = await import("@/app/api/subscription/checkout/route");
  POST = mod.POST;
});

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/subscription/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/subscription/checkout", () => {
  it("retorna 401 quando usuário não está autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toMatchObject({ error: "Unauthorized" });
  });

  it("retorna { checkout_url } com URL válida quando AbacatePay responde com sucesso", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-123", email: "test@example.com" } },
    });
    mockCreateCheckout.mockResolvedValue({
      id: "chk_123",
      checkout_url: "https://pay.abacatepay.com/checkout/chk_123",
      status: "pending",
      created_at: new Date().toISOString(),
    });

    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.orcafacil.com.br");

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      checkout_url: "https://pay.abacatepay.com/checkout/chk_123",
    });
  });

  it("chama createCheckout com amount=4900 (R$49,00 em centavos)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-456", email: "test@example.com" } },
    });
    mockCreateCheckout.mockResolvedValue({
      id: "chk_456",
      checkout_url: "https://pay.abacatepay.com/checkout/chk_456",
      status: "pending",
      created_at: new Date().toISOString(),
    });

    await POST(makeRequest());

    expect(mockCreateCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 4900 })
    );
  });

  it("retorna 502 quando AbacatePay lança erro", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-789", email: "test@example.com" } },
    });
    mockCreateCheckout.mockRejectedValue(new Error("AbacatePay API error 503"));

    const res = await POST(makeRequest());

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json).toMatchObject({ error: "Failed to create checkout" });
  });

  it("inclui redirect_url com /dashboard?subscribed=1", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-111" } },
    });
    mockCreateCheckout.mockResolvedValue({
      id: "chk_111",
      checkout_url: "https://pay.abacatepay.com/checkout/chk_111",
      status: "pending",
      created_at: new Date().toISOString(),
    });

    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.orcafacil.com.br");

    await POST(makeRequest());

    expect(mockCreateCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        redirect_url: "https://app.orcafacil.com.br/dashboard?subscribed=1",
      })
    );
  });
});
