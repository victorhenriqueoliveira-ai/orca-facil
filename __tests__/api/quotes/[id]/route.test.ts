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

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost"), options);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const QUOTE_ID = "quote-uuid";
const VERSION_ID = "version-uuid";

// ----------------------------------------------------------------
// Setup helpers
// ----------------------------------------------------------------

function setupBase() {
  mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mockGetSubscriptionStatus.mockResolvedValue({ status: "active", canWrite: true });
}

function setupSupabaseClient(overrides?: { fromImpl?: (table: string) => unknown }) {
  mockCreateClientFn.mockResolvedValue({
    auth: mockAuth,
    from: overrides?.fromImpl ?? mockFrom,
  });
}

// ----------------------------------------------------------------
// GET /api/quotes/[id]
// ----------------------------------------------------------------

describe("GET /api/quotes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupBase();
  });

  it("retorna 401 se não autenticado", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    setupSupabaseClient();

    const { GET } = await import("@/app/api/quotes/[id]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}`);
    const res = await GET(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(401);
  });

  it("retorna 404 se orçamento não pertence ao usuário", async () => {
    setupSupabaseClient({
      fromImpl: () => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
            }),
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/quotes/[id]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}`);
    const res = await GET(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(404);
  });

  it("retorna 200 com estrutura quote + versions + rooms + items", async () => {
    const mockQuote = {
      id: QUOTE_ID,
      quote_number: 1,
      title: null,
      status: "draft",
      notes: null,
      customer_id: null,
      customers: null,
      quote_versions: [
        {
          id: VERSION_ID,
          version_number: 1,
          profit_margin_pct: 30,
          quote_rooms: [
            {
              id: "room-1",
              name: "Cozinha",
              position: 0,
              template_id: null,
              quote_items: [
                {
                  id: "item-1",
                  name: "Chapa MDF",
                  type: "material",
                  unit: "m²",
                  unit_price: 85,
                  quantity: 4.5,
                  position: 0,
                  catalog_item_id: null,
                },
              ],
            },
          ],
        },
      ],
    };

    setupSupabaseClient({
      fromImpl: () => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockQuote, error: null }),
            }),
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/quotes/[id]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}`);
    const res = await GET(req, makeParams(QUOTE_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quote).toBeDefined();
    expect(body.quote.versions).toHaveLength(1);
    expect(body.quote.versions[0].rooms).toHaveLength(1);
    expect(body.quote.versions[0].rooms[0].items).toHaveLength(1);
    expect(body.quote.versions[0].rooms[0].items[0].unit_price).toBe(85);
    expect(body.quote.versions[0].profit_margin_pct).toBe(30);
  });
});

// ----------------------------------------------------------------
// PATCH /api/quotes/[id]
// ----------------------------------------------------------------

describe("PATCH /api/quotes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupBase();
  });

  it("retorna 401 se não autenticado", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    setupSupabaseClient();

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}`, {
      method: "PATCH",
      body: JSON.stringify({ profit_margin_pct: 25 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, makeParams(QUOTE_ID));
    expect(res.status).toBe(401);
  });

  it("retorna 403 se subscription read_only", async () => {
    mockGetSubscriptionStatus.mockResolvedValue({ status: "read_only", canWrite: false });
    setupSupabaseClient();

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}`, {
      method: "PATCH",
      body: JSON.stringify({ profit_margin_pct: 25 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, makeParams(QUOTE_ID));
    expect(res.status).toBe(403);
  });

  it("retorna 400 se profit_margin_pct inválido (negativo)", async () => {
    setupSupabaseClient({
      fromImpl: () => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: QUOTE_ID, user_id: "user-1" }, error: null }),
            }),
          }),
        }),
      }),
    });

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}`, {
      method: "PATCH",
      body: JSON.stringify({ profit_margin_pct: -5 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, makeParams(QUOTE_ID));
    expect(res.status).toBe(400);
  });

  it("atualiza profit_margin_pct com sucesso e retorna 200", async () => {
    // With version_id: .update().eq("quote_id", ...).eq("id", ...)
    const mockVersionEqId = vi.fn().mockResolvedValue({ error: null });
    const mockVersionEqQuoteId = vi.fn().mockReturnValue({ eq: mockVersionEqId });
    const mockVersionUpdate = vi.fn().mockReturnValue({ eq: mockVersionEqQuoteId });

    setupSupabaseClient({
      fromImpl: (table: string) => {
        if (table === "quotes") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: QUOTE_ID, user_id: "user-1" }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "quote_versions") {
          return { update: mockVersionUpdate };
        }
        return {};
      },
    });

    const { PATCH } = await import("@/app/api/quotes/[id]/route");
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}`, {
      method: "PATCH",
      body: JSON.stringify({ profit_margin_pct: 25, version_id: VERSION_ID }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, makeParams(QUOTE_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
