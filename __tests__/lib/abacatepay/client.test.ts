import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ABACATEPAY_API_KEY", "test-api-key-abc");
});

describe("lib/abacatepay/client", () => {
  describe("createCheckout", () => {
    it("chama a URL correta com método POST e Authorization header", async () => {
      const mockResponse = {
        id: "chk_test123",
        checkout_url: "https://pay.abacatepay.com/checkout/chk_test123",
        status: "pending",
        created_at: new Date().toISOString(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const { createCheckout } = await import("@/lib/abacatepay/client");

      const payload = {
        amount: 4900,
        redirect_url: "https://app.orcafacil.com.br/dashboard?subscribed=1",
        customer_id: "user-uuid-123",
        description: "Plano Orça Fácil Pro — Mensal",
      };

      const result = await createCheckout(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.abacatepay.com/v1/subscriptions/checkout",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key-abc",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(payload),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it("lança erro quando API retorna status não-ok", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '{"error":"Bad Request"}',
      });

      const { createCheckout } = await import("@/lib/abacatepay/client");

      await expect(
        createCheckout({
          amount: 4900,
          redirect_url: "https://app.example.com/dashboard?subscribed=1",
          customer_id: "user-uuid-error",
        })
      ).rejects.toThrow("AbacatePay API error 400");
    });

    it("lança erro quando ABACATEPAY_API_KEY não está configurada", async () => {
      vi.stubEnv("ABACATEPAY_API_KEY", "");

      // Re-import para pegar o env limpo
      vi.resetModules();
      const { createCheckout } = await import("@/lib/abacatepay/client");

      await expect(
        createCheckout({
          amount: 4900,
          redirect_url: "https://app.example.com/dashboard?subscribed=1",
          customer_id: "user-uuid-nokey",
        })
      ).rejects.toThrow("ABACATEPAY_API_KEY environment variable is not set");
    });
  });

  describe("cancelSubscription", () => {
    it("chama a URL de cancel correta com POST", async () => {
      const mockResponse = {
        id: "sub_123",
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      vi.stubEnv("ABACATEPAY_API_KEY", "test-api-key-abc");
      vi.resetModules();
      const { cancelSubscription } = await import("@/lib/abacatepay/client");

      const result = await cancelSubscription("sub_123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.abacatepay.com/v1/subscriptions/sub_123/cancel",
        expect.objectContaining({
          method: "POST",
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });
});
