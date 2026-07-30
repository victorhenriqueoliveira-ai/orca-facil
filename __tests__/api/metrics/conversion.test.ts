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

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

/**
 * Constrói a cadeia de mocks do Supabase para o endpoint de conversão.
 * - sentCount: número retornado em count para a query de enviados
 * - approvedData: lista de orçamentos aprovados com suas versões e itens
 */
function buildSupabaseChain({
  user = { id: "user-1" },
  sentCount = 0,
  sentError = null,
  approvedData = [] as Array<unknown>,
  approvedError = null,
}: {
  user?: { id: string } | null;
  sentCount?: number;
  sentError?: Record<string, unknown> | null;
  approvedData?: Array<unknown>;
  approvedError?: Record<string, unknown> | null;
} = {}) {
  mockAuth.getUser.mockResolvedValue({ data: { user } });

  // Construímos dois builders separados para cada chamada `from("quotes")`
  let callCount = 0;

  mockFrom.mockImplementation((table: string) => {
    if (table !== "quotes") return {};

    callCount++;
    const currentCall = callCount;

    if (currentCall === 1) {
      // Primeira chamada: query de sent (count)
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ count: sentCount, error: sentError }),
      };
      return chain;
    } else {
      // Segunda chamada: query de approved (data)
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: approvedData, error: approvedError }),
      };
      return chain;
    }
  });

  mockCreateClientFn.mockResolvedValue({
    auth: mockAuth,
    from: mockFrom,
  });
}

// ----------------------------------------------------------------
// Testes unitários de calcularMetricas
// ----------------------------------------------------------------

describe("calcularMetricas (função pura)", () => {
  it("retorna zeros quando não há orçamentos", async () => {
    const { calcularMetricas } = await import("@/app/api/metrics/conversion/route");
    const result = calcularMetricas(0, []);
    expect(result).toEqual({
      sent: 0,
      approved: 0,
      conversion_rate: 0,
      avg_ticket: 0,
      total_approved: 0,
    });
  });

  it("conversion_rate é 0 quando sent=0 (sem divisão por zero)", async () => {
    const { calcularMetricas } = await import("@/app/api/metrics/conversion/route");
    const result = calcularMetricas(0, []);
    expect(result.conversion_rate).toBe(0);
  });

  it("calcula conversion_rate=40 com 10 enviados e 4 aprovados", async () => {
    const { calcularMetricas } = await import("@/app/api/metrics/conversion/route");

    const approvedQuotes = Array.from({ length: 4 }, () => ({
      quote_versions: [
        {
          quote_rooms: [
            {
              quote_items: [{ unit_price: 100, quantity: 1 }],
            },
          ],
        },
      ],
    }));

    const result = calcularMetricas(10, approvedQuotes);
    expect(result.conversion_rate).toBe(40);
    expect(result.sent).toBe(10);
    expect(result.approved).toBe(4);
  });

  it("calcula avg_ticket corretamente", async () => {
    const { calcularMetricas } = await import("@/app/api/metrics/conversion/route");

    // Orçamentos com valores: 1000, 2000, 3000
    const approvedQuotes = [
      {
        quote_versions: [
          { quote_rooms: [{ quote_items: [{ unit_price: 1000, quantity: 1 }] }] },
        ],
      },
      {
        quote_versions: [
          { quote_rooms: [{ quote_items: [{ unit_price: 2000, quantity: 1 }] }] },
        ],
      },
      {
        quote_versions: [
          { quote_rooms: [{ quote_items: [{ unit_price: 3000, quantity: 1 }] }] },
        ],
      },
    ];

    const result = calcularMetricas(3, approvedQuotes);
    expect(result.avg_ticket).toBe(2000); // (1000+2000+3000)/3
    expect(result.total_approved).toBe(6000);
  });

  it("calcula total_approved somando todos os itens de todas as versões", async () => {
    const { calcularMetricas } = await import("@/app/api/metrics/conversion/route");

    // Um orçamento com 2 ambientes, 2 itens cada
    const approvedQuotes = [
      {
        quote_versions: [
          {
            quote_rooms: [
              {
                quote_items: [
                  { unit_price: 100, quantity: 2 }, // 200
                  { unit_price: 50, quantity: 3 },  // 150
                ],
              },
              {
                quote_items: [
                  { unit_price: 200, quantity: 1 }, // 200
                ],
              },
            ],
          },
        ],
      },
    ];

    const result = calcularMetricas(1, approvedQuotes);
    expect(result.total_approved).toBe(550); // 200+150+200
    expect(result.avg_ticket).toBe(550);
  });

  it("retorna avg_ticket=0 quando approved=0", async () => {
    const { calcularMetricas } = await import("@/app/api/metrics/conversion/route");
    const result = calcularMetricas(5, []);
    expect(result.avg_ticket).toBe(0);
    expect(result.approved).toBe(0);
  });
});

