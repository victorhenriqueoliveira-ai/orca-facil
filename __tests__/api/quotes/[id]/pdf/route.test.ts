import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockAuthGetUser = vi.fn();
const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();
const mockCreateClientFn = vi.fn();
const mockCreateServiceClientFn = vi.fn();
const mockGetSubscriptionStatus = vi.fn();
const mockGeneratePdfFromHtml = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClientFn,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: mockCreateServiceClientFn,
}));

vi.mock("@/lib/subscription/get-status", () => ({
  getSubscriptionStatus: mockGetSubscriptionStatus,
}));

vi.mock("puppeteer-core", () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn().mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("@sparticuz/chromium", () => ({
  default: {
    args: ["--no-sandbox"],
    executablePath: vi.fn().mockResolvedValue("/usr/bin/chromium"),
    headless: true,
  },
}));

// Mock generate to avoid real Puppeteer
vi.mock("@/lib/pdf/generate", () => ({
  generatePdfFromHtml: mockGeneratePdfFromHtml,
}));

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeRequest(
  url: string,
  body?: Record<string, unknown>,
  method = "POST"
) {
  return new NextRequest(new URL(url, "http://localhost"), {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const mockQuote = {
  id: "quote-1",
  quote_number: 1,
  status: "draft",
  notes: null,
  validity_days: 30,
  created_at: "2024-01-01T00:00:00Z",
  user_id: "user-1",
  customers: { id: "c1", name: "Cliente Teste", phone: null, email: null, address: null },
  quote_versions: [
    {
      id: "version-1",
      name: "Padrão",
      profit_margin_pct: 0,
      sort_order: 0,
      quote_rooms: [
        {
          id: "room-1",
          name: "Sala",
          sort_order: 0,
          quote_items: [
            { id: "i1", name: "Armário", unit: "un", unit_price: 500, quantity: 1, sort_order: 0 },
          ],
        },
      ],
    },
  ],
};

const mockProfile = {
  business_name: "Marcenaria Teste",
  city: "SP",
  phone: null,
  logo_url: null,
  pix_key: null,
  bank_info: null,
  quote_validity_days: 30,
};

function buildSupabaseChain() {
  // User client mock
  mockFrom.mockImplementation((table: string) => {
    if (table === "quotes") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockQuote, error: null }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      };
    }
    return {};
  });

  mockCreateClientFn.mockResolvedValue({
    auth: { getUser: mockAuthGetUser },
    from: mockFrom,
    storage: { from: mockStorageFrom },
  });

  // Service client mock
  const mockServiceFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "quote_pdfs") {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === "quotes") {
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    return {};
  });

  const mockServiceStorage = {
    from: vi.fn().mockImplementation((_bucket: string) => ({
      createSignedUrl: vi
        .fn()
        .mockResolvedValue({
          data: { signedUrl: "https://storage.example.com/pdf/file.pdf" },
          error: null,
        }),
      upload: vi.fn().mockResolvedValue({ error: null }),
    })),
  };

  mockCreateServiceClientFn.mockReturnValue({
    from: mockServiceFrom,
    storage: mockServiceStorage,
  });
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("POST /api/quotes/[id]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "active", canWrite: true });
    mockGeneratePdfFromHtml.mockResolvedValue(Buffer.from("%PDF-1.4"));
    buildSupabaseChain();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: mockFrom,
    });

    const { POST } = await import("@/app/api/quotes/[id]/pdf/route");
    const req = makeRequest("http://localhost/api/quotes/quote-1/pdf");
    const res = await POST(req, { params: Promise.resolve({ id: "quote-1" }) });
    expect(res.status).toBe(401);
  });

  it("retorna 403 para subscription read_only", async () => {
    mockGetSubscriptionStatus.mockResolvedValue({ status: "read_only", canWrite: false });

    const { POST } = await import("@/app/api/quotes/[id]/pdf/route");
    const req = makeRequest("http://localhost/api/quotes/quote-1/pdf");
    const res = await POST(req, { params: Promise.resolve({ id: "quote-1" }) });
    expect(res.status).toBe(403);
  });

  it("retorna 403 para subscription cancelled", async () => {
    mockGetSubscriptionStatus.mockResolvedValue({ status: "cancelled", canWrite: false });

    const { POST } = await import("@/app/api/quotes/[id]/pdf/route");
    const req = makeRequest("http://localhost/api/quotes/quote-1/pdf");
    const res = await POST(req, { params: Promise.resolve({ id: "quote-1" }) });
    expect(res.status).toBe(403);
  });

  it("retorna 404 se o orçamento não pertence ao usuário", async () => {
    const mockFromNotFound = vi.fn().mockImplementation((table: string) => {
      if (table === "quotes") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
              }),
            }),
          }),
        };
      }
      return mockFrom(table);
    });

    mockCreateClientFn.mockResolvedValue({
      auth: { getUser: mockAuthGetUser },
      from: mockFromNotFound,
    });

    const { POST } = await import("@/app/api/quotes/[id]/pdf/route");
    const req = makeRequest("http://localhost/api/quotes/other-quote/pdf");
    const res = await POST(req, { params: Promise.resolve({ id: "other-quote" }) });
    expect(res.status).toBe(404);
  });

  it("retorna 403 se version_ids pertencem a outro orçamento", async () => {
    const { POST } = await import("@/app/api/quotes/[id]/pdf/route");
    const req = makeRequest("http://localhost/api/quotes/quote-1/pdf", {
      mode: "summary",
      version_ids: ["invalid-version-id"],
    });
    const res = await POST(req, { params: Promise.resolve({ id: "quote-1" }) });
    expect(res.status).toBe(403);
  });

  it("retorna 200 com signed_url quando geração bem-sucedida", async () => {
    const { POST } = await import("@/app/api/quotes/[id]/pdf/route");
    const req = makeRequest("http://localhost/api/quotes/quote-1/pdf", {
      mode: "summary",
      version_ids: ["version-1"],
    });
    const res = await POST(req, { params: Promise.resolve({ id: "quote-1" }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("signed_url");
    expect(typeof body.signed_url).toBe("string");
    expect(body.signed_url).toContain("https://");
  });

  it("usa modo summary por padrão quando não especificado", async () => {
    const { POST } = await import("@/app/api/quotes/[id]/pdf/route");
    const req = makeRequest("http://localhost/api/quotes/quote-1/pdf", {});
    const res = await POST(req, { params: Promise.resolve({ id: "quote-1" }) });
    expect(res.status).toBe(200);
  });

  it("retorna 500 se generatePdfFromHtml falhar", async () => {
    mockGeneratePdfFromHtml.mockRejectedValue(new Error("Chromium error"));

    const { POST } = await import("@/app/api/quotes/[id]/pdf/route");
    const req = makeRequest("http://localhost/api/quotes/quote-1/pdf", {
      mode: "summary",
      version_ids: ["version-1"],
    });
    const res = await POST(req, { params: Promise.resolve({ id: "quote-1" }) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("gerar PDF");
  });

  it("retorna 500 se upload para Storage falhar", async () => {
    const mockServiceStorageFail = {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: { message: "upload error" } }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://storage.example.com/pdf.pdf" },
          error: null,
        }),
      }),
    };

    mockCreateServiceClientFn.mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) }),
      storage: mockServiceStorageFail,
    });

    const { POST } = await import("@/app/api/quotes/[id]/pdf/route");
    const req = makeRequest("http://localhost/api/quotes/quote-1/pdf", {
      mode: "summary",
      version_ids: ["version-1"],
    });
    const res = await POST(req, { params: Promise.resolve({ id: "quote-1" }) });
    expect(res.status).toBe(500);
  });

  it("aceita modo detailed", async () => {
    const { POST } = await import("@/app/api/quotes/[id]/pdf/route");
    const req = makeRequest("http://localhost/api/quotes/quote-1/pdf", {
      mode: "detailed",
      version_ids: ["version-1"],
    });
    const res = await POST(req, { params: Promise.resolve({ id: "quote-1" }) });
    expect(res.status).toBe(200);
  });
});
