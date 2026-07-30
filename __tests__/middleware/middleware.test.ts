import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock do @supabase/ssr — precisa ser no top level para hoisting funcionar
const mockGetUser = vi.fn();
const mockSignOut = vi.fn();

// Captura das opções de cookies passadas ao createServerClient
let capturedCookieOptions: {
  getAll?: () => unknown;
  setAll?: (cookies: { name: string; value: string; options?: unknown }[]) => void;
} = {};

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: { cookies: typeof capturedCookieOptions }) => {
    capturedCookieOptions = options.cookies;
    return {
      auth: {
        getUser: mockGetUser,
        signOut: mockSignOut,
      },
    };
  }),
}));

// Importar o proxy após os mocks
let middleware: typeof import("@/proxy").proxy;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  capturedCookieOptions = {};

  // Re-mock após resetModules
  vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn((_url: string, _key: string, options: { cookies: typeof capturedCookieOptions }) => {
      capturedCookieOptions = options.cookies;
      return {
        auth: {
          getUser: mockGetUser,
          signOut: mockSignOut,
        },
      };
    }),
  }));

  const mod = await import("@/proxy");
  middleware = mod.proxy;
});

function criarRequest(pathname: string, cookies: Record<string, string> = {}) {
  const url = `http://localhost:3000${pathname}`;
  const req = new NextRequest(url);

  Object.entries(cookies).forEach(([nome, valor]) => {
    req.cookies.set(nome, valor);
  });

  return req;
}

describe("middleware", () => {
  describe("rotas públicas — devem passar sem autenticação", () => {
    it("permite /login sem sessão", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const req = criarRequest("/login");
      const res = await middleware(req);

      expect(res).toBeInstanceOf(NextResponse);
      // Não deve redirecionar para /login (status de redirect)
      expect(res.status).not.toBe(307);
      expect(res.headers.get("location")).toBeNull();
    });

    it("permite /auth/verify sem sessão", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const req = criarRequest("/auth/verify");
      const res = await middleware(req);

      expect(res.headers.get("location")).toBeNull();
    });

    it("permite /api/auth/callback sem sessão", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const req = criarRequest("/api/auth/callback");
      const res = await middleware(req);

      expect(res.headers.get("location")).toBeNull();
    });

    it("permite /o/[token] sem sessão (rota pública de aprovação)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const req = criarRequest("/o/abc123-token-uuid");
      const res = await middleware(req);

      expect(res.status).not.toBe(307);
      expect(res.headers.get("location")).toBeNull();
    });
  });

  describe("rotas protegidas — sem sessão deve redirecionar para /login", () => {
    it("redireciona /dashboard para /login quando não autenticado", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const req = criarRequest("/dashboard");
      const res = await middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("redireciona /orcamentos para /login quando não autenticado", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const req = criarRequest("/orcamentos");
      const res = await middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });

    it("redireciona /perfil para /login quando não autenticado", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const req = criarRequest("/perfil");
      const res = await middleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login");
    });
  });

  describe("rotas protegidas — com sessão válida deve passar", () => {
    const usuarioMock = {
      id: "uuid-123",
      email: "marceneiro@teste.com",
      aud: "authenticated",
    };

    it("permite /dashboard com sessão válida", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: usuarioMock },
        error: null,
      });
      const req = criarRequest("/dashboard");
      const res = await middleware(req);

      expect(res.status).not.toBe(307);
      expect(res.headers.get("location")).toBeNull();
    });

    it("permite /orcamentos com sessão válida", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: usuarioMock },
        error: null,
      });
      const req = criarRequest("/orcamentos");
      const res = await middleware(req);

      expect(res.status).not.toBe(307);
      expect(res.headers.get("location")).toBeNull();
    });
  });

  describe("gerenciamento de cookies — funções internas do createServerClient", () => {
    const usuarioMock = {
      id: "uuid-123",
      email: "marceneiro@teste.com",
      aud: "authenticated",
    };

    it("getAll retorna os cookies da requisição", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: usuarioMock },
        error: null,
      });

      const req = criarRequest("/dashboard", { "sb-session": "token123" });
      await middleware(req);

      // Verificar que getAll está definido e funciona
      expect(capturedCookieOptions.getAll).toBeDefined();
      const cookies = capturedCookieOptions.getAll!();
      expect(Array.isArray(cookies)).toBe(true);
    });

    it("setAll atualiza cookies na resposta sem lançar erros", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: usuarioMock },
        error: null,
      });

      const req = criarRequest("/dashboard");
      await middleware(req);

      // Verificar que setAll está definido e pode ser invocado sem erros
      expect(capturedCookieOptions.setAll).toBeDefined();
      expect(() => {
        capturedCookieOptions.setAll!([
          { name: "sb-session", value: "novo-token", options: {} },
        ]);
      }).not.toThrow();
    });
  });
});
