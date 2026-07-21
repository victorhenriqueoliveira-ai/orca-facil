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

function makeParams(id: string, vid: string, rid: string, iid: string) {
  return { params: Promise.resolve({ id, vid, rid, iid }) };
}

const QUOTE_ID = "quote-uuid";
const VERSION_ID = "version-uuid";
const ROOM_ID = "room-uuid";
const ITEM_ID = "item-uuid";

function setupBase() {
  mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mockGetSubscriptionStatus.mockResolvedValue({ status: "active", canWrite: true });
}

// ----------------------------------------------------------------
// PATCH /api/quotes/[id]/versions/[vid]/rooms/[rid]/items/[iid]
// ----------------------------------------------------------------

describe("PATCH .../items/[iid]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupBase();
  });

  it("retorna 401 se não autenticado", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { PATCH } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/[iid]/route"
    );
    const req = makeRequest("http://localhost/api/quotes/q/versions/v/rooms/r/items/i", {
      method: "PATCH",
      body: JSON.stringify({ unit_price: 200 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, makeParams(QUOTE_ID, VERSION_ID, ROOM_ID, ITEM_ID));
    expect(res.status).toBe(401);
  });

  it("retorna 403 se subscription cancelled", async () => {
    mockGetSubscriptionStatus.mockResolvedValue({ status: "cancelled", canWrite: false });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { PATCH } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/[iid]/route"
    );
    const req = makeRequest("http://localhost/api/quotes/q/versions/v/rooms/r/items/i", {
      method: "PATCH",
      body: JSON.stringify({ unit_price: 200 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, makeParams(QUOTE_ID, VERSION_ID, ROOM_ID, ITEM_ID));
    expect(res.status).toBe(403);
  });

  it("retorna 404 se orçamento não pertence ao usuário", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: mockAuth,
      from: () => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
            }),
          }),
        }),
      }),
    });

    const { PATCH } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/[iid]/route"
    );
    const req = makeRequest("http://localhost/api/quotes/q/versions/v/rooms/r/items/i", {
      method: "PATCH",
      body: JSON.stringify({ unit_price: 200 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, makeParams(QUOTE_ID, VERSION_ID, ROOM_ID, ITEM_ID));
    expect(res.status).toBe(404);
  });

  it("retorna 400 se unit_price negativo", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: mockAuth,
      from: () => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: QUOTE_ID, user_id: "user-1" },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const { PATCH } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/[iid]/route"
    );
    const req = makeRequest("http://localhost/api/quotes/q/versions/v/rooms/r/items/i", {
      method: "PATCH",
      body: JSON.stringify({ unit_price: -10 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, makeParams(QUOTE_ID, VERSION_ID, ROOM_ID, ITEM_ID));
    expect(res.status).toBe(400);
  });

  it("retorna 400 se quantity <= 0", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: mockAuth,
      from: () => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: QUOTE_ID, user_id: "user-1" },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const { PATCH } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/[iid]/route"
    );
    const req = makeRequest("http://localhost/api/quotes/q/versions/v/rooms/r/items/i", {
      method: "PATCH",
      body: JSON.stringify({ quantity: 0 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, makeParams(QUOTE_ID, VERSION_ID, ROOM_ID, ITEM_ID));
    expect(res.status).toBe(400);
  });

  it("retorna 400 se body vazio (nenhum campo a atualizar)", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: mockAuth,
      from: () => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: QUOTE_ID, user_id: "user-1" },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const { PATCH } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/[iid]/route"
    );
    const req = makeRequest("http://localhost/api/quotes/q/versions/v/rooms/r/items/i", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, makeParams(QUOTE_ID, VERSION_ID, ROOM_ID, ITEM_ID));
    expect(res.status).toBe(400);
  });

  it("atualiza unit_price com sucesso e retorna item atualizado", async () => {
    const updatedItem = {
      id: ITEM_ID,
      name: "Chapa MDF",
      type: "material",
      unit: "m²",
      unit_price: 200,
      quantity: 4.5,
      position: 0,
    };

    mockCreateClientFn.mockResolvedValue({
      auth: mockAuth,
      from: (table: string) => {
        if (table === "quotes") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: QUOTE_ID, user_id: "user-1" },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "quote_items") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: updatedItem, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      },
    });

    const { PATCH } = await import(
      "@/app/api/quotes/[id]/versions/[vid]/rooms/[rid]/items/[iid]/route"
    );
    const req = makeRequest("http://localhost/api/quotes/q/versions/v/rooms/r/items/i", {
      method: "PATCH",
      body: JSON.stringify({ unit_price: 200 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, makeParams(QUOTE_ID, VERSION_ID, ROOM_ID, ITEM_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item).toBeDefined();
    expect(body.item.unit_price).toBe(200);
  });
});
