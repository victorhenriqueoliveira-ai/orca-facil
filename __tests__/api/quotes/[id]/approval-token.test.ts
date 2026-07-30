/**
 * Testes unitários e de integração — approval_token
 * Task 04: PATCH e GET de orçamento estendidos para gerar/retornar approval_token
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockFrom = vi.fn();
const mockAuth = { getUser: vi.fn() };
const mockCreateClientFn = vi.fn();
const mockGetSubscriptionStatus = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClientFn,
}));

vi.mock("@/lib/subscription/get-status", () => ({
  getSubscriptionStatus: mockGetSubscriptionStatus,
}));

// Garantir que crypto.randomUUID() funciona no ambiente de testes
const FIXED_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => FIXED_UUID),
});

const APP_URL = "https://orcafacil.com.br";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost"), options);
}

function makePatchRequest(quoteId: string, body: Record<string, unknown>) {
  return makeRequest(`http://localhost/api/quotes/${quoteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(quoteId: string) {
  return makeRequest(`http://localhost/api/quotes/${quoteId}`);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const QUOTE_ID = "quote-uuid";
const USER_ID = "user-1";

/**
 * Cria mock de supabase para PATCH com suporte a:
 * - quotes.select (verificação de ownership + approval_token existente)
 * - quotes.update (atualizar status e/ou approval_token)
 * - profiles.select (buscar quote_validity_days)
 */
function buildPatchMock({
  existingToken = null as string | null,
  createdAt = "2026-01-01T00:00:00.000Z",
  updateError = null as Record<string, unknown> | null,
  tokenUpdateError = null as Record<string, unknown> | null,
  validityDays = 15,
}: {
  existingToken?: string | null;
  createdAt?: string;
  updateError?: Record<string, unknown> | null;
  tokenUpdateError?: Record<string, unknown> | null;
  validityDays?: number;
} = {}) {
  // Token que será "persistido" na tabela (simula o estado após UPDATE WHERE IS NULL)
  const persistedToken = existingToken ?? FIXED_UUID;

  mockFrom.mockImplementation((table: string) => {
    if (table === "quotes") {
      let selectCallCount = 0;
      return {
        select: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            // Primeira SELECT: buscar quote com ownership check (inclui approval_token + created_at)
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: QUOTE_ID,
                      user_id: USER_ID,
                      approval_token: existingToken,
                      created_at: createdAt,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          // Segunda SELECT: buscar token após UPDATE (refresh)
          return {
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { approval_token: persistedToken },
                error: null,
              }),
            }),
          };
        }),
        update: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockReturnValue({
            // Para update de status (quoteUpdates)
            eq: vi.fn().mockResolvedValue({ error: updateError }),
            // Para update de token (WHERE IS NULL)
            is: vi.fn().mockResolvedValue({ error: tokenUpdateError }),
            // Fallback simples
            mockResolvedValue: vi.fn().mockResolvedValue({ error: null }),
          }),
          is: vi.fn().mockResolvedValue({ error: tokenUpdateError }),
        })),
      };
    }

    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { quote_validity_days: validityDays },
              error: null,
            }),
          }),
        }),
      };
    }

    if (table === "quote_versions") {
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
    }

    return {};
  });

  mockCreateClientFn.mockResolvedValue({
    auth: mockAuth,
    from: mockFrom,
  });
}

/**
 * Cria mock de supabase para GET com suporte a approval_token no SELECT.
 */
function buildGetMock({
  status = "draft",
  approvalToken = null as string | null,
  sentAt = null as string | null,
}: {
  status?: string;
  approvalToken?: string | null;
  sentAt?: string | null;
} = {}) {
  const mockQuote = {
    id: QUOTE_ID,
    quote_number: 1,
    title: "Cozinha Moderna",
    status,
    notes: null,
    show_margin_on_pdf: true,
    customer_id: null,
    approval_token: approvalToken,
    approval_token_expires_at: approvalToken ? "2026-01-16T00:00:00.000Z" : null,
    sent_at: sentAt,
    customers: null,
    quote_versions: [],
  };

  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockQuote, error: null }),
        }),
      }),
    }),
  }));

  mockCreateClientFn.mockResolvedValue({
    auth: mockAuth,
    from: mockFrom,
  });
}

// ----------------------------------------------------------------
// PATCH — geração de approval_token
// ----------------------------------------------------------------

