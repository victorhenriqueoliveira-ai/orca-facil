import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do @supabase/ssr antes de importar o módulo
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  })),
}));

describe("lib/supabase/client", () => {
  beforeEach(() => {
    // Configurar variáveis de ambiente
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("exporta uma função createClient", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    expect(typeof createClient).toBe("function");
  });

  it("retorna um client Supabase válido (não nulo)", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();
    expect(client).not.toBeNull();
    expect(client).not.toBeUndefined();
  });

  it("o client possui a propriedade auth", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();
    expect(client).toHaveProperty("auth");
  });

  it("chama createBrowserClient com as variáveis de ambiente corretas", async () => {
    const { createBrowserClient } = await import("@supabase/ssr");
    const { createClient } = await import("@/lib/supabase/client");

    createClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://test-project.supabase.co",
      "test-anon-key"
    );
  });
});
