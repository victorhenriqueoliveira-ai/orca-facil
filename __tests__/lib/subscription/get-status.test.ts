import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do supabase server client
const mockFrom = vi.fn();
const mockCreateClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

function criarMockSupabase(
  data: { status: string; trial_ends_at: string | null } | null,
  error: Error | null = null
) {
  const mockSingle = vi.fn().mockResolvedValue({ data, error });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });

  mockCreateClient.mockResolvedValue({ from: mockFrom });
}

describe("lib/subscription/get-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  });

  describe("getSubscriptionStatus", () => {
    it("retorna status 'trial' com daysLeft correto quando trial_ends_at é futuro", async () => {
      const futuro = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // hoje + 3 dias
      criarMockSupabase({ status: "trial", trial_ends_at: futuro.toISOString() });

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const resultado = await getSubscriptionStatus("user-uuid-123");

      expect(resultado.status).toBe("trial");
      expect(resultado.daysLeft).toBe(3);
      expect(resultado.canWrite).toBe(true);
    });

    it("retorna status 'trial' com daysLeft=0 quando trial_ends_at é hoje", async () => {
      // Mesmo dia, algumas horas no futuro
      const hoje = new Date(Date.now() + 2 * 60 * 60 * 1000); // +2h
      criarMockSupabase({ status: "trial", trial_ends_at: hoje.toISOString() });

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const resultado = await getSubscriptionStatus("user-uuid-123");

      expect(resultado.status).toBe("trial");
      expect(resultado.daysLeft).toBe(0);
      expect(resultado.canWrite).toBe(true);
    });

    it("retorna status 'active' com canWrite=true e daysLeft=null", async () => {
      criarMockSupabase({ status: "active", trial_ends_at: null });

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const resultado = await getSubscriptionStatus("user-uuid-123");

      expect(resultado.status).toBe("active");
      expect(resultado.canWrite).toBe(true);
      expect(resultado.daysLeft).toBeNull();
    });

    it("retorna status 'read_only' com canWrite=false", async () => {
      criarMockSupabase({ status: "read_only", trial_ends_at: null });

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const resultado = await getSubscriptionStatus("user-uuid-123");

      expect(resultado.status).toBe("read_only");
      expect(resultado.canWrite).toBe(false);
      expect(resultado.daysLeft).toBeNull();
    });

    it("retorna status 'cancelled' com canWrite=false", async () => {
      criarMockSupabase({ status: "cancelled", trial_ends_at: null });

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const resultado = await getSubscriptionStatus("user-uuid-123");

      expect(resultado.status).toBe("cancelled");
      expect(resultado.canWrite).toBe(false);
    });

    it("retorna read_only com canWrite=false quando há erro ao buscar subscription", async () => {
      criarMockSupabase(null, new Error("DB error"));

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const resultado = await getSubscriptionStatus("user-uuid-123");

      expect(resultado.status).toBe("read_only");
      expect(resultado.canWrite).toBe(false);
      expect(resultado.daysLeft).toBeNull();
    });

    it("retorna read_only com canWrite=false quando data é null (subscription não existe)", async () => {
      criarMockSupabase(null, null);

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const resultado = await getSubscriptionStatus("user-uuid-123");

      expect(resultado.status).toBe("read_only");
      expect(resultado.canWrite).toBe(false);
    });

    it("daysLeft é null quando status não é trial", async () => {
      const passado = new Date(Date.now() - 24 * 60 * 60 * 1000); // ontem
      criarMockSupabase({ status: "active", trial_ends_at: passado.toISOString() });

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const resultado = await getSubscriptionStatus("user-uuid-123");

      expect(resultado.daysLeft).toBeNull();
    });

    it("busca na tabela 'subscriptions' usando o userId fornecido", async () => {
      criarMockSupabase({ status: "active", trial_ends_at: null });

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      await getSubscriptionStatus("meu-user-id");

      expect(mockFrom).toHaveBeenCalledWith("subscriptions");
    });
  });
});