describe("PATCH /api/quotes/[id] — approval_token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "active", canWrite: true });
  });

  it("PATCH com status='sent' em orçamento sem token gera approval_token UUID e retorna approval_link", async () => {
    buildPatchMock({ existingToken: null });

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makePatchRequest(QUOTE_ID, { status: "sent" });
    const res = await PATCH(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.approval_token).toBeDefined();
    expect(body.approval_link).toBe(`${APP_URL}/o/${body.approval_token}`);
  });

  it("PATCH com status='sent' em orçamento que já tem token NÃO gera novo token e retorna o link existente", async () => {
    const existingToken = "existing-token-uuid-1234";
    buildPatchMock({ existingToken });

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makePatchRequest(QUOTE_ID, { status: "sent" });
    const res = await PATCH(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.approval_token).toBe(existingToken);
    expect(body.approval_link).toBe(`${APP_URL}/o/${existingToken}`);

    // crypto.randomUUID NÃO deve ter sido chamado
    expect(crypto.randomUUID).not.toHaveBeenCalled();
  });

  it("PATCH com status='draft' não gera token e não inclui approval_link no response", async () => {
    buildPatchMock({ existingToken: null });

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makePatchRequest(QUOTE_ID, { status: "draft" });
    const res = await PATCH(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.approval_token).toBeUndefined();
    expect(body.approval_link).toBeUndefined();
    expect(crypto.randomUUID).not.toHaveBeenCalled();
  });

  it("PATCH com status='accepted' não gera token (apenas status='sent' gera)", async () => {
    buildPatchMock({ existingToken: null });

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makePatchRequest(QUOTE_ID, { status: "accepted" });
    const res = await PATCH(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.approval_token).toBeUndefined();
    expect(body.approval_link).toBeUndefined();
    expect(crypto.randomUUID).not.toHaveBeenCalled();
  });

  it("PATCH com status='sent' calcula approval_token_expires_at como created_at + validity_days", async () => {
    const capturedUpdates: Record<string, unknown>[] = [];

    // Mock customizado que captura os dados do update
    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") {
        let selectCallCount = 0;
        return {
          select: vi.fn().mockImplementation(() => {
            selectCallCount++;
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: QUOTE_ID, user_id: USER_ID, approval_token: null, created_at: "2026-01-01T00:00:00.000Z" },
                    error: null,
                  }),
                }),
              }),
            };
          }),
          update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
            capturedUpdates.push(data);
            return {
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ error: null }),
                // fallback
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
              is: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { quote_validity_days: 30 }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makePatchRequest(QUOTE_ID, { status: "sent" });
    await PATCH(req, makeParams(QUOTE_ID));

    // Encontrar chamada de update com approval_token
    const tokenUpdate = capturedUpdates.find((c) => "approval_token" in c);
    expect(tokenUpdate).toBeDefined();
    if (tokenUpdate) {
      const expiresAt = new Date(tokenUpdate.approval_token_expires_at as string);
      const expected = new Date("2026-01-01T00:00:00.000Z");
      expected.setDate(expected.getDate() + 30);
      expect(expiresAt.toISOString()).toBe(expected.toISOString());
    }
  });

  it("PATCH com status='sent' persiste sent_at com timestamp", async () => {
    const beforePatch = Date.now();
    const capturedUpdates: Record<string, unknown>[] = [];

    // Mock customizado que captura os dados do update
    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") {
        return {
          select: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: QUOTE_ID, user_id: USER_ID, approval_token: null, created_at: "2026-01-01T00:00:00.000Z" },
                  error: null,
                }),
              }),
            }),
          })),
          update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
            capturedUpdates.push(data);
            return {
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ error: null }),
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
              is: vi.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { quote_validity_days: 15 }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makePatchRequest(QUOTE_ID, { status: "sent" });
    await PATCH(req, makeParams(QUOTE_ID));

    const afterPatch = Date.now();

    const tokenUpdate = capturedUpdates.find((c) => "sent_at" in c);
    expect(tokenUpdate).toBeDefined();
    if (tokenUpdate) {
      const sentAt = new Date(tokenUpdate.sent_at as string).getTime();
      expect(sentAt).toBeGreaterThanOrEqual(beforePatch);
      expect(sentAt).toBeLessThanOrEqual(afterPatch);
    }
  });
});

// ----------------------------------------------------------------
// GET — approval_link no response
// ----------------------------------------------------------------

