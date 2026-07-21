import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declarados antes de qualquer import do módulo testado
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
// Helpers para criar chains do supabase
// ---------------------------------------------------------------------------

function buildSelectChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) });
  const order = vi.fn().mockResolvedValue(result);
  const eqIsActive = vi.fn().mockReturnValue({ order });
  const eqUserId = vi.fn().mockReturnValue({ eq: eqIsActive, order });
  const select = vi.fn().mockReturnValue({ eq: eqUserId });

  return { select, insert, single, order };
}

// ---------------------------------------------------------------------------
// Tests — GET /api/catalog
// ---------------------------------------------------------------------------

describe("GET /api/catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/catalog/route");
    const req = new NextRequest("http://localhost/api/catalog");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("retorna lista de itens ativos por padrão (sem include_inactive)", async () => {
    const items = [
      { id: "1", name: "MDF 15mm", type: "material", unit: "m²", unit_price: 50, is_active: true },
    ];
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    // chain: from -> select -> eq(user_id) -> eq(is_active) -> order
    const orderFn = vi.fn().mockResolvedValue({ data: items, error: null });
    const eqIsActive = vi.fn().mockReturnValue({ order: orderFn });
    const eqUserId = vi.fn().mockReturnValue({ eq: eqIsActive, order: orderFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqUserId });
    mockSupabaseFrom.mockReturnValue({ select: selectFn });

    const { GET } = await import("@/app/api/catalog/route");
    const req = new NextRequest("http://localhost/api/catalog");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(items);
    expect(eqIsActive).toHaveBeenCalledWith("is_active", true);
  });

  it("retorna todos os itens com ?include_inactive=true", async () => {
    const items = [
      { id: "1", name: "MDF 15mm", type: "material", unit: "m²", unit_price: 50, is_active: true },
      { id: "2", name: "Parafuso", type: "material", unit: "cx", unit_price: 20, is_active: false },
    ];
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const orderFn = vi.fn().mockResolvedValue({ data: items, error: null });
    const eqUserId = vi.fn().mockReturnValue({ order: orderFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqUserId });
    mockSupabaseFrom.mockReturnValue({ select: selectFn });

    const { GET } = await import("@/app/api/catalog/route");
    const req = new NextRequest("http://localhost/api/catalog?include_inactive=true");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(items);
    // NÃO deve ter chamado eq para is_active
    expect(eqUserId).not.toHaveBeenCalledWith("is_active", true);
  });

  it("retorna 500 quando supabase retorna erro", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const orderFn = vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } });
    const eqIsActive = vi.fn().mockReturnValue({ order: orderFn });
    const eqUserId = vi.fn().mockReturnValue({ eq: eqIsActive, order: orderFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqUserId });
    mockSupabaseFrom.mockReturnValue({ select: selectFn });

    const { GET } = await import("@/app/api/catalog/route");
    const req = new NextRequest("http://localhost/api/catalog");
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Tests — POST /api/catalog
// ---------------------------------------------------------------------------

describe("POST /api/catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("@/app/api/catalog/route");
    const req = new NextRequest("http://localhost/api/catalog", {
      method: "POST",
      body: JSON.stringify({ name: "Test", type: "material", unit: "un", unit_price: 10 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("retorna 403 quando subscription é read_only", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: false, status: "read_only" });

    const { POST } = await import("@/app/api/catalog/route");
    const req = new NextRequest("http://localhost/api/catalog", {
      method: "POST",
      body: JSON.stringify({ name: "Test", type: "material", unit: "un", unit_price: 10 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("retorna 400 quando unit_price é negativo", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "trial" });

    const { POST } = await import("@/app/api/catalog/route");
    const req = new NextRequest("http://localhost/api/catalog", {
      method: "POST",
      body: JSON.stringify({ name: "Test", type: "material", unit: "un", unit_price: -1 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unit_price/);
  });

  it("retorna 400 quando type é inválido ('produto')", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "trial" });

    const { POST } = await import("@/app/api/catalog/route");
    const req = new NextRequest("http://localhost/api/catalog", {
      method: "POST",
      body: JSON.stringify({ name: "Test", type: "produto", unit: "un", unit_price: 10 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/type/);
  });

  it("retorna 400 quando name está ausente", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "trial" });

    const { POST } = await import("@/app/api/catalog/route");
    const req = new NextRequest("http://localhost/api/catalog", {
      method: "POST",
      body: JSON.stringify({ type: "material", unit: "un", unit_price: 10 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/name/);
  });

  it("cria item com sucesso e retorna 201", async () => {
    const newItem = {
      id: "abc-123",
      name: "MDF 15mm",
      type: "material",
      unit: "m²",
      unit_price: 55,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "trial" });

    const singleFn = vi.fn().mockResolvedValue({ data: newItem, error: null });
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectAfterInsert });
    mockSupabaseFrom.mockReturnValue({ insert: insertFn });

    const { POST } = await import("@/app/api/catalog/route");
    const req = new NextRequest("http://localhost/api/catalog", {
      method: "POST",
      body: JSON.stringify({ name: "MDF 15mm", type: "material", unit: "m²", unit_price: 55 }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(newItem);
  });

  it("usa 'un' como unidade padrão quando unit não é fornecido", async () => {
    const newItem = {
      id: "abc-123",
      name: "Serviço X",
      type: "service",
      unit: "un",
      unit_price: 100,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "active" });

    const singleFn = vi.fn().mockResolvedValue({ data: newItem, error: null });
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectAfterInsert });
    mockSupabaseFrom.mockReturnValue({ insert: insertFn });

    const { POST } = await import("@/app/api/catalog/route");
    const req = new NextRequest("http://localhost/api/catalog", {
      method: "POST",
      body: JSON.stringify({ name: "Serviço X", type: "service", unit_price: 100 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    // Verifica que insert foi chamado com unit: "un"
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ unit: "un" })
    );
  });
});
