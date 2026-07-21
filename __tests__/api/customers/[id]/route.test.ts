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

// ----------------------------------------------------------------
// PATCH /api/customers/[id]
// ----------------------------------------------------------------

describe("PATCH /api/customers/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: mockFrom,
    });

    const { PATCH } = await import("@/app/api/customers/[id]/route");
    const req = makeRequest("http://localhost/api/customers/uuid-1", {
      method: "PATCH",
      body: JSON.stringify({ phone: "11999999999" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "uuid-1" }) });

    expect(res.status).toBe(401);
  });

  it("retorna 403 para subscription read_only", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "read_only", canWrite: false });

    const { PATCH } = await import("@/app/api/customers/[id]/route");
    const req = makeRequest("http://localhost/api/customers/uuid-1", {
      method: "PATCH",
      body: JSON.stringify({ phone: "11999999999" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "uuid-1" }) });

    expect(res.status).toBe(403);
  });

  it("retorna 403 para subscription cancelled", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "cancelled", canWrite: false });

    const { PATCH } = await import("@/app/api/customers/[id]/route");
    const req = makeRequest("http://localhost/api/customers/uuid-1", {
      method: "PATCH",
      body: JSON.stringify({ phone: "11999999999" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "uuid-1" }) });

    expect(res.status).toBe(403);
  });

  it("retorna 400 quando nenhum campo é enviado", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "active", canWrite: true });

    const { PATCH } = await import("@/app/api/customers/[id]/route");
    const req = makeRequest("http://localhost/api/customers/uuid-1", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "uuid-1" }) });

    expect(res.status).toBe(400);
  });

  it("atualiza apenas o campo phone mantendo demais campos", async () => {
    const clienteAtualizado = {
      id: "uuid-1",
      name: "João Silva",
      phone: "11999999999",
      email: "joao@email.com",
      address: "Rua A, 1",
      notes: null,
      created_at: "2024-01-01",
      user_id: "user-1",
    };

    const mockSingle = vi.fn().mockResolvedValue({ data: clienteAtualizado, error: null });
    const mockSelectInner = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqInner2 = vi.fn().mockReturnValue({ select: mockSelectInner });
    const mockEqInner1 = vi.fn().mockReturnValue({ eq: mockEqInner2 });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqInner1 });
    mockFrom.mockReturnValue({ update: mockUpdate });

    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "active", canWrite: true });

    const { PATCH } = await import("@/app/api/customers/[id]/route");
    const req = makeRequest("http://localhost/api/customers/uuid-1", {
      method: "PATCH",
      body: JSON.stringify({ phone: "11999999999" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "uuid-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.phone).toBe("11999999999");
    expect(body.name).toBe("João Silva");
    // Verifica que apenas o campo phone foi enviado ao update
    expect(mockUpdate).toHaveBeenCalledWith({ phone: "11999999999" });
  });

  it("retorna 404 quando cliente não existe ou pertence a outro usuário", async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "Row not found" },
    });
    const mockSelectInner = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqInner2 = vi.fn().mockReturnValue({ select: mockSelectInner });
    const mockEqInner1 = vi.fn().mockReturnValue({ eq: mockEqInner2 });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqInner1 });
    mockFrom.mockReturnValue({ update: mockUpdate });

    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "active", canWrite: true });

    const { PATCH } = await import("@/app/api/customers/[id]/route");
    const req = makeRequest("http://localhost/api/customers/uuid-outro", {
      method: "PATCH",
      body: JSON.stringify({ phone: "11999999999" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "uuid-outro" }) });

    expect(res.status).toBe(404);
  });
});
