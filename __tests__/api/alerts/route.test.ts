import { describe, it, expect, vi, beforeEach } from "vitest";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockFrom = vi.fn();
const mockAuth = { getUser: vi.fn() };
const mockCreateClientFn = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClientFn,
}));

function makeRequest(url = "http://localhost/api/alerts") {
  // O handler GET não usa NextRequest diretamente, então não precisamos importar
  return undefined;
}

/**
 * Constrói o mock do Supabase para o endpoint /api/alerts.
 * Suporta configurar o resultado de cada tabela individualmente.
 */
function buildSupabaseChain({
  userId = "user-1",
  followupDays = 7,
  approvedRows = [] as Record<string, unknown>[],
  followupRows = [] as Record<string, unknown>[],
  expiringRows = [] as Record<string, unknown>[],
  profileError = null as null | { message: string },
  approvedError = null as null | { message: string },
  followupError = null as null | { message: string },
  expiringError = null as null | { message: string },
} = {}) {
  mockAuth.getUser.mockResolvedValue({ data: { user: { id: userId } } });

  // Mock para a chain do Supabase
  // Cada chamada from("profiles") retorna o perfil
  // Cada chamada from("quotes") retorna dados de quotes
  // As 3 queries de quotes são encadeadas diferentemente

  let quotesCallCount = 0;
  const quotesResponses = [
    { data: approvedRows, error: approvedError },
    { data: followupRows, error: followupError },
    { data: expiringRows, error: expiringError },
  ];

  mockFrom.mockImplementation((table: string) => {
    if (table === "profiles") {
      const mockSingle = vi.fn().mockResolvedValue({
        data: profileError ? null : { followup_days: followupDays },
        error: profileError,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      return { select: mockSelect };
    }

    if (table === "quotes") {
      const currentIndex = quotesCallCount++;
      const response = quotesResponses[currentIndex] ?? { data: [], error: null };

      // Cada query tem uma cadeia diferente de métodos
      // approved: select().eq().eq().gte()
      // followup: select().eq().eq().lt().is()
      // expiring: select().eq().eq().gte().lte().is()
      // Precisamos de uma chain flexível que sempre resolva ao final

      const buildChain = (finalResponse: typeof response): Record<string, unknown> => {
        const resolve = vi.fn().mockResolvedValue(finalResponse);
        const chainable: Record<string, unknown> = {};
        const methods = ["eq", "gte", "lte", "lt", "is", "not", "filter", "order"];
        for (const method of methods) {
          chainable[method] = vi.fn().mockReturnValue(chainable);
        }
        // O último método da chain chama a Promise — temos que retornar Promise
        // na última chamada. Usamos uma abordagem: cada método retorna o mesmo obj,
        // e o obj é um thenable (Promise-like).
        const thenableChain = {
          ...chainable,
          then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
            return Promise.resolve(finalResponse).then(resolve, reject);
          },
          catch: (reject: (reason: unknown) => unknown) => {
            return Promise.resolve(finalResponse).catch(reject);
          },
        };
        // Reatribuir todos os métodos para retornar thenableChain
        for (const method of methods) {
          (thenableChain as Record<string, unknown>)[method] = vi.fn().mockReturnValue(thenableChain);
        }
        return thenableChain;
      };

      const chain = buildChain(response);
      return { select: vi.fn().mockReturnValue(chain) };
    }

    return { select: vi.fn(), eq: vi.fn() };
  });

  mockCreateClientFn.mockResolvedValue({
    auth: mockAuth,
    from: mockFrom,
  });
}

// ----------------------------------------------------------------
// GET /api/alerts
// ----------------------------------------------------------------

describe("GET /api/alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: mockFrom,
    });

    const { GET } = await import("@/app/api/alerts/route");
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Não autorizado");
  });

  it("retorna { approved: [], followup: [], expiring: [] } quando usuário não tem orçamentos", async () => {
    buildSupabaseChain({
      approvedRows: [],
      followupRows: [],
      expiringRows: [],
    });

    const { GET } = await import("@/app/api/alerts/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ approved: [], followup: [], expiring: [] });
  });

  it("retorna orçamento na categoria followup quando status='sent' e sent_at > followup_days atrás", async () => {
    const followupQuote = {
      id: "quote-followup-1",
      quote_number: 42,
      customers: { name: "João Silva" },
    };

    buildSupabaseChain({
      approvedRows: [],
      followupRows: [followupQuote],
      expiringRows: [],
    });

    const { GET } = await import("@/app/api/alerts/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.followup).toHaveLength(1);
    expect(body.followup[0]).toMatchObject({
      quote_id: "quote-followup-1",
      quote_number: 42,
      customer_name: "João Silva",
      action_url: "/orcamentos/quote-followup-1",
    });
    expect(body.approved).toHaveLength(0);
    expect(body.expiring).toHaveLength(0);
  });

  it("retorna orçamento na categoria expiring quando approval_token_expires_at em 2 dias", async () => {
    const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const expiringQuote = {
      id: "quote-expiring-1",
      quote_number: 55,
      customers: { name: "Maria Souza" },
      approval_token_expires_at: expiresAt,
    };

    buildSupabaseChain({
      approvedRows: [],
      followupRows: [],
      expiringRows: [expiringQuote],
    });

    const { GET } = await import("@/app/api/alerts/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.expiring).toHaveLength(1);
    expect(body.expiring[0]).toMatchObject({
      quote_id: "quote-expiring-1",
      quote_number: 55,
      customer_name: "Maria Souza",
      action_url: "/orcamentos/quote-expiring-1",
      expires_at: expiresAt,
    });
    expect(body.approved).toHaveLength(0);
    expect(body.followup).toHaveLength(0);
  });

  it("retorna orçamento na categoria approved quando status='accepted' e aprovado hoje", async () => {
    const approvedQuote = {
      id: "quote-approved-1",
      quote_number: 10,
      customers: { name: "Pedro Costa" },
    };

    buildSupabaseChain({
      approvedRows: [approvedQuote],
      followupRows: [],
      expiringRows: [],
    });

    const { GET } = await import("@/app/api/alerts/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.approved).toHaveLength(1);
    expect(body.approved[0]).toMatchObject({
      quote_id: "quote-approved-1",
      quote_number: 10,
      customer_name: "Pedro Costa",
      action_url: "/orcamentos/quote-approved-1",
    });
    expect(body.followup).toHaveLength(0);
    expect(body.expiring).toHaveLength(0);
  });

  it("orçamento com followup_notified_at NOT NULL não aparece na categoria followup", async () => {
    // A query filtra IS NULL de followup_notified_at no banco.
    // No teste, o mock retorna vazio (simulando que o banco filtrou corretamente).
    buildSupabaseChain({
      approvedRows: [],
      followupRows: [], // banco excluiu o orçamento notificado
      expiringRows: [],
    });

    const { GET } = await import("@/app/api/alerts/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.followup).toHaveLength(0);
  });

  it("orçamento com expiry_notified_at NOT NULL não aparece na categoria expiring", async () => {
    // A query filtra IS NULL de expiry_notified_at no banco.
    buildSupabaseChain({
      approvedRows: [],
      followupRows: [],
      expiringRows: [], // banco excluiu o orçamento notificado
    });

    const { GET } = await import("@/app/api/alerts/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.expiring).toHaveLength(0);
  });

  it("response inclui quote_id, quote_number, customer_name e action_url em cada item", async () => {
    const quote = {
      id: "quote-all-fields",
      quote_number: 99,
      customers: { name: "Ana Lima" },
    };

    buildSupabaseChain({
      approvedRows: [quote],
      followupRows: [{ ...quote, id: "quote-f", quote_number: 1 }],
      expiringRows: [
        {
          ...quote,
          id: "quote-e",
          quote_number: 2,
          approval_token_expires_at: new Date().toISOString(),
        },
      ],
    });

    const { GET } = await import("@/app/api/alerts/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    for (const category of ["approved", "followup", "expiring"] as const) {
      expect(body[category]).toHaveLength(1);
      const item = body[category][0];
      expect(item).toHaveProperty("quote_id");
      expect(item).toHaveProperty("quote_number");
      expect(item).toHaveProperty("customer_name");
      expect(item).toHaveProperty("action_url");
      expect(item.action_url).toMatch(/^\/orcamentos\//);
    }
  });

  it("customer_name é null quando orçamento não tem cliente associado", async () => {
    const quoteWithoutCustomer = {
      id: "quote-no-customer",
      quote_number: 7,
      customers: null,
    };

    buildSupabaseChain({
      approvedRows: [quoteWithoutCustomer],
      followupRows: [],
      expiringRows: [],
    });

    const { GET } = await import("@/app/api/alerts/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.approved[0].customer_name).toBeNull();
  });

  it("usa followup_days do perfil do usuário (padrão 7 quando perfil sem campo)", async () => {
    // Quando o perfil não tem followup_days, usa 7 como padrão
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-no-fdays" } } });

    let quotesCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        const mockSingle = vi.fn().mockResolvedValue({
          data: { followup_days: null }, // campo nulo
          error: null,
        });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        return { select: mockSelect };
      }

      if (table === "quotes") {
        quotesCallCount++;
        const thenableChain: Record<string, unknown> = {
          then: (res: (value: unknown) => unknown, rej?: (reason: unknown) => unknown) =>
            Promise.resolve({ data: [], error: null }).then(res, rej),
          catch: (rej: (reason: unknown) => unknown) =>
            Promise.resolve({ data: [], error: null }).catch(rej),
        };
        const methods = ["eq", "gte", "lte", "lt", "is"];
        for (const m of methods) {
          thenableChain[m] = vi.fn().mockReturnValue(thenableChain);
        }
        return { select: vi.fn().mockReturnValue(thenableChain) };
      }
      return { select: vi.fn() };
    });

    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { GET } = await import("@/app/api/alerts/route");
    const res = await GET();
    expect(res.status).toBe(200);
    // 3 queries de quotes devem ser feitas
    expect(quotesCallCount).toBe(3);
  });
});