describe("GET /api/quotes/[id] — approval_link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
  });

  it("GET de orçamento com status='sent' inclui approval_link no response", async () => {
    const token = "token-sent-uuid";
    const sentAt = "2026-01-01T10:00:00.000Z";
    buildGetMock({ status: "sent", approvalToken: token, sentAt });

    const { GET } = await import("@/app/api/quotes/[id]/route");
    const req = makeGetRequest(QUOTE_ID);
    const res = await GET(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quote.approval_token).toBe(token);
    expect(body.quote.approval_link).toBe(`${APP_URL}/o/${token}`);
    expect(body.quote.sent_at).toBe(sentAt);
  });

  it("GET de orçamento com status='accepted' inclui approval_link no response", async () => {
    const token = "token-accepted-uuid";
    buildGetMock({ status: "accepted", approvalToken: token, sentAt: "2026-01-02T10:00:00.000Z" });

    const { GET } = await import("@/app/api/quotes/[id]/route");
    const req = makeGetRequest(QUOTE_ID);
    const res = await GET(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quote.approval_link).toBe(`${APP_URL}/o/${token}`);
  });

  it("GET de orçamento com status='draft' NÃO inclui approval_link no response", async () => {
    buildGetMock({ status: "draft", approvalToken: null });

    const { GET } = await import("@/app/api/quotes/[id]/route");
    const req = makeGetRequest(QUOTE_ID);
    const res = await GET(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quote.approval_link).toBeUndefined();
    expect(body.quote.approval_token).toBeUndefined();
  });

  it("GET de orçamento com status='rejected' NÃO inclui approval_link no response", async () => {
    buildGetMock({ status: "rejected", approvalToken: null });

    const { GET } = await import("@/app/api/quotes/[id]/route");
    const req = makeGetRequest(QUOTE_ID);
    const res = await GET(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quote.approval_link).toBeUndefined();
  });
});

// ----------------------------------------------------------------
// Testes de integração — consistência PATCH → GET
// ----------------------------------------------------------------

describe("Integração — PATCH sent → GET retorna token consistente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "active", canWrite: true });
  });

  it("PATCH com status='sent' → GET do mesmo orçamento retorna approval_token e approval_link consistentes", async () => {
    // Configurar PATCH mock
    buildPatchMock({ existingToken: null });

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const patchReq = makePatchRequest(QUOTE_ID, { status: "sent" });
    const patchRes = await PATCH(patchReq, makeParams(QUOTE_ID));
    const patchBody = await patchRes.json();

    expect(patchRes.status).toBe(200);
    expect(patchBody.approval_token).toBeDefined();
    expect(patchBody.approval_link).toContain("/o/");

    const generatedToken = patchBody.approval_token;

    // Simular GET com o token gerado
    vi.resetModules();
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    buildGetMock({
      status: "sent",
      approvalToken: generatedToken,
      sentAt: new Date().toISOString(),
    });

    const { GET } = await import("@/app/api/quotes/[id]/route");
    const getReq = makeGetRequest(QUOTE_ID);
    const getRes = await GET(getReq, makeParams(QUOTE_ID));
    const getBody = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(getBody.quote.approval_token).toBe(generatedToken);
    expect(getBody.quote.approval_link).toBe(patchBody.approval_link);
  });

  it("Dois PATCHes consecutivos com status='sent' retornam o mesmo approval_link", async () => {
    const existingToken = "pre-existing-token-uuid";

    // Primeiro PATCH: token já existe
    buildPatchMock({ existingToken });

    const { PATCH: PATCH1 } = await import("@/app/api/quotes/[id]/route");
    const req1 = makePatchRequest(QUOTE_ID, { status: "sent" });
    const res1 = await PATCH1(req1, makeParams(QUOTE_ID));
    const body1 = await res1.json();

    expect(res1.status).toBe(200);
    expect(body1.approval_token).toBe(existingToken);

    // Segundo PATCH: mesmo token
    vi.resetModules();
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "active", canWrite: true });
    buildPatchMock({ existingToken });

    const { PATCH: PATCH2 } = await import("@/app/api/quotes/[id]/route");
    const req2 = makePatchRequest(QUOTE_ID, { status: "sent" });
    const res2 = await PATCH2(req2, makeParams(QUOTE_ID));
    const body2 = await res2.json();

    expect(res2.status).toBe(200);
    expect(body2.approval_link).toBe(body1.approval_link);
  });
});
