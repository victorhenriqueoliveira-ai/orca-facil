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

vi.mock("@/lib/subscription/get-status", () => ({
  getSubscriptionStatus: vi.fn().mockResolvedValue({ status: "active", canWrite: true }),
}));

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

// ----------------------------------------------------------------
// GET /api/quotes
// ----------------------------------------------------------------

describe("GET /api/quotes", () => {
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

    const { GET } = await import("@/app/api/quotes/route");
    const req = makeRequest("http://localhost/api/quotes");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("retorna lista vazia quando não há orçamentos", async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    // count query
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
    };

    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return countChain;
      return mockChain;
    });

    mockCreateClientFn.mockResolvedValue({
      auth: mockAuth,
      from: mockFrom,
    });

    const { GET } = await import("@/app/api/quotes/route");
    const req = makeRequest("http://localhost/api/quotes");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quotes).toHaveLength(0);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
  });

  it("retorna apenas orçamentos com status 'sent' quando filtrado", async () => {
    const sentQuote = {
      id: "q-1",
      quote_number: 1,
      title: null,
      status: "sent",
      created_at: "2024-01-01T00:00:00Z",
      customers: { id: "c1", name: "Cliente A" },
      quote_versions: [],
      quote_pdfs: [],
    };

    // count chain: select → eq (user_id) → eq (status) → resolves
    const mockCountInnerEq = vi.fn().mockResolvedValue({ count: 1, error: null });
    const mockCountOuterEq = vi.fn().mockReturnValue({ eq: mockCountInnerEq });
    const mockCountChain = {
      select: vi.fn().mockReturnValue({ eq: mockCountOuterEq }),
    };

    // data chain (with status filter): select → eq(user_id) → eq(status) → order → range → resolves
    const mockDataRange = vi.fn().mockResolvedValue({ data: [sentQuote], error: null });
    const mockDataOrder = vi.fn().mockReturnValue({ range: mockDataRange });
    const mockDataStatusEq = vi.fn().mockReturnValue({ order: mockDataOrder });
    const mockDataUserEq = vi.fn().mockReturnValue({ eq: mockDataStatusEq, order: mockDataOrder });
    const mockDataChain = {
      select: vi.fn().mockReturnValue({ eq: mockDataUserEq }),
    };

    let idx = 0;
    mockFrom.mockImplementation(() => {
      idx++;
      if (idx === 1) return mockCountChain;
      return mockDataChain;
    });

    mockCreateClientFn.mockResolvedValue({
      auth: mockAuth,
      from: mockFrom,
    });

    const { GET } = await import("@/app/api/quotes/route");
    const req = makeRequest("http://localhost/api/quotes?status=sent");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quotes).toHaveLength(1);
    expect(body.quotes[0].status).toBe("sent");
  });

  it("retorna paginação correta com page=2&limit=10", async () => {
    const mockCountChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 25, error: null }),
    };

    const mockDataChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    let idx = 0;
    mockFrom.mockImplementation(() => {
      idx++;
      if (idx === 1) return mockCountChain;
      return mockDataChain;
    });

    mockCreateClientFn.mockResolvedValue({
      auth: mockAuth,
      from: mockFrom,
    });

    const { GET } = await import("@/app/api/quotes/route");
    const req = makeRequest("http://localhost/api/quotes?page=2&limit=10");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(2);
    expect(body.limit).toBe(10);
    expect(body.total).toBe(25);
    // range should be called with offset=10, limit 10 (range 10-19)
    expect(mockDataChain.range).toHaveBeenCalledWith(10, 19);
  });

  it("retorna 500 se consulta de count falhar", async () => {
    const mockCountChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: null, error: { message: "DB error" } }),
    };

    mockFrom.mockReturnValue(mockCountChain);

    mockCreateClientFn.mockResolvedValue({
      auth: mockAuth,
      from: mockFrom,
    });

    const { GET } = await import("@/app/api/quotes/route");
    const req = makeRequest("http://localhost/api/quotes");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("calcula total_with_margin corretamente com margem de 30%", async () => {
    const quoteWithItems = {
      id: "q-1",
      quote_number: 1,
      title: null,
      status: "draft",
      created_at: "2024-01-01T00:00:00Z",
      customers: null,
      quote_versions: [
        {
          id: "v-1",
          profit_margin_pct: 30,
          quote_items: [
            {
              quote_items: [
                { unit_price: 100, quantity: 2 }, // 200
                { unit_price: 50, quantity: 4 },  // 200
              ],
            },
          ],
        },
      ],
      quote_pdfs: [],
    };

    const mockCountChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
    };

    const mockDataChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [quoteWithItems], error: null }),
    };

    let idx = 0;
    mockFrom.mockImplementation(() => {
      idx++;
      if (idx === 1) return mockCountChain;
      return mockDataChain;
    });

    mockCreateClientFn.mockResolvedValue({
      auth: mockAuth,
      from: mockFrom,
    });

    const { GET } = await import("@/app/api/quotes/route");
    const req = makeRequest("http://localhost/api/quotes");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    // subtotal = 400, margin = 30% → total = 400 * 1.3 = 520
    expect(body.quotes[0].total_with_margin).toBe(520);
  });
});
