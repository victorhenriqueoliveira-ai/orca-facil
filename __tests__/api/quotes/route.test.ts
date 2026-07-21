import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockAuth = { getUser: vi.fn() };
const mockCreateClientFn = vi.fn();
const mockGetSubscriptionStatus = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClientFn,
}));

vi.mock("@/lib/subscription/get-status", () => ({
  getSubscriptionStatus: mockGetSubscriptionStatus,
}));

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost"), options);
}

/**
 * Constrói cadeia de mocks para Supabase:
 * - mockRpc: retorna quoteNumber
 * - mockFrom("quotes").insert().select().single() → quote
 * - mockFrom("quote_versions").insert().select().single() → version
 */
function buildSupabaseChain({
  quoteNumber = 1,
  quoteData = { id: "quote-uuid", quote_number: 1 },
  versionData = { id: "version-uuid" },
  quoteError = null,
  versionError = null,
  rpcError = null,
}: {
  quoteNumber?: number;
  quoteData?: Record<string, unknown> | null;
  versionData?: Record<string, unknown> | null;
  quoteError?: Record<string, unknown> | null;
  versionError?: Record<string, unknown> | null;
  rpcError?: Record<string, unknown> | null;
} = {}) {
  mockRpc.mockResolvedValue({ data: quoteNumber, error: rpcError });

  let callCount = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === "quotes") {
      const mockSingle = vi.fn().mockResolvedValue({ data: quoteData, error: quoteError });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      return { insert: mockInsert };
    }
    if (table === "quote_versions") {
      callCount++;
      const mockSingle = vi.fn().mockResolvedValue({ data: versionData, error: versionError });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      return { insert: mockInsert };
    }
    return { insert: vi.fn(), select: vi.fn() };
  });

  mockCreateClientFn.mockResolvedValue({
    auth: mockAuth,
    from: mockFrom,
    rpc: mockRpc,
  });

  return { callCount };
}

// ----------------------------------------------------------------
// POST /api/quotes
// ----------------------------------------------------------------

describe("POST /api/quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "active", canWrite: true });
  });

  it("retorna 401 quando não autenticado", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: mockFrom,
      rpc: mockRpc,
    });

    const { POST } = await import("@/app/api/quotes/route");
    const req = makeRequest("http://localhost/api/quotes", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("retorna 403 para subscription read_only", async () => {
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom, rpc: mockRpc });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "read_only", canWrite: false });

    const { POST } = await import("@/app/api/quotes/route");
    const req = makeRequest("http://localhost/api/quotes", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("retorna 403 para subscription cancelled", async () => {
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom, rpc: mockRpc });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "cancelled", canWrite: false });

    const { POST } = await import("@/app/api/quotes/route");
    const req = makeRequest("http://localhost/api/quotes", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("cria orçamento com customer_id nulo (cliente avulso)", async () => {
    buildSupabaseChain({
      quoteNumber: 5,
      quoteData: { id: "quote-uuid", quote_number: 5 },
      versionData: { id: "version-uuid" },
    });

    const { POST } = await import("@/app/api/quotes/route");
    const req = makeRequest("http://localhost/api/quotes", {
      method: "POST",
      body: JSON.stringify({ customer_id: null }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.quote_id).toBe("quote-uuid");
    expect(body.version_id).toBe("version-uuid");
    expect(body.quote_number).toBe(5);
  });

  it("chama next_quote_number e armazena o número sequencial correto", async () => {
    buildSupabaseChain({ quoteNumber: 42 });

    const { POST } = await import("@/app/api/quotes/route");
    const req = makeRequest("http://localhost/api/quotes", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    await POST(req);

    expect(mockRpc).toHaveBeenCalledWith("next_quote_number", { p_user_id: "user-1" });
  });

  it("cria orçamento com customer_id fornecido", async () => {
    buildSupabaseChain({
      quoteData: { id: "q-1", quote_number: 3 },
      versionData: { id: "v-1" },
    });

    const { POST } = await import("@/app/api/quotes/route");
    const req = makeRequest("http://localhost/api/quotes", {
      method: "POST",
      body: JSON.stringify({ customer_id: "customer-uuid-123" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.quote_id).toBe("q-1");
    expect(body.version_id).toBe("v-1");
  });

  it("retorna 500 se next_quote_number falhar", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "função não existe" } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom, rpc: mockRpc });

    const { POST } = await import("@/app/api/quotes/route");
    const req = makeRequest("http://localhost/api/quotes", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("retorna 201 mesmo sem body JSON", async () => {
    buildSupabaseChain({
      quoteData: { id: "q-new", quote_number: 1 },
      versionData: { id: "v-new" },
    });

    const { POST } = await import("@/app/api/quotes/route");
    const req = makeRequest("http://localhost/api/quotes", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});
