import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do cookie store
const mockCookieStore = {
  getAll: vi.fn().mockReturnValue([{ name: "test", value: "cookie-value" }]),
  set: vi.fn(),
};

// Mock de next/headers (API assíncrona do Next.js 16)
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

// Capturar as opções passadas para createServerClient
let capturedOptions: Record<string, unknown> = {};

// Mock do @supabase/ssr
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((url, key, options) => {
    capturedOptions = options;
    return {
      auth: { getSession: vi.fn() },
      from: vi.fn(),
    };
  }),
}));

describe("lib/supabase/server", () => {
  beforeEach(() => {
    // Configurar variáveis de ambiente
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    capturedOptions = {};
  });

  it("exporta uma função createClient", async () => {
    const mod = await import("@/lib/supabase/server");
    expect(typeof mod.createClient).toBe("function");
  });

  it("retorna um client Supabase válido (não nulo)", async () => {
    const mod = await import("@/lib/supabase/server");
    const client = await mod.createClient();
    expect(client).not.toBeNull();
    expect(client).not.toBeUndefined();
  });

  it("o client retornado possui a propriedade auth", async () => {
    const mod = await import("@/lib/supabase/server");
    const client = await mod.createClient();
    expect(client).toHaveProperty("auth");
  });

  it("chama createServerClient com URL e chave corretas", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    const mod = await import("@/lib/supabase/server");

    await mod.createClient();

    expect(createServerClient).toHaveBeenCalledWith(
      "https://test-project.supabase.co",
      "test-anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    );
  });

  it("getAll delega para cookieStore.getAll()", async () => {
    const mod = await import("@/lib/supabase/server");
    await mod.createClient();

    // Invocar getAll das opções capturadas
    const cookies = capturedOptions as { cookies: { getAll: () => unknown; setAll: (c: unknown[]) => void } };
    const result = cookies.cookies.getAll();

    expect(mockCookieStore.getAll).toHaveBeenCalled();
    expect(result).toEqual([{ name: "test", value: "cookie-value" }]);
  });

  it("setAll delega para cookieStore.set() para cada cookie", async () => {
    const mod = await import("@/lib/supabase/server");
    await mod.createClient();

    // Invocar setAll das opções capturadas
    const cookies = capturedOptions as { cookies: { getAll: () => unknown; setAll: (c: { name: string; value: string; options?: unknown }[]) => void } };
    cookies.cookies.setAll([{ name: "session", value: "abc123" }]);

    expect(mockCookieStore.set).toHaveBeenCalledWith("session", "abc123", undefined);
  });

  it("setAll captura erros de Server Components sem propagar", async () => {
    // Simular contexto de Server Component onde set lança erro
    mockCookieStore.set.mockImplementationOnce(() => {
      throw new Error("Cannot set cookies in Server Component");
    });

    const mod = await import("@/lib/supabase/server");
    await mod.createClient();

    const cookies = capturedOptions as { cookies: { getAll: () => unknown; setAll: (c: { name: string; value: string; options?: unknown }[]) => void } };

    // Não deve lançar erro
    expect(() => {
      cookies.cookies.setAll([{ name: "session", value: "abc123" }]);
    }).not.toThrow();
  });
});
