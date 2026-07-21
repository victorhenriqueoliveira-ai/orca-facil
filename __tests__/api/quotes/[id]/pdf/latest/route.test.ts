import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockAuth = { getUser: vi.fn() };
const mockFrom = vi.fn();
const mockCreateClientFn = vi.fn();
const mockServiceFrom = vi.fn();
const mockServiceStorage = { from: vi.fn() };
const mockCreateServiceClientFn = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClientFn,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: mockCreateServiceClientFn,
}));

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost"), { method: "GET" });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const QUOTE_ID = "quote-uuid";

function buildSupabase({
  quoteData = { id: QUOTE_ID },
  quoteError = null,
  pdfData = {
    id: "pdf-1",
    storage_path: "pdfs/user-1/quote-1.pdf",
    generated_at: "2024-01-01T00:00:00Z",
  },
  pdfError = null,
  signedUrl = "https://storage.example.com/pdf.pdf",
  signedError = null,
}: {
  quoteData?: Record<string, unknown> | null;
  quoteError?: Record<string, unknown> | null;
  pdfData?: Record<string, unknown> | null;
  pdfError?: Record<string, unknown> | null;
  signedUrl?: string | null;
  signedError?: Record<string, unknown> | null;
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "quotes") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: quoteData, error: quoteError }),
            }),
          }),
        }),
      };
    }

    if (table === "quote_pdfs") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: pdfData, error: pdfError }),
              }),
            }),
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

  mockServiceStorage.from.mockReturnValue({
    createSignedUrl: vi.fn().mockResolvedValue({
      data: signedUrl ? { signedUrl } : null,
      error: signedError,
    }),
  });

  mockCreateServiceClientFn.mockReturnValue({
    from: mockServiceFrom,
    storage: mockServiceStorage,
  });
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("GET /api/quotes/[id]/pdf/latest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("retorna 401 quando não autenticado", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: mockFrom,
    });

    const { GET } = await import("@/app/api/quotes/[id]/pdf/latest/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/pdf/latest`);
    const res = await GET(req, makeParams(QUOTE_ID));
    expect(res.status).toBe(401);
  });

  it("retorna 404 se orçamento não encontrado", async () => {
    buildSupabase({ quoteData: null, quoteError: { message: "not found" } });

    const { GET } = await import("@/app/api/quotes/[id]/pdf/latest/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/pdf/latest`);
    const res = await GET(req, makeParams(QUOTE_ID));
    expect(res.status).toBe(404);
  });

  it("retorna 404 se não há PDF para o orçamento", async () => {
    buildSupabase({ pdfData: null, pdfError: { message: "no rows" } });

    const { GET } = await import("@/app/api/quotes/[id]/pdf/latest/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/pdf/latest`);
    const res = await GET(req, makeParams(QUOTE_ID));
    expect(res.status).toBe(404);
  });

  it("retorna signed_url válida quando PDF existe", async () => {
    buildSupabase({ signedUrl: "https://storage.example.com/signed-pdf.pdf" });

    const { GET } = await import("@/app/api/quotes/[id]/pdf/latest/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/pdf/latest`);
    const res = await GET(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.signed_url).toBe("https://storage.example.com/signed-pdf.pdf");
    expect(body.generated_at).toBeDefined();
  });

  it("retorna 500 se geração de signed URL falhar", async () => {
    buildSupabase({ signedUrl: null, signedError: { message: "storage error" } });

    const { GET } = await import("@/app/api/quotes/[id]/pdf/latest/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/pdf/latest`);
    const res = await GET(req, makeParams(QUOTE_ID));
    expect(res.status).toBe(500);
  });

  it("chama createServiceClient para gerar nova signed URL (não usa URL salva)", async () => {
    buildSupabase({
      pdfData: {
        id: "pdf-1",
        storage_path: "pdfs/user-1/orcamento-1.pdf",
        generated_at: "2024-01-01T00:00:00Z",
      },
    });

    const { GET } = await import("@/app/api/quotes/[id]/pdf/latest/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/pdf/latest`);
    await GET(req, makeParams(QUOTE_ID));

    // Verify service client was used
    expect(mockCreateServiceClientFn).toHaveBeenCalled();
    expect(mockServiceStorage.from).toHaveBeenCalledWith("pdfs");
  });
});
