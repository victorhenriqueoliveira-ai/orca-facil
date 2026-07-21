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

function buildPatchChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const eqUserId = vi.fn().mockReturnValue({ select });
  const eqId = vi.fn().mockReturnValue({ eq: eqUserId });
  const update = vi.fn().mockReturnValue({ eq: eqId });
  return { update, eqId, eqUserId, select, single };
}

// ---------------------------------------------------------------------------
// Tests — PATCH /api/catalog/[id]
// ---------------------------------------------------------------------------

describe("PATCH /api/catalog/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { PATCH } = await import("@/app/api/catalog/[id]/route");
    const req = new NextRequest("http://localhost/api/catalog/item-1", {
      method: "PATCH",
      body: JSON.stringify({ is_active: false }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(res.status).toBe(401);
  });

  it("retorna 403 quando subscription é read_only", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: false, status: "read_only" });

    const { PATCH } = await import("@/app/api/catalog/[id]/route");
    const req = new NextRequest("http://localhost/api/catalog/item-1", {
      method: "PATCH",
      body: JSON.stringify({ is_active: false }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(res.status).toBe(403);
  });

  it("retorna 403 quando subscription é cancelled", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: false, status: "cancelled" });

    const { PATCH } = await import("@/app/api/catalog/[id]/route");
    const req = new NextRequest("http://localhost/api/catalog/item-1", {
      method: "PATCH",
      body: JSON.stringify({ is_active: false }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(res.status).toBe(403);
  });

  it("inativa item com is_active: false e retorna 200", async () => {
    const updatedItem = {
      id: "item-1",
      name: "MDF 15mm",
      type: "material",
      unit: "m²",
      unit_price: 50,
      is_active: false,
      created_at: new Date().toISOString(),
    };
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "active" });

    const { update } = buildPatchChain({ data: updatedItem, error: null });
    mockSupabaseFrom.mockReturnValue({ update });

    const { PATCH } = await import("@/app/api/catalog/[id]/route");
    const req = new NextRequest("http://localhost/api/catalog/item-1", {
      method: "PATCH",
      body: JSON.stringify({ is_active: false }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "item-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.is_active).toBe(false);
  });

  it("retorna 400 quando type é inválido", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "active" });

    const { PATCH } = await import("@/app/api/catalog/[id]/route");
    const req = new NextRequest("http://localhost/api/catalog/item-1", {
      method: "PATCH",
      body: JSON.stringify({ type: "produto" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/type/);
  });

  it("retorna 400 quando unit_price é negativo", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "active" });

    const { PATCH } = await import("@/app/api/catalog/[id]/route");
    const req = new NextRequest("http://localhost/api/catalog/item-1", {
      method: "PATCH",
      body: JSON.stringify({ unit_price: -5 }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unit_price/);
  });

  it("retorna 400 quando name é string vazia", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "active" });

    const { PATCH } = await import("@/app/api/catalog/[id]/route");
    const req = new NextRequest("http://localhost/api/catalog/item-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "  " }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/name/);
  });

  it("retorna 400 quando nenhum campo válido é enviado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "active" });

    const { PATCH } = await import("@/app/api/catalog/[id]/route");
    const req = new NextRequest("http://localhost/api/catalog/item-1", {
      method: "PATCH",
      body: JSON.stringify({ unknown_field: "value" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(res.status).toBe(400);
  });

  it("retorna 404 quando item não existe (PGRST116)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "active" });

    const { update } = buildPatchChain({ data: null, error: { code: "PGRST116", message: "Row not found" } });
    mockSupabaseFrom.mockReturnValue({ update });

    const { PATCH } = await import("@/app/api/catalog/[id]/route");
    const req = new NextRequest("http://localhost/api/catalog/nonexistent", {
      method: "PATCH",
      body: JSON.stringify({ is_active: false }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect(res.status).toBe(404);
  });

  it("reativa item com is_active: true", async () => {
    const updatedItem = {
      id: "item-1",
      name: "MDF 15mm",
      type: "material",
      unit: "m²",
      unit_price: 50,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "active" });

    const { update } = buildPatchChain({ data: updatedItem, error: null });
    mockSupabaseFrom.mockReturnValue({ update });

    const { PATCH } = await import("@/app/api/catalog/[id]/route");
    const req = new NextRequest("http://localhost/api/catalog/item-1", {
      method: "PATCH",
      body: JSON.stringify({ is_active: true }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "item-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.is_active).toBe(true);
  });

  it("atualiza name e unit_price parcialmente", async () => {
    const updatedItem = {
      id: "item-1",
      name: "MDF 18mm",
      type: "material",
      unit: "m²",
      unit_price: 75,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "active" });

    const { update } = buildPatchChain({ data: updatedItem, error: null });
    mockSupabaseFrom.mockReturnValue({ update });

    const { PATCH } = await import("@/app/api/catalog/[id]/route");
    const req = new NextRequest("http://localhost/api/catalog/item-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "MDF 18mm", unit_price: 75 }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "item-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.name).toBe("MDF 18mm");
    expect(body.unit_price).toBe(75);
  });
});
