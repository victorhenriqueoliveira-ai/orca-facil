import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockAuth = { getUser: vi.fn() };
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockCreateClientFn = vi.fn();
const mockGetSubscriptionStatus = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClientFn,
}));

vi.mock("@/lib/subscription/get-status", () => ({
  getSubscriptionStatus: mockGetSubscriptionStatus,
}));

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost"), { method: "POST" });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const ORIGINAL_QUOTE_ID = "original-quote-id";

const mockOriginalQuote = {
  id: ORIGINAL_QUOTE_ID,
  customer_id: "customer-1",
  title: "Cozinha Completa",
  notes: "Entregar em março",
  quote_versions: [
    {
      id: "version-1",
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
              name: "Armário superior",
              type: "material",
              unit: "un",
              unit_price: 500,
              quantity: 3,
              position: 0,
              catalog_item_id: null,
            },
            {
              id: "item-2",
              name: "Chapa MDF",
              type: "material",
              unit: "m²",
              unit_price: 85,
              quantity: 10,
              position: 1,
              catalog_item_id: null,
            },
          ],
        },
        {
          id: "room-2",
          name: "Sala",
          position: 1,
          template_id: null,
          quote_items: [
            {
              id: "item-3",
              name: "Painel TV",
              type: "labor",
              unit: "un",
              unit_price: 1200,
              quantity: 1,
              position: 0,
              catalog_item_id: null,
            },
          ],
        },
      ],
    },
  ],
};

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function buildSupabaseChain({
  fetchQuoteData = mockOriginalQuote,
  fetchQuoteError = null,
  newQuoteData = { id: "new-quote-id" },
  newQuoteError = null,
  newVersionData = { id: "new-version-id" },
  newVersionError = null,
  newRoomData = { id: "new-room-id" },
  newRoomError = null,
  itemsError = null,
  quoteNumberData = 10,
  quoteNumberError = null,
}: {
  fetchQuoteData?: Record<string, unknown> | null;
  fetchQuoteError?: Record<string, unknown> | null;
  newQuoteData?: Record<string, unknown> | null;
  newQuoteError?: Record<string, unknown> | null;
  newVersionData?: Record<string, unknown> | null;
  newVersionError?: Record<string, unknown> | null;
  newRoomData?: Record<string, unknown> | null;
  newRoomError?: Record<string, unknown> | null;
  itemsError?: Record<string, unknown> | null;
  quoteNumberData?: number;
  quoteNumberError?: Record<string, unknown> | null;
} = {}) {
  mockRpc.mockResolvedValue({ data: quoteNumberData, error: quoteNumberError });

  let roomCallCount = 0;

  mockFrom.mockImplementation((table: string) => {
    if (table === "quotes") {
      // First call = fetch original; second call = insert new quote
      let quoteCallIdx = 0;
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: fetchQuoteData, error: fetchQuoteError }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newQuoteData, error: newQuoteError }),
          }),
        }),
      };
    }

    if (table === "quote_versions") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newVersionData, error: newVersionError }),
          }),
        }),
      };
    }

    if (table === "quote_rooms") {
      roomCallCount++;
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newRoomData, error: newRoomError }),
          }),
        }),
      };
    }

    if (table === "quote_items") {
      return {
        insert: vi.fn().mockResolvedValue({ error: itemsError }),
      };
    }

    return {};
  });

  mockCreateClientFn.mockResolvedValue({
    auth: mockAuth,
    from: mockFrom,
    rpc: mockRpc,
  });

  return { getRoomCallCount: () => roomCallCount };
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("POST /api/quotes/[id]/duplicate", () => {
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

    const { POST } = await import("@/app/api/quotes/[id]/duplicate/route");
    const req = makeRequest(`http://localhost/api/quotes/${ORIGINAL_QUOTE_ID}/duplicate`);
    const res = await POST(req, makeParams(ORIGINAL_QUOTE_ID));
    expect(res.status).toBe(401);
  });

  it("retorna 403 para subscription read_only", async () => {
    mockGetSubscriptionStatus.mockResolvedValue({ status: "read_only", canWrite: false });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom, rpc: mockRpc });

    const { POST } = await import("@/app/api/quotes/[id]/duplicate/route");
    const req = makeRequest(`http://localhost/api/quotes/${ORIGINAL_QUOTE_ID}/duplicate`);
    const res = await POST(req, makeParams(ORIGINAL_QUOTE_ID));
    expect(res.status).toBe(403);
  });

  it("retorna 403 para subscription cancelled", async () => {
    mockGetSubscriptionStatus.mockResolvedValue({ status: "cancelled", canWrite: false });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom, rpc: mockRpc });

    const { POST } = await import("@/app/api/quotes/[id]/duplicate/route");
    const req = makeRequest(`http://localhost/api/quotes/${ORIGINAL_QUOTE_ID}/duplicate`);
    const res = await POST(req, makeParams(ORIGINAL_QUOTE_ID));
    expect(res.status).toBe(403);
  });

  it("retorna 404 se orçamento não encontrado", async () => {
    buildSupabaseChain({ fetchQuoteData: null, fetchQuoteError: { message: "not found" } });

    const { POST } = await import("@/app/api/quotes/[id]/duplicate/route");
    const req = makeRequest(`http://localhost/api/quotes/invalid-id/duplicate`);
    const res = await POST(req, makeParams("invalid-id"));
    expect(res.status).toBe(404);
  });

  it("cria novo orçamento com status 'draft' e quote_number diferente", async () => {
    buildSupabaseChain({ quoteNumberData: 10, newQuoteData: { id: "new-quote-id" } });

    const { POST } = await import("@/app/api/quotes/[id]/duplicate/route");
    const req = makeRequest(`http://localhost/api/quotes/${ORIGINAL_QUOTE_ID}/duplicate`);
    const res = await POST(req, makeParams(ORIGINAL_QUOTE_ID));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.new_quote_id).toBe("new-quote-id");

    // Verify rpc was called for new quote number
    expect(mockRpc).toHaveBeenCalledWith("next_quote_number", { p_user_id: "user-1" });
  });

  it("duplicado tem os mesmos ambientes e itens do original (recursividade)", async () => {
    const insertedItems: unknown[] = [];
    let roomInsertCount = 0;
    let versionInsertCount = 0;

    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockOriginalQuote, error: null }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "new-q" }, error: null }),
            }),
          }),
        };
      }

      if (table === "quote_versions") {
        versionInsertCount++;
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: `new-v-${versionInsertCount}` }, error: null }),
            }),
          }),
        };
      }

      if (table === "quote_rooms") {
        roomInsertCount++;
        const roomId = `new-room-${roomInsertCount}`;
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: roomId }, error: null }),
            }),
          }),
        };
      }

      if (table === "quote_items") {
        return {
          insert: vi.fn().mockImplementation((items) => {
            insertedItems.push(...items);
            return Promise.resolve({ error: null });
          }),
        };
      }

      return {};
    });

    mockRpc.mockResolvedValue({ data: 10, error: null });
    mockCreateClientFn.mockResolvedValue({
      auth: mockAuth,
      from: mockFrom,
      rpc: mockRpc,
    });

    const { POST } = await import("@/app/api/quotes/[id]/duplicate/route");
    const req = makeRequest(`http://localhost/api/quotes/${ORIGINAL_QUOTE_ID}/duplicate`);
    const res = await POST(req, makeParams(ORIGINAL_QUOTE_ID));

    expect(res.status).toBe(201);
    // Original has 2 rooms
    expect(roomInsertCount).toBe(2);
    // Total items: 2 in room 1 + 1 in room 2 = 3
    expect(insertedItems).toHaveLength(3);
  });

  it("retorna 500 se rpc next_quote_number falhar", async () => {
    buildSupabaseChain({ quoteNumberError: { message: "rpc error" } });

    const { POST } = await import("@/app/api/quotes/[id]/duplicate/route");
    const req = makeRequest(`http://localhost/api/quotes/${ORIGINAL_QUOTE_ID}/duplicate`);
    const res = await POST(req, makeParams(ORIGINAL_QUOTE_ID));
    expect(res.status).toBe(500);
  });
});
