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

function makeRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

const mockTemplates = [
  {
    id: "t1",
    name: "Cozinha",
    system_template_items: [
      { id: "i1", name: "Porta", type: "material", unit: "un", position: 0 },
      { id: "i2", name: "Dobradiça", type: "material", unit: "un", position: 1 },
    ],
  },
  {
    id: "t2",
    name: "Quarto",
    system_template_items: [
      { id: "i3", name: "Gaveta", type: "material", unit: "un", position: 0 },
    ],
  },
];

// ----------------------------------------------------------------
// GET /api/templates
// ----------------------------------------------------------------

describe("GET /api/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: mockFrom,
    });

    const { GET } = await import("@/app/api/templates/route");
    const req = makeRequest("http://localhost/api/templates");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("retorna lista de templates com itens quando autenticado", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: mockTemplates, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { GET } = await import("@/app/api/templates/route");
    const req = makeRequest("http://localhost/api/templates");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("Cozinha");
    expect(body[0].items).toHaveLength(2);
    expect(body[0].items[0].name).toBe("Porta");
  });

  it("cada item do template tem id, name, type, unit", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: mockTemplates, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { GET } = await import("@/app/api/templates/route");
    const req = makeRequest("http://localhost/api/templates");
    const res = await GET(req);
    const body = await res.json();

    const item = body[0].items[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("name");
    expect(item).toHaveProperty("type");
    expect(item).toHaveProperty("unit");
    // Templates NÃO têm preços
    expect(item).not.toHaveProperty("unit_price");
  });

  it("retorna array vazio quando não há templates", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { GET } = await import("@/app/api/templates/route");
    const req = makeRequest("http://localhost/api/templates");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(0);
  });

  it("retorna 500 quando há erro no banco", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockCreateClientFn.mockResolvedValue({ auth: mockAuth, from: mockFrom });

    const { GET } = await import("@/app/api/templates/route");
    const req = makeRequest("http://localhost/api/templates");
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
