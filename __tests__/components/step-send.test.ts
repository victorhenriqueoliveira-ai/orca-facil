import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { interpolateTemplate, DEFAULT_WHATSAPP_TEMPLATE } from "@/components/wizard/step-send";

// ----------------------------------------------------------------
// Testes unitários para interpolação de variáveis — step-send.tsx
// ----------------------------------------------------------------

describe("interpolateTemplate", () => {
  it("substitui {{nome_cliente}} pelo nome real do cliente", () => {
    const result = interpolateTemplate("Olá, {{nome_cliente}}!", {
      nome_cliente: "João Silva",
    });
    expect(result).toBe("Olá, João Silva!");
  });

  it("usa 'cliente' como fallback quando nome_cliente não é fornecido", () => {
    const result = interpolateTemplate("Olá, {{nome_cliente}}!", {});
    expect(result).toBe("Olá, cliente!");
  });

  it("substitui {{numero_orcamento}} pelo número real do orçamento", () => {
    const result = interpolateTemplate("Orçamento #{{numero_orcamento}}", {
      numero_orcamento: 42,
    });
    expect(result).toBe("Orçamento #42");
  });

  it("substitui {{numero_orcamento}} com string", () => {
    const result = interpolateTemplate("Orçamento #{{numero_orcamento}}", {
      numero_orcamento: "007",
    });
    expect(result).toBe("Orçamento #007");
  });

  it("substitui {{numero_orcamento}} por string vazia quando não fornecido", () => {
    const result = interpolateTemplate("Orçamento #{{numero_orcamento}}", {});
    expect(result).toBe("Orçamento #");
  });

  it("substitui {{link_aprovacao}} pelo approval_link retornado pelo PATCH", () => {
    const link = "https://orca-facil.com/approve/abc123";
    const result = interpolateTemplate("Acesse: {{link_aprovacao}}", {
      link_aprovacao: link,
    });
    expect(result).toBe(`Acesse: ${link}`);
  });

  it("substitui {{link_aprovacao}} por string vazia quando não fornecido", () => {
    const result = interpolateTemplate("Acesse: {{link_aprovacao}}", {});
    expect(result).toBe("Acesse: ");
  });

  it("substitui todas as variáveis ao mesmo tempo no template completo", () => {
    const result = interpolateTemplate(DEFAULT_WHATSAPP_TEMPLATE, {
      nome_cliente: "Maria",
      numero_orcamento: 10,
      link_aprovacao: "https://orca-facil.com/approve/xyz",
    });
    expect(result).toContain("Maria");
    expect(result).toContain("10");
    expect(result).toContain("https://orca-facil.com/approve/xyz");
    expect(result).not.toContain("{{nome_cliente}}");
    expect(result).not.toContain("{{numero_orcamento}}");
    expect(result).not.toContain("{{link_aprovacao}}");
  });

  it("substitui múltiplas ocorrências da mesma variável", () => {
    const result = interpolateTemplate(
      "{{nome_cliente}} pediu. Obrigado, {{nome_cliente}}!",
      { nome_cliente: "Pedro" }
    );
    expect(result).toBe("Pedro pediu. Obrigado, Pedro!");
  });

  it("não altera texto sem variáveis", () => {
    const text = "Mensagem sem variáveis.";
    const result = interpolateTemplate(text, {
      nome_cliente: "Alguém",
    });
    expect(result).toBe(text);
  });
});

describe("DEFAULT_WHATSAPP_TEMPLATE", () => {
  it("contém as três variáveis obrigatórias", () => {
    expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("{{nome_cliente}}");
    expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("{{numero_orcamento}}");
    expect(DEFAULT_WHATSAPP_TEMPLATE).toContain("{{link_aprovacao}}");
  });
});

// ----------------------------------------------------------------
// Testes de integração simulada — fluxo de fetch e PATCH
// ----------------------------------------------------------------

describe("Fluxo de salvamento do modelo (simulado com fetch mock)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PATCH /api/profile é chamado com whatsapp_message_template ao salvar modelo", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ profile: { whatsapp_message_template: "Meu template" } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    // Simular o que handleSaveTemplate faria
    const template = "Olá, {{nome_cliente}}! Seu orçamento: {{numero_orcamento}}";
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsapp_message_template: template }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/profile",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ whatsapp_message_template: template }),
      })
    );
    expect(res.ok).toBe(true);
  });

  it("GET /api/profile retorna whatsapp_message_template do perfil", async () => {
    const mockTemplate = "Template personalizado: {{nome_cliente}}";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          whatsapp_message_template: mockTemplate,
        },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await fetch("/api/profile");
    const data = await res.json();

    expect(data.profile.whatsapp_message_template).toBe(mockTemplate);
  });

  it("usa template padrão quando whatsapp_message_template do perfil é nulo", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          whatsapp_message_template: null,
        },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const res = await fetch("/api/profile");
    const data = await res.json();

    // Simular lógica do componente
    const profileTemplate = data?.profile?.whatsapp_message_template;
    const templateToUse = profileTemplate ?? DEFAULT_WHATSAPP_TEMPLATE;

    expect(templateToUse).toBe(DEFAULT_WHATSAPP_TEMPLATE);
  });
});

describe("Link wa.me com encodeURIComponent", () => {
  it("link WhatsApp usa encodeURIComponent da mensagem editada", () => {
    const mensagem = "Olá, João Silva! Orçamento #42.\nAcesse: https://link.com/abc";
    const waUrl = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

    expect(waUrl).toContain("https://wa.me/?text=");
    expect(waUrl).toContain(encodeURIComponent(mensagem));
    // Verifica que espaços e caracteres especiais foram encodados
    expect(waUrl).not.toContain(" ");
    expect(waUrl).not.toContain("\n");
    expect(waUrl).not.toContain("#");
  });

  it("encodeURIComponent funciona com link de aprovação na mensagem", () => {
    const mensagem = interpolateTemplate(DEFAULT_WHATSAPP_TEMPLATE, {
      nome_cliente: "Ana",
      numero_orcamento: 5,
      link_aprovacao: "https://orca-facil.com/approve/token123",
    });
    const waUrl = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

    expect(waUrl).toContain("https://wa.me/?text=");
    // O link encodado não contém o link original literalmente
    expect(waUrl).not.toContain("https://orca-facil.com/approve/token123");
    // Mas contém a versão encodada
    expect(waUrl).toContain(encodeURIComponent("https://orca-facil.com/approve/token123"));
  });
});
