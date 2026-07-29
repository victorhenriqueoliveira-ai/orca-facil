import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks de e-mail ─────────────────────────────────────────────────────────

const mockSendQuoteFollowup = vi.fn();
const mockSendQuoteExpiring = vi.fn();

vi.mock("@/lib/email/resend", () => ({
  sendQuoteFollowup: mockSendQuoteFollowup,
  sendQuoteExpiring: mockSendQuoteExpiring,
}));

// ─── Mock do Supabase ────────────────────────────────────────────────────────

const mockGetUserById = vi.fn();

/**
 * Constrói uma cadeia thenable de query para o Supabase.
 * Todos os métodos retornam a própria cadeia, exceto `then` que resolve com { data, error }.
 */
function buildSelectChain(data: unknown, error: unknown) {
  const resolved = Promise.resolve({ data, error });
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.is = () => chain;
  chain.lte = () => chain;
  chain.gte = () => chain;
  chain.then = resolved.then.bind(resolved);
  return chain;
}

/**
 * Constrói uma cadeia de update que permite espionar os valores enviados.
 */
function buildUpdateChain(spy?: (vals: unknown) => void, error: unknown = null) {
  return {
    update: (vals: unknown) => {
      spy?.(vals);
      return {
        eq: () => Promise.resolve({ data: null, error }),
      };
    },
  };
}

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: mockFrom,
    auth: {
      admin: {
        getUserById: mockGetUserById,
      },
    },
  }),
}));

// ─── Importação dinâmica do handler ──────────────────────────────────────────

let POST: typeof import("@/app/api/cron/daily-notifications/route").POST;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();

  // Re-registrar mocks após reset
  vi.mock("@/lib/email/resend", () => ({
    sendQuoteFollowup: mockSendQuoteFollowup,
    sendQuoteExpiring: mockSendQuoteExpiring,
  }));

  vi.mock("@/lib/supabase/service", () => ({
    createServiceClient: () => ({
      from: mockFrom,
      auth: {
        admin: {
          getUserById: mockGetUserById,
        },
      },
    }),
  }));

  const mod = await import("@/app/api/cron/daily-notifications/route");
  POST = mod.POST;

  process.env.CRON_SECRET = "segredo-de-teste";
  process.env.NEXT_PUBLIC_APP_URL = "https://orcafacil.com.br";

  // Default: e-mail sempre disponível
  mockGetUserById.mockResolvedValue({ data: { user: { email: "test@example.com" } } });
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function criarRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers["Authorization"] = authHeader;
  return new NextRequest("http://localhost:3000/api/cron/daily-notifications", {
    method: "POST",
    headers,
  });
}

/**
 * Configura o mockFrom para sequência: followup → expiring → updates
 * `updateSpy` é chamado com os valores de cada UPDATE.
 */
