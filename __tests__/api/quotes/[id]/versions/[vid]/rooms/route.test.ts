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

function makeParams(id: string, vid: string) {
  return { params: Promise.resolve({ id, vid }) };
}

const QUOTE_ID = "quote-uuid";
const VERSION_ID = "version-uuid";
const ROOM_ID = "room-uuid";

// Setup base: usuário autenticado + quote encontrado
function setupBase() {
  mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
}

// Mock para quote encontrado
function mockQuoteFound() {
  const quoteSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: QUOTE_ID, user_id: "user-1" }, error: null }),
      }),
    }),
  });
  return quoteSelect;
}

// Mock para quote não encontrado
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
// POST /api/quotes/[id]/versions/[vid]/rooms
// ----------------------------------------------------------------

describe("POST /api/quotes/[id]/versions/[vid]/rooms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    setupBase();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: mockFrom,
    });

    const { POST } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/route"
    );
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/versions/${VERSION_ID}/rooms`, {
      method: "POST",
      body: JSON.stringify({ name: "Cozinha" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, makeParams(QUOTE_ID, VERSION_ID));
    expect(res.status).toBe(401);
  });

  it("retorna 404 quando orçamento não existe", async () => {
    const quoteNotFoundSelect = mockQuoteNotFound();
    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") return { select: quoteNotFoundSelect };
      return { select: vi.fn(), insert: vi.fn() };
    });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { POST } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/route"
    );
    const req = makeRequest(`http://localhost/api/quotes/fake/versions/${VERSION_ID}/rooms`, {
      method: "POST",
      body: JSON.stringify({ name: "Sala" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, makeParams("fake", VERSION_ID));
    expect(res.status).toBe(404);
  });

  it("retorna 400 quando name está ausente", async () => {
    const quoteFoundSelect = mockQuoteFound();

    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") return { select: quoteFoundSelect };
      return { select: vi.fn(), insert: vi.fn() };
    });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { POST } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/route"
    );
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/versions/${VERSION_ID}/rooms`, {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, makeParams(QUOTE_ID, VERSION_ID));
    expect(res.status).toBe(400);
  });

  it("cria ambiente sem template e retorna 201 com room_id", async () => {
    const quoteFoundSelect = mockQuoteFound();

    // mock para listagem de rooms existentes (position calc): .select("id").eq()
    const mockRoomsEqResult = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockRoomsEq = vi.fn().mockReturnValue(mockRoomsEqResult);
    const mockRoomsListSelect = vi.fn().mockReturnValue({ eq: mockRoomsEq });

    // mock para inserção de room
    const mockRoomSingle = vi.fn().mockResolvedValue({ data: { id: ROOM_ID }, error: null });
    const mockRoomSelect = vi.fn().mockReturnValue({ single: mockRoomSingle });
    const mockRoomInsert = vi.fn().mockReturnValue({ select: mockRoomSelect });

    let roomSelectCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") return { select: quoteFoundSelect };
      if (table === "quote_rooms") {
        roomSelectCallCount++;
        // First call is .select("id").eq() for position, insert is separate
        return {
          select: mockRoomsListSelect,
          insert: mockRoomInsert,
        };
      }
      return { select: vi.fn(), insert: vi.fn() };
    });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { POST } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/route"
    );
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/versions/${VERSION_ID}/rooms`, {
      method: "POST",
      body: JSON.stringify({ name: "Sala de Estar" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, makeParams(QUOTE_ID, VERSION_ID));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.room_id).toBe(ROOM_ID);
    expect(body.items).toHaveLength(0);
  });

  it("com template_id válido retorna 201 com id do novo ambiente", async () => {
    const quoteFoundSelect = mockQuoteFound();

    const mockRoomsEqResult = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockRoomsEq = vi.fn().mockReturnValue(mockRoomsEqResult);
    const mockRoomsListSelect = vi.fn().mockReturnValue({ eq: mockRoomsEq });

    const mockRoomSingle = vi.fn().mockResolvedValue({ data: { id: ROOM_ID }, error: null });
    const mockRoomSelect = vi.fn().mockReturnValue({ single: mockRoomSingle });
    const mockRoomInsert = vi.fn().mockReturnValue({ select: mockRoomSelect });

    const templateItems = [
      { id: "ti-1", name: "Porta", type: "material", unit: "un", position: 0 },
      { id: "ti-2", name: "Dobradiça", type: "material", unit: "un", position: 1 },
    ];
    const mockTemplateOrder = vi.fn().mockResolvedValue({ data: templateItems, error: null });
    const mockTemplateEq = vi.fn().mockReturnValue({ order: mockTemplateOrder });
    const mockTemplateSelect = vi.fn().mockReturnValue({ eq: mockTemplateEq });

    const mockItemSingle = vi.fn().mockResolvedValue({
      data: { id: "item-uuid", name: "Porta", type: "material", unit: "un", unit_price: 0, quantity: 1 },
      error: null,
    });
    const mockItemSelect = vi.fn().mockReturnValue({ single: mockItemSingle });
    const mockItemInsert = vi.fn().mockReturnValue({ select: mockItemSelect });

    mockFrom.mockImplementation((table: string) => {
      if (table === "quotes") return { select: quoteFoundSelect };
      if (table === "quote_rooms") {
        return { select: mockRoomsListSelect, insert: mockRoomInsert };
      }
      if (table === "system_template_items") {
        return { select: mockTemplateSelect };
      }
      if (table === "quote_items") {
        return { insert: mockItemInsert };
      }
      return { select: vi.fn(), insert: vi.fn() };
    });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { POST } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/route"
    );
    const req = makeRequest(`http://localhost/api/quotes/${QUOTE_ID}/versions/${VERSION_ID}/rooms`, {
      method: "POST",
      body: JSON.stringify({ name: "Cozinha", template_id: "template-cozinha-uuid" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, makeParams(QUOTE_ID, VERSION_ID));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.room_id).toBe(ROOM_ID);
    // items pré-populados com unit_price = 0
    expect(body.items.length).toBeGreaterThan(0);
    body.items.forEach((item: { unit_price: number }) => {
      expect(item.unit_price).toBe(0);
    });
  });
});
