import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testes de integração para o guard de assinatura.
 * Testa a lógica de verificação de subscription via getSubscriptionStatus.
 */

const mockFrom = vi.fn();
const mockCreateClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

function criarMockSubscription(
  status: string,
  trial_ends_at: string | null = null
) {
  const mockSingle = vi.fn().mockResolvedValue({
    data: { status, trial_ends_at },
    error: null,
  });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
  mockCreateClient.mockResolvedValue({ from: mockFrom });
}

function simularRedirectReadOnly(status: string): boolean {
  return status === "read_only" || status === "cancelled";
}

describe("Guard de assinatura — integração", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("usuário com status 'read_only'", () => {
    it("getSubscriptionStatus retorna canWrite=false para read_only", async () => {
      criarMockSubscription("read_only", null);

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const resultado = await getSubscriptionStatus("user-read-only");

      expect(resultado.status).toBe("read_only");
      expect(resultado.canWrite).toBe(false);
      // Lógica de UI: deve redirecionar para /assinar
      expect(simularRedirectReadOnly(resultado.status)).toBe(true);
    });

    it("Route Handler deve retornar 403 para status read_only", async () => {
      criarMockSubscription("read_only", null);

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const sub = await getSubscriptionStatus("user-read-only");

      // Simula a lógica do Route Handler
      const shouldBlock =
        sub.status === "read_only" || sub.status === "cancelled";
      expect(shouldBlock).toBe(true);
    });
  });

  describe("usuário com status 'trial'", () => {
    it("getSubscriptionStatus retorna canWrite=true e daysLeft correto", async () => {
      const futuro = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      criarMockSubscription("trial", futuro.toISOString());

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const resultado = await getSubscriptionStatus("user-trial");

      expect(resultado.status).toBe("trial");
      expect(resultado.canWrite).toBe(true);
      expect(resultado.daysLeft).toBe(5);
      // Não deve redirecionar para /assinar
      expect(simularRedirectReadOnly(resultado.status)).toBe(false);
    });

    it("TrialBanner deve ser exibido para status 'trial'", async () => {
      const futuro = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      criarMockSubscription("trial", futuro.toISOString());

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const sub = await getSubscriptionStatus("user-trial");

      // Layout exibe banner quando status é 'trial' e daysLeft não é null
      const deveMostrarBanner =
        sub.status === "trial" && sub.daysLeft !== null;
      expect(deveMostrarBanner).toBe(true);
    });
  });

  describe("usuário com status 'active'", () => {
    it("getSubscriptionStatus retorna canWrite=true sem banner", async () => {
      criarMockSubscription("active", null);

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const resultado = await getSubscriptionStatus("user-active");

      expect(resultado.status).toBe("active");
      expect(resultado.canWrite).toBe(true);
      expect(resultado.daysLeft).toBeNull();
      // Não deve mostrar banner de trial
      const deveMostrarBanner =
        resultado.status === "trial" && resultado.daysLeft !== null;
      expect(deveMostrarBanner).toBe(false);
    });

    it("Route Handler não bloqueia para status active", async () => {
      criarMockSubscription("active", null);

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const sub = await getSubscriptionStatus("user-active");

      const shouldBlock =
        sub.status === "read_only" || sub.status === "cancelled";
      expect(shouldBlock).toBe(false);
    });
  });

  describe("usuário com status 'cancelled'", () => {
    it("getSubscriptionStatus retorna canWrite=false para cancelled", async () => {
      criarMockSubscription("cancelled", null);

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );
      const resultado = await getSubscriptionStatus("user-cancelled");

      expect(resultado.status).toBe("cancelled");
      expect(resultado.canWrite).toBe(false);
      expect(simularRedirectReadOnly(resultado.status)).toBe(true);
    });
  });

  describe("guard do Route Handler — exemplo de uso correto", () => {
    it("simula verificação server-side que retorna 403 para write em read_only", async () => {
      criarMockSubscription("read_only", null);

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );

      // Código equivalente ao de um Route Handler real
      async function handleCreateQuote(userId: string): Promise<{ status: number; body: object }> {
        const { status } = await getSubscriptionStatus(userId);
        if (status === "read_only" || status === "cancelled") {
          return { status: 403, body: { error: "Assinatura necessária" } };
        }
        return { status: 201, body: { id: "novo-orcamento" } };
      }

      const resultado = await handleCreateQuote("user-read-only");
      expect(resultado.status).toBe(403);
      expect((resultado.body as { error: string }).error).toBe("Assinatura necessária");
    });

    it("simula verificação server-side que permite write em trial", async () => {
      const futuro = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      criarMockSubscription("trial", futuro.toISOString());

      const { getSubscriptionStatus } = await import(
        "@/lib/subscription/get-status"
      );

      async function handleCreateQuote(userId: string): Promise<{ status: number; body: object }> {
        const { status } = await getSubscriptionStatus(userId);
        if (status === "read_only" || status === "cancelled") {
          return { status: 403, body: { error: "Assinatura necessária" } };
        }
        return { status: 201, body: { id: "novo-orcamento" } };
      }

      const resultado = await handleCreateQuote("user-trial");
      expect(resultado.status).toBe(201);
    });
  });
});
