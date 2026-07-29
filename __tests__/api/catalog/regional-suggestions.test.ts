import { describe, it, expect, vi, beforeEach } from "vitest";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

const mockFrom = vi.fn();
const mockAuth = { getUser: vi.fn() };
const mockCreateClientFn = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClientFn,
}));

function buildSupabase(user: unknown, profile: unknown) {
  const mockSingle = vi.fn().mockResolvedValue({ data: profile, error: null });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

  mockFrom.mockImplementation(() => ({ select: mockSelect }));
  mockCreateClientFn.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: mockFrom,
  });
}

// ----------------------------------------------------------------
// Testes de extractUF
// ----------------------------------------------------------------

describe("extractUF", () => {
  it("extrai UF do final de uma string com formato 'Cidade - UF'", async () => {
    const { extractUF } = await import(
      "@/app/api/catalog/regional-suggestions/route"
    );
    expect(extractUF("São Paulo - SP")).toBe("SP");
    expect(extractUF("Rio de Janeiro - RJ")).toBe("RJ");
  });

  it("aceita UF sozinha (2 letras maiúsculas)", async () => {
    const { extractUF } = await import(
      "@/app/api/catalog/regional-suggestions/route"
    );
    expect(extractUF("SP")).toBe("SP");
    expect(extractUF("sp")).toBe("SP");
  });

  it("retorna null para city nulo ou vazio", async () => {
    const { extractUF } = await import(
      "@/app/api/catalog/regional-suggestions/route"
    );
    expect(extractUF(null)).toBeNull();
    expect(extractUF("")).toBeNull();
    expect(extractUF(undefined)).toBeNull();
  });

  it("retorna null para city sem padrão reconhecível de UF", async () => {
    const { extractUF } = await import(
      "@/app/api/catalog/regional-suggestions/route"
    );
    expect(extractUF("cidade desconhecida")).toBeNull();
  });
});

// ----------------------------------------------------------------
// GET /api/catalog/regional-suggestions
// ----------------------------------------------------------------

describe("GET /api/catalog/regional-suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockCreateClientFn.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: mockFrom,
    });

    const { GET } = await import(
      "@/app/api/catalog/regional-suggestions/route"
    );
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("retorna sugestões de SP para usuário com city 'São Paulo - SP'", async () => {
    buildSupabase({ id: "user-1" }, { city: "São Paulo - SP" });

    const { GET } = await import(
      "@/app/api/catalog/regional-suggestions/route"
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.uf).toBe("SP");
    expect(Array.isArray(body.suggestions)).toBe(true);
    expect(body.suggestions.length).toBeGreaterThan(0);
    // Verifica que os itens são da estrutura correta
    const first = body.suggestions[0];
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("type");
    expect(first).toHaveProperty("unit");
    expect(first).toHaveProperty("unit_price");
  });

  it("retorna 200 com array vazio para UF não mapeada em REGIONAL_DEFAULTS", async () => {
    buildSupabase({ id: "user-1" }, { city: "Cidade Teste - ZZ" });

    const { GET } = await import(
      "@/app/api/catalog/regional-suggestions/route"
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.uf).toBe("ZZ");
    expect(body.suggestions).toEqual([]);
  });

  it("retorna 200 com array vazio quando perfil não tem city", async () => {
    buildSupabase({ id: "user-1" }, { city: null });

    const { GET } = await import(
      "@/app/api/catalog/regional-suggestions/route"
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.uf).toBeNull();
    expect(body.suggestions).toEqual([]);
  });
});
