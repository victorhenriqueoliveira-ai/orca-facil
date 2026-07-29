import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockGetSubscriptionStatus = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockSupabaseFrom,
  })),
}));

vi.mock("@/lib/subscription/get-status", () => ({
  getSubscriptionStatus: mockGetSubscriptionStatus,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPatchChain(
  result: { data: unknown; error: unknown },
  captureFn?: (sanitized: Record<string, unknown>) => void
) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const eqUserId = vi.fn().mockReturnValue({ select });
  const eqId = vi.fn().mockReturnValue({ eq: eqUserId });
  const update = vi.fn().mockImplementation((sanitized) => {
    if (captureFn) captureFn(sanitized);
    return { eq: eqId };
  });
  return { update, eqId, eqUserId, select, single };
}

// ---------------------------------------------------------------------------
// Tests — PATCH /api/catalog/[id] com price_updated_at
// ---------------------------------------------------------------------------

describe("PATCH /api/catalog/[id] — price_updated_at", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("atualiza price_updated_at quando unit_price é enviado", async () => {
    const antes = new Date();
    let capturedPayload: Record<string, unknown> = {};

    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "active" });

    const updatedItem = {
      id: "item-1",
      name: "MDF 15mm",
      type: "material",
      unit: "m²",
      unit_price: 75,
      is_active: true,
      price_updated_at: new Date().toISOString(),
    };

    const { update } = buildPatchChain({ data: updatedItem, error: null }, (payload) => {
      capturedPayload = payload;
    });
    mockSupabaseFrom.mockReturnValue({ update });

    const { PATCH } = await import("@/app/api/catalog/[id]/route");
    const req = new NextRequest("http://localhost/api/catalog/item-1", {
      method: "PATCH",
      body: JSON.stringify({ unit_price: 75 }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(res.status).toBe(200);
    expect(capturedPayload).toHaveProperty("price_updated_at");
    expect(typeof capturedPayload.price_updated_at).toBe("string");

    // Verificar que price_updated_at é um timestamp recente (< 5s desde o início do teste)
    const depois = new Date();
    const priceUpdatedAt = new Date(capturedPayload.price_updated_at as string);
    expect(priceUpdatedAt.getTime()).toBeGreaterThanOrEqual(antes.getTime() - 1000);
    expect(priceUpdatedAt.getTime()).toBeLessThanOrEqual(depois.getTime() + 1000);
  });

  it("NÃO atualiza price_updated_at quando unit_price NÃO é enviado", async () => {
    let capturedPayload: Record<string, unknown> = {};

    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "active" });

    const updatedItem = {
      id: "item-1",
      name: "MDF 18mm",
      type: "material",
      unit: "m²",
      unit_price: 50,
      is_active: true,
    };

    const { update } = buildPatchChain({ data: updatedItem, error: null }, (payload) => {
      capturedPayload = payload;
    });
    mockSupabaseFrom.mockReturnValue({ update });

    const { PATCH } = await import("@/app/api/catalog/[id]/route");
    const req = new NextRequest("http://localhost/api/catalog/item-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "MDF 18mm" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(res.status).toBe(200);
    expect(capturedPayload).not.toHaveProperty("price_updated_at");
  });

  it("atualiza price_updated_at ao enviar unit_price com valor 0", async () => {
    let capturedPayload: Record<string, unknown> = {};

    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "active" });

    const updatedItem = {
      id: "item-1",
      name: "Serviço X",
      type: "service",
      unit: "un",
      unit_price: 0,
      is_active: true,
      price_updated_at: new Date().toISOString(),
    };

    const { update } = buildPatchChain({ data: updatedItem, error: null }, (payload) => {
      capturedPayload = payload;
    });
    mockSupabaseFrom.mockReturnValue({ update });

    const { PATCH } = await import("@/app/api/catalog/[id]/route");
    const req = new NextRequest("http://localhost/api/catalog/item-1", {
      method: "PATCH",
      body: JSON.stringify({ unit_price: 0 }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(res.status).toBe(200);
    expect(capturedPayload).toHaveProperty("price_updated_at");
  });

  it("GET /api/catalog retorna price_updated_at em cada item", async () => {
    const items = [
      {
        id: "1",
        name: "MDF 15mm",
        type: "material",
        unit: "m²",
        unit_price: 50,
        is_active: true,
        price_updated_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "2",
        name: "Parafuso",
        type: "material",
        unit: "cx",
        unit_price: 20,
        is_active: true,
        price_updated_at: null,
      },
    ];

    const mockGetUserForGet = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } });
    const orderFn = vi.fn().mockResolvedValue({ data: items, error: null });
    const eqIsActive = vi.fn().mockReturnValue({ order: orderFn });
    const eqUserId = vi.fn().mockReturnValue({ eq: eqIsActive, order: orderFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqUserId });

    // Precisamos de uma nova instância do mock para GET
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: mockGetUserForGet },
      from: vi.fn().mockReturnValue({ select: selectFn }),
    } as never);

    const { GET } = await import("@/app/api/catalog/route");
    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost/api/catalog");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // Os itens têm price_updated_at no response (passado de volta pelo select(*))
    expect(body[0]).toHaveProperty("price_updated_at");
    expect(body[1]).toHaveProperty("price_updated_at");
  });
});
