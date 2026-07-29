import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockFrom = vi.fn();
const mockAdminGetUserById = vi.fn();
const mockSendQuoteApproved = vi.fn();
const mockCreateServiceClientFn = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: mockCreateServiceClientFn,
}));

vi.mock("@/lib/email/templates/quote-approved", () => ({
  sendQuoteApproved: mockSendQuoteApproved,
}));

function makeRequest(body?: unknown) {
  return new NextRequest(new URL("http://localhost/api/quotes/quote-uuid/approve"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const QUOTE_ID = "quote-uuid";
const VALID_TOKEN = "valid-token-uuid";
const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const PAST_DATE = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

// ----------------------------------------------------------------
// Helpers para montar o mock do service client
// ----------------------------------------------------------------

function makeFromMock(options: {
  quoteResult?: unknown;
  updateError?: { message: string } | null;
  profileResult?: unknown;
  customerResult?: unknown;
}) {
  return (table: string) => {
    if (table === "quotes") {
      return {
        select: () => ({
          eq: (_col: string, _val: unknown) => ({
            eq: (_col2: string, _val2: unknown) => ({
              single: () =>
                Promise.resolve(
                  options.quoteResult !== undefined
                    ? options.quoteResult
                    : { data: null, error: { message: "not found" } }
                ),
            }),
          }),
        }),
        update: () => ({
          eq: () =>
            Promise.resolve({ error: options.updateError ?? null }),
        }),
      };
    }
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve(
                options.profileResult ?? { data: { business_name: "Marcenaria Teste" }, error: null }
              ),
          }),
        }),
      };
    }
    if (table === "customers") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve(
                options.customerResult ?? { data: { name: "Cliente Teste" }, error: null }
              ),
          }),
        }),
      };
    }
    return mockFrom(table);
  };
}

function setupServiceClient(options: {
  quoteResult?: unknown;
  updateError?: { message: string } | null;
  profileResult?: unknown;
  customerResult?: unknown;
  adminUserEmail?: string | null;
}) {
  mockCreateServiceClientFn.mockReturnValue({
    from: makeFromMock(options),
    auth: {
      admin: {
        getUserById: (_id: string) =>
          Promise.resolve({
            data: { user: { email: options.adminUserEmail ?? "marceneiro@teste.com" } },
            error: null,
          }),
      },
    },
  });
}

// ----------------------------------------------------------------
// Testes
// ----------------------------------------------------------------

describe("POST /api/quotes/[id]/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendQuoteApproved.mockResolvedValue({ success: true });
  });

  it("retorna 400 quando body não contém token", async () => {
    setupServiceClient({ quoteResult: { data: null, error: null } });

    const { POST } = await import("@/app/api/quotes/[id]/approve/route");
    const req = makeRequest({});
    const res = await POST(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/token/i);
  });

  it("retorna 400 quando body é inválido (não-JSON)", async () => {
    setupServiceClient({ quoteResult: { data: null, error: null } });

    const { POST } = await import("@/app/api/quotes/[id]/approve/route");
    const req = new NextRequest(new URL("http://localhost/api/quotes/quote-uuid/approve"), {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json at all ///",
    });
    const res = await POST(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(400);
  });

  it("retorna 404 quando token não corresponde ao orçamento", async () => {
    setupServiceClient({
      quoteResult: { data: null, error: { message: "not found" } },
    });

    const { POST } = await import("@/app/api/quotes/[id]/approve/route");
    const req = makeRequest({ token: "token-errado" });
    const res = await POST(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(404);
  });

  it("retorna 409 quando orçamento já está em status 'accepted'", async () => {
    setupServiceClient({
      quoteResult: {
        data: {
          id: QUOTE_ID,
          status: "accepted",
          approval_token_expires_at: FUTURE_DATE,
          user_id: "user-1",
          quote_number: 42,
          customer_id: "customer-1",
        },
        error: null,
      },
    });

    const { POST } = await import("@/app/api/quotes/[id]/approve/route");
    const req = makeRequest({ token: VALID_TOKEN });
    const res = await POST(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/aprovado/i);
  });

  it("retorna 409 quando approval_token_expires_at está no passado", async () => {
    setupServiceClient({
      quoteResult: {
        data: {
          id: QUOTE_ID,
          status: "sent",
          approval_token_expires_at: PAST_DATE,
          user_id: "user-1",
          quote_number: 42,
          customer_id: "customer-1",
        },
        error: null,
      },
    });

    const { POST } = await import("@/app/api/quotes/[id]/approve/route");
    const req = makeRequest({ token: VALID_TOKEN });
    const res = await POST(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/expirado/i);
  });

  it("retorna 200 { success: true } com token válido e orçamento ativo", async () => {
    setupServiceClient({
      quoteResult: {
        data: {
          id: QUOTE_ID,
          status: "sent",
          approval_token_expires_at: FUTURE_DATE,
          user_id: "user-1",
          quote_number: 42,
          customer_id: "customer-1",
        },
        error: null,
      },
    });

    const { POST } = await import("@/app/api/quotes/[id]/approve/route");
    const req = makeRequest({ token: VALID_TOKEN });
    const res = await POST(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("chama sendQuoteApproved após aprovação bem-sucedida", async () => {
    setupServiceClient({
      quoteResult: {
        data: {
          id: QUOTE_ID,
          status: "sent",
          approval_token_expires_at: FUTURE_DATE,
          user_id: "user-1",
          quote_number: 42,
          customer_id: "customer-1",
        },
        error: null,
      },
      adminUserEmail: "marceneiro@teste.com",
    });

    const { POST } = await import("@/app/api/quotes/[id]/approve/route");
    const req = makeRequest({ token: VALID_TOKEN });
    await POST(req, makeParams(QUOTE_ID));

    // Aguardar micro-tasks (fire-and-forget)
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockSendQuoteApproved).toHaveBeenCalledWith(
      "marceneiro@teste.com",
      expect.objectContaining({ quote_number: 42 })
    );
  });

  it("retorna 409 quando status é 'expired'", async () => {
    setupServiceClient({
      quoteResult: {
        data: {
          id: QUOTE_ID,
          status: "expired",
          approval_token_expires_at: FUTURE_DATE,
          user_id: "user-1",
          quote_number: 42,
          customer_id: null,
        },
        error: null,
      },
    });

    const { POST } = await import("@/app/api/quotes/[id]/approve/route");
    const req = makeRequest({ token: VALID_TOKEN });
    const res = await POST(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(409);
  });

  it("retorna 409 quando status é 'cancelled'", async () => {
    setupServiceClient({
      quoteResult: {
        data: {
          id: QUOTE_ID,
          status: "cancelled",
          approval_token_expires_at: FUTURE_DATE,
          user_id: "user-1",
          quote_number: 42,
          customer_id: null,
        },
        error: null,
      },
    });

    const { POST } = await import("@/app/api/quotes/[id]/approve/route");
    const req = makeRequest({ token: VALID_TOKEN });
    const res = await POST(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(409);
  });
});