// ----------------------------------------------------------------
// GET /api/metrics/conversion
// ----------------------------------------------------------------

describe("GET /api/metrics/conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("retorna 401 quando não autenticado", async () => {
    buildSupabaseChain({ user: null });

    const { GET } = await import("@/app/api/metrics/conversion/route");
    const req = makeRequest("http://localhost/api/metrics/conversion");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("retorna zeros quando não há orçamentos no período", async () => {
    buildSupabaseChain({ sentCount: 0, approvedData: [] });

    const { GET } = await import("@/app/api/metrics/conversion/route");
    const req = makeRequest(
      "http://localhost/api/metrics/conversion?period_start=2026-01-01&period_end=2026-01-31"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      sent: 0,
      approved: 0,
      conversion_rate: 0,
      avg_ticket: 0,
      total_approved: 0,
    });
  });

  it("filtra orçamentos pelo período informado (period_start e period_end repassados na resposta)", async () => {
    buildSupabaseChain({ sentCount: 5, approvedData: [] });

    const { GET } = await import("@/app/api/metrics/conversion/route");
    const req = makeRequest(
      "http://localhost/api/metrics/conversion?period_start=2026-01-01&period_end=2026-01-31"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(body.period_start).toBe("2026-01-01");
    expect(body.period_end).toBe("2026-01-31");
  });

  it("calcula conversion_rate=40 com 10 enviados e 4 aprovados", async () => {
    const approvedData = Array.from({ length: 4 }, () => ({
      id: "q",
      quote_versions: [
        { quote_rooms: [{ quote_items: [{ unit_price: 500, quantity: 1 }] }] },
      ],
    }));

    buildSupabaseChain({ sentCount: 10, approvedData });

    const { GET } = await import("@/app/api/metrics/conversion/route");
    const req = makeRequest(
      "http://localhost/api/metrics/conversion?period_start=2026-01-01&period_end=2026-01-31"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(body.conversion_rate).toBe(40);
    expect(body.sent).toBe(10);
    expect(body.approved).toBe(4);
  });

  it("avg_ticket é a média correta dos orçamentos aprovados", async () => {
    const approvedData = [
      {
        id: "q1",
        quote_versions: [
          { quote_rooms: [{ quote_items: [{ unit_price: 1000, quantity: 1 }] }] },
        ],
      },
      {
        id: "q2",
        quote_versions: [
          { quote_rooms: [{ quote_items: [{ unit_price: 3000, quantity: 1 }] }] },
        ],
      },
    ];

    buildSupabaseChain({ sentCount: 5, approvedData });

    const { GET } = await import("@/app/api/metrics/conversion/route");
    const req = makeRequest("http://localhost/api/metrics/conversion");
    const res = await GET(req);
    const body = await res.json();

    expect(body.avg_ticket).toBe(2000);
    expect(body.total_approved).toBe(4000);
  });

  it("total_approved é a soma correta dos valores dos orçamentos aprovados", async () => {
    const approvedData = [
      {
        id: "q1",
        quote_versions: [
          {
            quote_rooms: [
              { quote_items: [{ unit_price: 200, quantity: 2 }] }, // 400
            ],
          },
        ],
      },
      {
        id: "q2",
        quote_versions: [
          {
            quote_rooms: [
              { quote_items: [{ unit_price: 100, quantity: 3 }] }, // 300
            ],
          },
        ],
      },
    ];

    buildSupabaseChain({ sentCount: 3, approvedData });

    const { GET } = await import("@/app/api/metrics/conversion/route");
    const req = makeRequest("http://localhost/api/metrics/conversion");
    const res = await GET(req);
    const body = await res.json();

    expect(body.total_approved).toBe(700);
  });

  it("retorna 500 quando a query de enviados falha", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({ count: null, error: { message: "erro DB" } }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { GET } = await import("@/app/api/metrics/conversion/route");
    const req = makeRequest("http://localhost/api/metrics/conversion");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
