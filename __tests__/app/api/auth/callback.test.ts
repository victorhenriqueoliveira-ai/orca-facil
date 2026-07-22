import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock do cliente Supabase server
const mockExchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  })),
}));

// Importar o handler após os mocks
let GET: typeof import("@/app/api/auth/callback/route").GET;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();

  // Re-registrar mock após reset
  vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    })),
  }));

  const mod = await import("@/app/api/auth/callback/route");
  GET = mod.GET;
});

function criarRequest(search: string) {
  return new NextRequest(`http://localhost:3000/api/auth/callback${search}`);
}

describe("GET /api/auth/callback", () => {
  it("redireciona para /login?error=missing_code quando 'code' não é fornecido", async () => {
    const req = criarRequest("");
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
    expect(res.headers.get("location")).toContain("error=missing_code");
  });

  it("redireciona para /login?error=invalid_code quando o code é inválido", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: null,
      error: { message: "Invalid code" },
    });

    const req = criarRequest("?code=codigo-invalido");
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
    expect(res.headers.get("location")).toContain("error=invalid_code");
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("codigo-invalido");
  });

  it("redireciona para /dashboard quando o code é válido e next não é fornecido", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: { id: "uuid-123" } } },
      error: null,
    });

    const req = criarRequest("?code=codigo-valido");
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("codigo-valido");
  });

  it("chama exchangeCodeForSession com o code exato da URL", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: {} },
      error: null,
    });

    const codigoTeste = "abc123def456";
    const req = criarRequest(`?code=${codigoTeste}`);
    await GET(req);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith(codigoTeste);
  });

  it("redireciona para /nova-senha quando next=/nova-senha e code é válido", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: { id: "uuid-123" } } },
      error: null,
    });

    const req = criarRequest("?code=codigo-valido&next=/nova-senha");
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/nova-senha");
    expect(res.headers.get("location")).not.toContain("/dashboard");
  });

  it("redireciona para /dashboard quando next=https://evil.com (open redirect bloqueado)", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: { id: "uuid-123" } } },
      error: null,
    });

    const req = criarRequest("?code=codigo-valido&next=https://evil.com");
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
    expect(res.headers.get("location")).not.toContain("evil.com");
  });

  it("redireciona para /login?error=invalid_code independente do next quando code é inválido", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: null,
      error: { message: "Invalid code" },
    });

    const req = criarRequest("?code=codigo-invalido&next=/nova-senha");
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
    expect(res.headers.get("location")).toContain("error=invalid_code");
    expect(res.headers.get("location")).not.toContain("/nova-senha");
  });

  it("redireciona para /dashboard quando next é string vazia", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: { id: "uuid-123" } } },
      error: null,
    });

    const req = criarRequest("?code=codigo-valido&next=");
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
  });
});
