import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---- Mocks de módulos ----

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockStorage = { from: vi.fn() };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: mockStorage,
  })),
}));

const mockGetSubscriptionStatus = vi.fn();
vi.mock("@/lib/subscription/get-status", () => ({
  getSubscriptionStatus: mockGetSubscriptionStatus,
}));

// ---- Importação dos handlers ----

let GET: typeof import("@/app/api/profile/route").GET;
let PATCH: typeof import("@/app/api/profile/route").PATCH;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();

  // Re-registrar mocks após resetModules
  vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({
      auth: { getUser: mockGetUser },
      from: mockFrom,
      storage: mockStorage,
    })),
  }));
  vi.mock("@/lib/subscription/get-status", () => ({
    getSubscriptionStatus: mockGetSubscriptionStatus,
  }));

  const mod = await import("@/app/api/profile/route");
  GET = mod.GET;
  PATCH = mod.PATCH;
});

// Helpers
function usuarioAutenticado(id = "user-123") {
  mockGetUser.mockResolvedValue({ data: { user: { id } }, error: null });
}

function subscricaoAtiva() {
  mockGetSubscriptionStatus.mockResolvedValue({ canWrite: true, status: "trial" });
}

function subscricaoReadOnly() {
  mockGetSubscriptionStatus.mockResolvedValue({ canWrite: false, status: "read_only" });
}

function criarSelectChain(resultado: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resultado),
    upsert: vi.fn().mockReturnThis(),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

// ============================================================
// Testes de GET /api/profile
// ============================================================
describe("GET /api/profile", () => {
  it("retorna 401 quando usuário não está autenticado", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const req = new NextRequest("http://localhost/api/profile");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("retorna perfil nulo quando perfil não existe", async () => {
    usuarioAutenticado();
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
    };
    mockFrom.mockReturnValue(chain);
    mockStorage.from.mockReturnValue({
      createSignedUrl: mockCreateSignedUrl,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const dados = await res.json();
    expect(dados.profile).toBeNull();
  });

  it("retorna perfil e signed URL quando logo existe", async () => {
    usuarioAutenticado("user-abc");
    const perfilMock = {
      id: "user-abc",
      business_name: "Marcenaria Silva",
      logo_url: "user-abc/logo.jpg",
    };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: perfilMock, error: null }),
    };
    mockFrom.mockReturnValue(chain);
    mockStorage.from.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://signed.url/logo.jpg" },
        error: null,
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const dados = await res.json();
    expect(dados.profile.business_name).toBe("Marcenaria Silva");
    expect(dados.logoSignedUrl).toBe("https://signed.url/logo.jpg");
  });
});

// ============================================================
// Testes de PATCH /api/profile
// ============================================================
describe("PATCH /api/profile", () => {
  it("retorna 200 com body vazio sem alterar campos (PATCH parcial)", async () => {
    usuarioAutenticado();
    subscricaoAtiva();

    const perfilMock = { id: "user-123", business_name: "Original" };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: perfilMock, error: null }),
      upsert: vi.fn().mockReturnThis(),
    };
    mockFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const dados = await res.json();
    // Upsert NÃO deve ter sido chamado para body vazio
    expect(chain.upsert).not.toHaveBeenCalled();
  });

  it("retorna 400 quando profit_margin_pct é 150 (inválido)", async () => {
    usuarioAutenticado();
    subscricaoAtiva();

    const req = new NextRequest("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profit_margin_pct: 150 }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const dados = await res.json();
    expect(dados.error).toContain("profit_margin_pct");
  });

  it("retorna 400 quando profit_margin_pct é negativo", async () => {
    usuarioAutenticado();
    subscricaoAtiva();

    const req = new NextRequest("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profit_margin_pct: -5 }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("retorna 403 quando assinatura é read_only", async () => {
    usuarioAutenticado();
    subscricaoReadOnly();

    const req = new NextRequest("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_name: "Nova" }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(403);
  });

  it("retorna 200 ao atualizar business_name com sucesso", async () => {
    usuarioAutenticado();
    subscricaoAtiva();

    const perfilAtualizado = { id: "user-123", business_name: "Nova Marcenaria" };
    const chain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: perfilAtualizado, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_name: "Nova Marcenaria" }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const dados = await res.json();
    expect(dados.profile.business_name).toBe("Nova Marcenaria");
  });

  it("retorna 400 quando quote_validity_days é 0 (inválido)", async () => {
    usuarioAutenticado();
    subscricaoAtiva();

    const req = new NextRequest("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quote_validity_days: 0 }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});
