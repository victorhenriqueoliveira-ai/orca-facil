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

function makeRequest(url: string, method = "DELETE", body?: unknown) {
  return new NextRequest(new URL(url, "http://localhost"), {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }
      : {}),
  });
}

function makeParams(id: string, vid: string) {
  return { params: Promise.resolve({ id, vid }) };
}

const QUOTE_ID = "quote-uuid";
const VERSION_ID = "version-uuid";
const OTHER_VERSION_ID = "other-version-uuid";
const USER_ID = "user-1";

function setupAuthUser() {
  mockAuth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
}

function mockQuoteFound() {
  return vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: QUOTE_ID, user_id: USER_ID },
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
// DELETE /api/quotes/[id]/versions/[vid]
// ----------------------------------------------------------------

describe("DELETE /api/quotes/[id]/versions/[vid]", () => {
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

    const { DELETE } = await import("@/app/api/quotes/[id]/versions/[vid]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/versions/${VERSION_ID}`);
    const res = await DELETE(req, makeParams(QUOTE_ID, VERSION_ID));
    expect(res.status).toBe(401);
  });

  it("retorna 409 quando é a única versão restante (guard de mínimo 1 versão)", async () => {
    const quoteFoundSelect = mockQuoteFound();

    // Only one version exists
    const mockVersionsEq = vi.fn().mockResolvedValue({
      data: [{ id: VERSION_ID }],
      error: null,
    });
    const mockVersionsSelect = vi.fn().mockReturnValue({ eq: mockVersionsEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") return { select: quoteFoundSelect };
      if (table === "quote_versions") return { select: mockVersionsSelect };
      return { select: vi.fn() };
    });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { DELETE } = await import("@/app/api/quotes/[id]/versions/[vid]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/versions/${VERSION_ID}`);
    const res = await DELETE(req, makeParams(QUOTE_ID, VERSION_ID));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain("ao menos uma versão");
  });

  it("retorna 403 quando orçamento não pertence ao usuário", async () => {
    const quoteNotFound = mockQuoteNotFound();

    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") return { select: quoteNotFound };
      return { select: vi.fn() };
    });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { DELETE } = await import("@/app/api/quotes/[id]/versions/[vid]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/versions/${VERSION_ID}`);
    const res = await DELETE(req, makeParams(QUOTE_ID, VERSION_ID));
    expect(res.status).toBe(403);
  });

  it("deleta a versão quando há mais de uma e retorna 200", async () => {
    const quoteFoundSelect = mockQuoteFound();

    // Two versions exist
    const mockVersionsEq = vi.fn().mockResolvedValue({
      data: [{ id: VERSION_ID }, { id: OTHER_VERSION_ID }],
      error: null,
    });
    const mockVersionsSelect = vi.fn().mockReturnValue({ eq: mockVersionsEq });

    // Delete mock
    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") return { select: quoteFoundSelect };
      if (table === "quote_versions") {
        return { select: mockVersionsSelect, delete: mockDelete };
      }
      return { select: vi.fn() };
    });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { DELETE } = await import("@/app/api/quotes/[id]/versions/[vid]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/versions/${VERSION_ID}`);
    const res = await DELETE(req, makeParams(QUOTE_ID, VERSION_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("retorna 404 quando version_id não pertence ao orçamento", async () => {
    const quoteFoundSelect = mockQuoteFound();

    // Only the other version exists in this quote
    const mockVersionsEq = vi.fn().mockResolvedValue({
      data: [{ id: OTHER_VERSION_ID }, { id: "third-version" }],
      error: null,
    });
    const mockVersionsSelect = vi.fn().mockReturnValue({ eq: mockVersionsEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") return { select: quoteFoundSelect };
      if (table === "quote_versions") return { select: mockVersionsSelect };
      return { select: vi.fn() };
    });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { DELETE } = await import("@/app/api/quotes/[id]/versions/[vid]/route");
    // Trying to delete VERSION_ID which is not in this quote's versions
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/versions/${VERSION_ID}`);
    const res = await DELETE(req, makeParams(QUOTE_ID, VERSION_ID));
    expect(res.status).toBe(404);
  });
});

// ----------------------------------------------------------------
// PATCH /api/quotes/[id]/versions/[vid]
// ----------------------------------------------------------------

describe("PATCH /api/quotes/[id]/versions/[vid]", () => {
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

    const { PATCH } = await import("@/app/api/quotes/[id]/versions/[vid]/route");
    const req = makeRequest(
      `http://localhost/api/quotes/${QUOTE_ID}/versions/${VERSION_ID}`,
      "PATCH",
      { name: "Novo nome" }
    );
    const res = await PATCH(req, makeParams(QUOTE_ID, VERSION_ID));
    expect(res.status).toBe(401);
  });

  it("renomeia versão e retorna 200", async () => {
    const quoteFoundSelect = mockQuoteFound();

    // Version found
    const mockVersionSingle = vi.fn().mockResolvedValue({
      data: { id: VERSION_ID },
      error: null,
    });
    const mockVersionEq2 = vi.fn().mockReturnValue({ single: mockVersionSingle });
    const mockVersionEq1 = vi.fn().mockReturnValue({ eq: mockVersionEq2 });
    const mockVersionSelect = vi.fn().mockReturnValue({ eq: mockVersionEq1 });

    // Update mock
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") return { select: quoteFoundSelect };
      if (table === "quote_versions") {
        return { select: mockVersionSelect, update: mockUpdate };
      }
      return { select: vi.fn() };
    });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { PATCH } = await import("@/app/api/quotes/[id]/versions/[vid]/route");
    const req = makeRequest(
      `http://localhost/api/quotes/${QUOTE_ID}/versions/${VERSION_ID}`,
      "PATCH",
      { name: "Premium Atualizado" }
    );
    const res = await PATCH(req, makeParams(QUOTE_ID, VERSION_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("retorna 400 quando nenhum campo é enviado", async () => {
    const quoteFoundSelect = mockQuoteFound();

    const mockVersionSingle = vi.fn().mockResolvedValue({
      data: { id: VERSION_ID },
      error: null,
    });
    const mockVersionEq2 = vi.fn().mockReturnValue({ single: mockVersionSingle });
    const mockVersionEq1 = vi.fn().mockReturnValue({ eq: mockVersionEq2 });
    const mockVersionSelect = vi.fn().mockReturnValue({ eq: mockVersionEq1 });

    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") return { select: quoteFoundSelect };
      if (table === "quote_versions") return { select: mockVersionSelect };
      return { select: vi.fn() };
    });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { PATCH } = await import("@/app/api/quotes/[id]/versions/[vid]/route");
    const req = makeRequest(
      `http://localhost/api/quotes/${QUOTE_ID}/versions/${VERSION_ID}`,
      "PATCH",
      {}
    );
    const res = await PATCH(req, makeParams(QUOTE_ID, VERSION_ID));
    expect(res.status).toBe(400);
  });
});
