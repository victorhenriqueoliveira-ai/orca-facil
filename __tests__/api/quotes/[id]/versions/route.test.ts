import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockFrom = vi.fn();
const mockAuth = { getUser: vi.fn() };
const mockCreateClientFn = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClientFn,
}));

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost"), options);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const QUOTE_ID = "quote-uuid";
const VERSION_ID = "version-uuid";
const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";

function setupAuthUser(userId = USER_ID) {
  mockAuth.getUser.mockResolvedValue({ data: { user: { id: userId } } });
}

function mockQuoteFound(quoteUserId = USER_ID) {
  return vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: QUOTE_ID, user_id: quoteUserId },
          error: null,
        }),
      }),
    }),
  });
}

function mockQuoteNotFound() {
  return vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
      }),
    }),
  });
}

// ----------------------------------------------------------------
// POST /api/quotes/[id]/versions
// ----------------------------------------------------------------

describe("POST /api/quotes/[id]/versions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    setupAuthUser();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: mockFrom,
    });

    const { POST } = await import("@/app/api/quotes/[id]/versions/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/versions`, {
      method: "POST",
      body: JSON.stringify({ name: "Premium" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, makeParams(QUOTE_ID));
    expect(res.status).toBe(401);
  });

  it("retorna 403 quando orçamento pertence a outro usuário", async () => {
    // User is authenticated but quote belongs to a different user
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: OTHER_USER_ID } } });
    const quoteNotFound = mockQuoteNotFound();

    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") return { select: quoteNotFound };
      return { select: vi.fn() };
    });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { POST } = await import("@/app/api/quotes/[id]/versions/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/versions`, {
      method: "POST",
      body: JSON.stringify({ name: "Premium" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, makeParams(QUOTE_ID));
    expect(res.status).toBe(403);
  });

  it("retorna 400 quando name está ausente", async () => {
    const quoteFoundSelect = mockQuoteFound();

    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") return { select: quoteFoundSelect };
      return { select: vi.fn() };
    });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { POST } = await import("@/app/api/quotes/[id]/versions/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/versions`, {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, makeParams(QUOTE_ID));
    expect(res.status).toBe(400);
  });

  it("cria versão e retorna 201 com version_id", async () => {
    const quoteFoundSelect = mockQuoteFound();

    // Mock for existing versions query
    const mockVersionsOrder = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: [{ id: "v1", sort_order: 0 }], error: null }),
    });
    const mockVersionsEq = vi.fn().mockReturnValue({ order: mockVersionsOrder });
    const mockVersionsSelect = vi.fn().mockReturnValue({ eq: mockVersionsEq });

    // Mock for insert
    const mockVersionSingle = vi.fn().mockResolvedValue({
      data: { id: VERSION_ID },
      error: null,
    });
    const mockVersionSelectAfterInsert = vi.fn().mockReturnValue({ single: mockVersionSingle });
    const mockVersionInsert = vi.fn().mockReturnValue({ select: mockVersionSelectAfterInsert });

    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") return { select: quoteFoundSelect };
      if (table === "quote_versions") {
        return { select: mockVersionsSelect, insert: mockVersionInsert };
      }
      return { select: vi.fn(), insert: vi.fn() };
    });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { POST } = await import("@/app/api/quotes/[id]/versions/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/versions`, {
      method: "POST",
      body: JSON.stringify({ name: "Premium" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, makeParams(QUOTE_ID));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.version_id).toBe(VERSION_ID);
    expect(typeof body.version_number).toBe("number");
  });
});