function setupMockFrom(opts: {
  followupData?: unknown[] | null;
  followupError?: unknown;
  expiringData?: unknown[] | null;
  expiringError?: unknown;
  updateSpy?: (vals: unknown) => void;
}) {
  const { followupData = [], followupError = null, expiringData = [], expiringError = null, updateSpy } = opts as {
    followupData: unknown[] | null;
    followupError: unknown;
    expiringData: unknown[] | null;
    expiringError: unknown;
    updateSpy?: (vals: unknown) => void;
  };
  let selectCallCount = 0;

  mockFrom.mockImplementation(() => {
    // Qualquer tabela diferente de quotes não importa — retornar chain vazia
    // Para 'quotes' rastreamos a sequência
    const selectResult = () => {
      selectCallCount++;
      if (selectCallCount === 1) return buildSelectChain(followupData, followupError);
      return buildSelectChain(expiringData, expiringError);
    };

    return {
      ...buildUpdateChain(updateSpy),
      select: () => {
        selectCallCount++;
        if (selectCallCount === 1) return buildSelectChain(followupData, followupError);
        return buildSelectChain(expiringData, expiringError);
      },
    };
  });
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe("POST /api/cron/daily-notifications", () => {
  describe("Autenticação", () => {
    it("retorna 401 sem header Authorization", async () => {
      const req = criarRequest();
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("retorna 401 com token incorreto", async () => {
      const req = criarRequest("Bearer token-errado");
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("retorna 200 com token correto e sem orçamentos elegíveis", async () => {
      setupMockFrom({ followupData: [], expiringData: [] });

      const req = criarRequest("Bearer segredo-de-teste");
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ followup: 0, expiring: 0 });
    });
  });

  describe("Follow-up — campo sentinela", () => {
    it("não envia e-mail quando followup_notified_at já está preenchido (query retorna vazio)", async () => {
      // O banco aplica IS NULL na query; simulamos retornando array vazio
      setupMockFrom({ followupData: [], expiringData: [] });

      const req = criarRequest("Bearer segredo-de-teste");
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockSendQuoteFollowup).not.toHaveBeenCalled();
    });

    it("envia follow-up e atualiza followup_notified_at após sucesso", async () => {
      const quote = {
        id: "quote-001",
        user_id: "user-001",
        title: "Cozinha completa",
        quote_number: 42,
        sent_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        customers: { name: "Cliente Teste" },
        profiles: { followup_days: 5, business_name: "Marcenaria Silva", id: "user-001" },
      };

      const updateSpy = vi.fn();
      setupMockFrom({ followupData: [quote], expiringData: [], updateSpy });
      mockSendQuoteFollowup.mockResolvedValue({ success: true, id: "email-001" });

      const req = criarRequest("Bearer segredo-de-teste");
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockSendQuoteFollowup).toHaveBeenCalledOnce();
      const body = await res.json();
      expect(body.followup).toBe(1);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ followup_notified_at: expect.any(String) })
      );
    });

    it("não atualiza followup_notified_at quando envio falha", async () => {
      const quote = {
        id: "quote-002",
        user_id: "user-002",
        title: "Dormitório",
        quote_number: 7,
        sent_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        customers: { name: "Cliente Falha" },
        profiles: { followup_days: 5, business_name: "Marcenaria X", id: "user-002" },
      };

      const updateSpy = vi.fn();
      setupMockFrom({ followupData: [quote], expiringData: [], updateSpy });
      mockSendQuoteFollowup.mockResolvedValue({ success: false, error: "SMTP timeout" });

      const req = criarRequest("Bearer segredo-de-teste");
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.followup).toBe(0);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("respeita followup_days específico de cada perfil de usuário", async () => {
      const now = Date.now();
      // Usuário com followup_days=2: 3 dias atrás → elegível
      const quoteSim = {
        id: "q-sim",
        user_id: "u-sim",
        quote_number: 1,
        title: "T",
        sent_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
        customers: { name: "C1" },
        profiles: { followup_days: 2, business_name: "B1", id: "u-sim" },
      };
      // Usuário com followup_days=10: 3 dias atrás → NÃO elegível
      const quoteNao = {
        id: "q-nao",
        user_id: "u-nao",
        quote_number: 2,
        title: "T2",
        sent_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
        customers: { name: "C2" },
        profiles: { followup_days: 10, business_name: "B2", id: "u-nao" },
      };

      setupMockFrom({ followupData: [quoteSim, quoteNao], expiringData: [] });
      mockSendQuoteFollowup.mockResolvedValue({ success: true });

      const req = criarRequest("Bearer segredo-de-teste");
      const res = await POST(req);
      expect(res.status).toBe(200);
      // Apenas quoteSim deve gerar e-mail
      expect(mockSendQuoteFollowup).toHaveBeenCalledOnce();
      const body = await res.json();
      expect(body.followup).toBe(1);
    });
  });

  describe("Casos de borda", () => {
    it("pula follow-up quando marceneiro não tem e-mail cadastrado", async () => {
      const quote = {
        id: "q-sem-email",
        user_id: "u-sem-email",
        quote_number: 5,
        title: "Armário",
        sent_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        customers: { name: "C" },
        profiles: { followup_days: 5, business_name: "B", id: "u-sem-email" },
      };
      setupMockFrom({ followupData: [quote], expiringData: [] });
      // Sem email
      mockGetUserById.mockResolvedValue({ data: { user: null } });

      const req = criarRequest("Bearer segredo-de-teste");
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockSendQuoteFollowup).not.toHaveBeenCalled();
      const body = await res.json();
      expect(body.followup).toBe(0);
    });

    it("pula vencimento quando marceneiro não tem e-mail cadastrado", async () => {
      const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const quote = {
        id: "q-sem-email-exp",
        user_id: "u-sem-email-exp",
        quote_number: 6,
        title: "Closet",
        approval_token_expires_at: expiresAt,
        customers: { name: "C" },
        profiles: { business_name: "B", id: "u-sem-email-exp" },
      };
      setupMockFrom({ followupData: [], expiringData: [quote] });
      mockGetUserById.mockResolvedValue({ data: { user: null } });

      const req = criarRequest("Bearer segredo-de-teste");
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockSendQuoteExpiring).not.toHaveBeenCalled();
      const body = await res.json();
      expect(body.expiring).toBe(0);
    });

    it("retorna 500 quando query de vencimento falha no banco", async () => {
      const dbError = { message: "connection timeout", code: "TIMEOUT" };
      setupMockFrom({ followupData: [], expiringData: null, expiringError: dbError });

      const req = criarRequest("Bearer segredo-de-teste");
      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Database error");
    });

    it("retorna 500 quando query de follow-up falha no banco", async () => {
      const dbError = { message: "connection refused", code: "ECONNREFUSED" };
      setupMockFrom({ followupData: null, followupError: dbError, expiringData: [] });

      const req = criarRequest("Bearer segredo-de-teste");
      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Database error");
    });

    it("retorna 500 quando CRON_SECRET não está configurado", async () => {
      const original = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;

      const req = criarRequest("Bearer segredo-de-teste");
      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Internal server error");

      process.env.CRON_SECRET = original;
    });
  });

  describe("Vencimento — campo sentinela", () => {
    it("não envia e-mail quando expiry_notified_at já está preenchido (query retorna vazio)", async () => {
      setupMockFrom({ followupData: [], expiringData: [] });

      const req = criarRequest("Bearer segredo-de-teste");
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockSendQuoteExpiring).not.toHaveBeenCalled();
    });

    it("envia e-mail de vencimento e atualiza expiry_notified_at após sucesso", async () => {
      const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const quote = {
        id: "q-exp-001",
        user_id: "u-exp",
        title: "Sala",
        quote_number: 99,
        approval_token_expires_at: expiresAt,
        customers: { name: "Cliente Exp" },
        profiles: { business_name: "Marcenaria Exp", id: "u-exp" },
      };

      const updateSpy = vi.fn();
      setupMockFrom({ followupData: [], expiringData: [quote], updateSpy });
      mockSendQuoteExpiring.mockResolvedValue({ success: true, id: "e-001" });

      const req = criarRequest("Bearer segredo-de-teste");
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockSendQuoteExpiring).toHaveBeenCalledOnce();
      const body = await res.json();
      expect(body.expiring).toBe(1);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ expiry_notified_at: expect.any(String) })
      );
    });

    it("não atualiza expiry_notified_at quando envio falha", async () => {
      const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
      const quote = {
        id: "q-exp-002",
        user_id: "u-exp2",
        quote_number: 3,
        title: "Bancada",
        approval_token_expires_at: expiresAt,
        customers: { name: "C" },
        profiles: { business_name: "B", id: "u-exp2" },
      };

      const updateSpy = vi.fn();
      setupMockFrom({ followupData: [], expiringData: [quote], updateSpy });
      mockSendQuoteExpiring.mockResolvedValue({ success: false, error: "Timeout" });

      const req = criarRequest("Bearer segredo-de-teste");
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.expiring).toBe(0);
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });
});
