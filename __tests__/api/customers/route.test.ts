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

function buildSupabaseChain(result: { data: unknown; error: unknown }) {
  const mockSingle = vi.fn().mockResolvedValue(result);
  const mockSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue(result),
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(result),
        }),
        single: mockSingle,
        select: vi.fn().mockReturnValue({ single: mockSingle }),
      }),
      order: vi.fn().mockResolvedValue(result),
      or: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue(result),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: mockSingle }),
    }),
  });
  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ single: mockSingle }),
  });
  mockFrom.mockImplementation(() => ({
    select: mockSelect,
    insert: mockInsert,
  }));
  mockCreateClientFn.mockResolvedValue({
    auth: mockAuth,
    from: mockFrom,
  });
  return { mockSingle };
}

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost"), options);
}

// ----------------------------------------------------------------
// GET /api/customers
// ----------------------------------------------------------------

describe("GET /api/customers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: mockFrom,
    });

    const { GET } = await import("@/app/api/customers/route");
    const req = makeRequest("http://localhost/api/customers");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("retorna todos os clientes quando ?q= está vazio", async () => {
    const clientes = [
      { id: "1", name: "Alice", phone: "11999990001", email: null, address: null, notes: null, created_at: "2024-01-01" },
      { id: "2", name: "Bob", phone: null, email: null, address: null, notes: null, created_at: "2024-01-02" },
    ];

    // Cadeia real: .from().select().eq("user_id", id).order() — sem q
    const mockOrder = vi.fn().mockResolvedValue({ data: clientes, error: null });
    const mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder, or: mockOr });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { GET } = await import("@/app/api/customers/route");
    const req = makeRequest("http://localhost/api/customers");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
  });

  it("filtra clientes por ?q= (busca por nome/telefone)", async () => {
    const clientesFiltrados = [
      { id: "1", name: "João Silva", phone: "11999990001", email: null, address: null, notes: null, created_at: "2024-01-01" },
    ];

    // Cadeia real: let query = .from().select().eq().order(); query = query.or(...); await query;
    // .order() deve retornar objeto com .or()
    // .or() deve ser thenable (resolvido com data)
    const mockOr = vi.fn().mockResolvedValue({ data: clientesFiltrados, error: null });
    const mockOrder = vi.fn().mockReturnValue({ or: mockOr });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { GET } = await import("@/app/api/customers/route");
    const req = makeRequest("http://localhost/api/customers?q=joão");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("João Silva");
    // Verifica que a query de busca usou o parâmetro correto
    expect(mockOr).toHaveBeenCalledWith("name.ilike.%joão%,phone.ilike.%joão%");
  });

  it("busca é case-insensitive — ?q=JOÃO retorna clientes com 'joão'", async () => {
    const clientesFiltrados = [
      { id: "1", name: "João", phone: null, email: null, address: null, notes: null, created_at: "2024-01-01" },
    ];
    const mockOr = vi.fn().mockResolvedValue({ data: clientesFiltrados, error: null });
    const mockOrder = vi.fn().mockReturnValue({ or: mockOr });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { GET } = await import("@/app/api/customers/route");
    const req = makeRequest("http://localhost/api/customers?q=JOÃO");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // O ILIKE é implementado no Supabase/Postgres — o mock devolve o resultado esperado
    expect(body).toHaveLength(1);
    // Confirma que `or` foi chamado com ilike (case-insensitive)
    expect(mockOr).toHaveBeenCalledWith(expect.stringContaining("ilike"));
  });
});

// ----------------------------------------------------------------
// POST /api/customers
// ----------------------------------------------------------------

describe("POST /api/customers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("retorna 400 quando name está ausente", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "active", canWrite: true });

    const { POST } = await import("@/app/api/customers/route");
    const req = makeRequest("http://localhost/api/customers", {
      method: "POST",
      body: JSON.stringify({ phone: "11999990001" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("name");
  });

  it("retorna 400 quando name é string vazia", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "active", canWrite: true });

    const { POST } = await import("@/app/api/customers/route");
    const req = makeRequest("http://localhost/api/customers", {
      method: "POST",
      body: JSON.stringify({ name: "   " }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("retorna 403 para usuário com subscription read_only", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "read_only", canWrite: false });

    const { POST } = await import("@/app/api/customers/route");
    const req = makeRequest("http://localhost/api/customers", {
      method: "POST",
      body: JSON.stringify({ name: "Novo Cliente" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("retorna 403 para usuário com subscription cancelled", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "cancelled", canWrite: false });

    const { POST } = await import("@/app/api/customers/route");
    const req = makeRequest("http://localhost/api/customers", {
      method: "POST",
      body: JSON.stringify({ name: "Novo Cliente" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("cria cliente com sucesso e retorna 201", async () => {
    const novoCliente = {
      id: "uuid-novo",
      name: "Maria Santos",
      phone: "11988887777",
      email: "maria@email.com",
      address: null,
      notes: null,
      created_at: "2024-01-01",
      user_id: "user-1",
    };

    const mockSingle = vi.fn().mockResolvedValue({ data: novoCliente, error: null });
    const mockSelectInner = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectInner });
    mockFrom.mockReturnValue({ insert: mockInsert });
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });
    mockGetSubscriptionStatus.mockResolvedValue({ status: "active", canWrite: true });

    const { POST } = await import("@/app/api/customers/route");
    const req = makeRequest("http://localhost/api/customers", {
      method: "POST",
      body: JSON.stringify({ name: "Maria Santos", phone: "11988887777", email: "maria@email.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.name).toBe("Maria Santos");
  });
});
