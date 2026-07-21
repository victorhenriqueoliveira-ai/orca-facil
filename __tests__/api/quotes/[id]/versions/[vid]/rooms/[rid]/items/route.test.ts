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

function makeRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(new URL(url, "http://localhost"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeParams(id: string, vid: string, rid: string) {
  return { params: Promise.resolve({ id, vid, rid }) };
}

const QUOTE_ID = "quote-uuid";
const VERSION_ID = "version-uuid";
const ROOM_ID = "room-uuid";
const ITEM_ID = "item-uuid";
const ITEM_URL = `http://localhost/api/quotes/${QUOTE_ID}/versions/${VERSION_ID}/rooms/${ROOM_ID}/items`;

// Monta cadeia completa para caso de sucesso
function setupSuccess() {
  mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

  const mockQuoteSingle = vi.fn().mockResolvedValue({
    data: { id: QUOTE_ID, user_id: "user-1" },
    error: null,
  });
  const mockQuoteEq2 = vi.fn().mockReturnValue({ single: mockQuoteSingle });
  const mockQuoteEq1 = vi.fn().mockReturnValue({ eq: mockQuoteEq2 });
  const mockQuoteSelect = vi.fn().mockReturnValue({ eq: mockQuoteEq1 });

  // .select("id").eq("room_id", roomId) → { data: [], error: null }
  const mockItemsListEqResult = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockItemsListEq = vi.fn().mockReturnValue(mockItemsListEqResult);
  const mockItemsListSelect = vi.fn().mockReturnValue({ eq: mockItemsListEq });

  const mockItemSingle = vi.fn().mockResolvedValue({
    data: { id: ITEM_ID },
    error: null,
  });
  const mockItemSelect = vi.fn().mockReturnValue({ single: mockItemSingle });
  const mockItemInsert = vi.fn().mockReturnValue({ select: mockItemSelect });

  mockFrom.mockImplementation((table: string) => {
    if (table === "quotes") return { select: mockQuoteSelect };
    if (table === "quote_items") {
      return { select: mockItemsListSelect, insert: mockItemInsert };
    }
    return { select: vi.fn(), insert: vi.fn() };
  });
  mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });
}

// ----------------------------------------------------------------
// POST .../items
// ----------------------------------------------------------------

describe("POST /api/quotes/[id]/versions/[vid]/rooms/[rid]/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: mockFrom,
    });

    const { POST } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/route"
    );
    const req = makeRequest(ITEM_URL, {
      name: "Dobradiça",
      type: "material",
      unit: "un",
      unit_price: 15.0,
      quantity: 10,
    });
    const res = await POST(req, makeParams(QUOTE_ID, VERSION_ID, ROOM_ID));
    expect(res.status).toBe(401);
  });

  it("retorna 400 quando unit_price é negativo (-5)", async () => {
    setupSuccess();

    const { POST } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/route"
    );
    const req = makeRequest(ITEM_URL, {
      name: "Item",
      type: "material",
      unit: "un",
      unit_price: -5,
      quantity: 1,
    });
    const res = await POST(req, makeParams(QUOTE_ID, VERSION_ID, ROOM_ID));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("unit_price");
  });

  it("retorna 400 quando quantity é zero", async () => {
    setupSuccess();

    const { POST } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/route"
    );
    const req = makeRequest(ITEM_URL, {
      name: "Item",
      type: "material",
      unit: "un",
      unit_price: 10,
      quantity: 0,
    });
    const res = await POST(req, makeParams(QUOTE_ID, VERSION_ID, ROOM_ID));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("quantity");
  });

  it("retorna 400 quando name está ausente", async () => {
    setupSuccess();

    const { POST } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/route"
    );
    const req = makeRequest(ITEM_URL, {
      type: "material",
      unit: "un",
      unit_price: 10,
      quantity: 1,
    });
    const res = await POST(req, makeParams(QUOTE_ID, VERSION_ID, ROOM_ID));
    expect(res.status).toBe(400);
  });

  it("persiste snapshot (name, unit, unit_price, quantity) sem join no catálogo", async () => {
    setupSuccess();

    const { POST } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/route"
    );
    const req = makeRequest(ITEM_URL, {
      name: "Dobradiça 35mm",
      type: "material",
      unit: "un",
      unit_price: 12.5,
      quantity: 8,
    });
    const res = await POST(req, makeParams(QUOTE_ID, VERSION_ID, ROOM_ID));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.item_id).toBe(ITEM_ID);
  });

  it("aceita unit_price = 0 (template sem preço)", async () => {
    setupSuccess();

    const { POST } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/route"
    );
    const req = makeRequest(ITEM_URL, {
      name: "Porta de MDF",
      type: "material",
      unit: "un",
      unit_price: 0,
      quantity: 2,
    });
    const res = await POST(req, makeParams(QUOTE_ID, VERSION_ID, ROOM_ID));
    expect(res.status).toBe(201);
  });

  it("aceita catalog_item_id opcional sem falhar", async () => {
    // Setup com catálogo
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const mockQuoteSingle = vi.fn().mockResolvedValue({
      data: { id: QUOTE_ID, user_id: "user-1" },
      error: null,
    });
    const mockQuoteEq2 = vi.fn().mockReturnValue({ single: mockQuoteSingle });
    const mockQuoteEq1 = vi.fn().mockReturnValue({ eq: mockQuoteEq2 });
    const mockQuoteSelect = vi.fn().mockReturnValue({ eq: mockQuoteEq1 });

    const mockCatalogSingle = vi.fn().mockResolvedValue({
      data: { id: "catalog-item-id" },
      error: null,
    });
    const mockCatalogEq2 = vi.fn().mockReturnValue({ single: mockCatalogSingle });
    const mockCatalogEq1 = vi.fn().mockReturnValue({ eq: mockCatalogEq2 });
    const mockCatalogSelect = vi.fn().mockReturnValue({ eq: mockCatalogEq1 });

    // .select("id").eq("room_id", roomId) → { data: [existing items], error: null }
    const mockItemsListEqResult = vi.fn().mockResolvedValue({ data: [{ id: "e1" }, { id: "e2" }], error: null });
    const mockItemsListEq = vi.fn().mockReturnValue(mockItemsListEqResult);
    const mockItemsListSelect = vi.fn().mockReturnValue({ eq: mockItemsListEq });

    const mockItemSingle = vi.fn().mockResolvedValue({ data: { id: ITEM_ID }, error: null });
    const mockItemSelect = vi.fn().mockReturnValue({ single: mockItemSingle });
    const mockItemInsert = vi.fn().mockReturnValue({ select: mockItemSelect });

    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") return { select: mockQuoteSelect };
      if (table === "catalog_items") return { select: mockCatalogSelect };
      if (table === "quote_items") {
        return { select: mockItemsListSelect, insert: mockItemInsert };
      }
      return { select: vi.fn(), insert: vi.fn() };
    });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { POST } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/route"
    );
    const req = makeRequest(ITEM_URL, {
      catalog_item_id: "catalog-item-id",
      name: "Item do Catálogo",
      type: "service",
      unit: "m²",
      unit_price: 150.0,
      quantity: 5,
    });
    const res = await POST(req, makeParams(QUOTE_ID, VERSION_ID, ROOM_ID));
    expect(res.status).toBe(201);
  });
});
