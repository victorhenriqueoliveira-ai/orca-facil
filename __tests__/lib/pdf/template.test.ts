import { describe, it, expect } from "vitest";
import { generatePdfHtml } from "@/lib/pdf/template";
import type { PdfQuoteData } from "@/lib/pdf/template";

// ----------------------------------------------------------------
// Fixture helpers
// ----------------------------------------------------------------

function makeQuoteData(overrides: Partial<PdfQuoteData> = {}): PdfQuoteData {
  return {
    quoteNumber: 1,
    createdAt: "2024-01-15T10:00:00Z",
    validityDays: 30,
    notes: null,
    customer: {
      name: "João Silva",
      phone: "(11) 99999-9999",
      email: "joao@email.com",
      address: "Rua das Flores, 123",
    },
    profile: {
      businessName: "Marcenaria Teste",
      city: "São Paulo",
      phone: "(11) 3000-0000",
      pixKey: "marcenaria@pix.com",
      bankInfo: "Banco XYZ",
      logoUrl: null,
    },
    versions: [
      {
        id: "v1",
        name: "Padrão",
        profit_margin_pct: 20,
        rooms: [
          {
            id: "r1",
            name: "Sala",
            items: [
              { id: "i1", name: "Armário", unit: "un", unit_price: 500, quantity: 2 },
              { id: "i2", name: "Painel TV", unit: "m²", unit_price: 300, quantity: 3 },
            ],
          },
          {
            id: "r2",
            name: "Quarto",
            items: [
              { id: "i3", name: "Guarda-roupa", unit: "un", unit_price: 1200, quantity: 1 },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

// ----------------------------------------------------------------
// Tests: lib/pdf/template.ts
// ----------------------------------------------------------------

describe("generatePdfHtml", () => {
  it("retorna string HTML válida", () => {
    const html = generatePdfHtml(makeQuoteData(), "summary");
    expect(typeof html).toBe("string");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<body");
    expect(html).toContain("</body>");
  });

  it("retorna HTML com 2 seções de ambiente quando o orçamento tem 2 ambientes", () => {
    const data = makeQuoteData();
    expect(data.versions[0].rooms).toHaveLength(2);

    const html = generatePdfHtml(data, "summary");

    // Should contain both room names
    expect(html).toContain("Sala");
    expect(html).toContain("Quarto");
  });

  it("modo resumido não inclui tabela de itens individuais", () => {
    const html = generatePdfHtml(makeQuoteData(), "summary");

    // In summary mode, no <table> elements should be rendered (items-table class is in CSS but not in DOM)
    expect(html).not.toContain("<table");
    // Item names should NOT appear in the HTML
    expect(html).not.toContain("Armário");
    expect(html).not.toContain("Painel TV");
  });

  it("modo detalhado inclui todos os itens com unit_price e quantity", () => {
    const html = generatePdfHtml(makeQuoteData(), "detailed");

    // In detailed mode, table elements should be rendered with items
    expect(html).toContain("<table");
    expect(html).toContain("Armário");
    expect(html).toContain("Painel TV");
    expect(html).toContain("Guarda-roupa");
  });

  it("template com logo_url = null renderiza sem tag <img>", () => {
    const data = makeQuoteData({
      profile: {
        businessName: "Marcenaria Sem Logo",
        city: null,
        phone: null,
        pixKey: null,
        bankInfo: null,
        logoUrl: null,
      },
    });

    const html = generatePdfHtml(data, "summary");

    // Should not have an img tag
    expect(html).not.toContain("<img");
    // Should render no-logo placeholder
    expect(html).toContain("no-logo");
  });

  it("template com logo_url definida renderiza tag <img> com a URL", () => {
    const logoUrl = "https://example.com/logo.png";
    const data = makeQuoteData({
      profile: {
        businessName: "Marcenaria Com Logo",
        city: "SP",
        phone: null,
        pixKey: null,
        bankInfo: null,
        logoUrl,
      },
    });

    const html = generatePdfHtml(data, "summary");
    expect(html).toContain(`<img src="${logoUrl}"`);
  });

  it("exibe total formatado como R$ com vírgula decimal e ponto milhar", () => {
    const data = makeQuoteData({
      versions: [
        {
          id: "v1",
          name: "Padrão",
          profit_margin_pct: 0,
          rooms: [
            {
              id: "r1",
              name: "Sala",
              items: [
                { id: "i1", name: "Armário", unit: "un", unit_price: 1500, quantity: 1 },
              ],
            },
          ],
        },
      ],
    });

    const html = generatePdfHtml(data, "summary");
    // R$ 1.500,00
    expect(html).toContain("1.500");
    expect(html).toContain(",00");
  });

  it("cliente não informado renderiza mensagem adequada sem erro", () => {
    const data = makeQuoteData({ customer: null });
    const html = generatePdfHtml(data, "summary");

    expect(html).toContain("Cliente não informado");
    // Should not throw
  });

  it("modo detalhado mostra dados do cliente no cabeçalho", () => {
    const html = generatePdfHtml(makeQuoteData(), "detailed");
    expect(html).toContain("João Silva");
  });

  it("exibe número do orçamento no HTML", () => {
    const data = makeQuoteData({ quoteNumber: 42 });
    const html = generatePdfHtml(data, "summary");
    expect(html).toContain("42");
  });

  it("exibe informação de validade", () => {
    const data = makeQuoteData({ validityDays: 15 });
    const html = generatePdfHtml(data, "summary");
    expect(html).toContain("15");
    expect(html).toContain("dias");
  });

  it("exibe chave Pix quando configurada", () => {
    const html = generatePdfHtml(makeQuoteData(), "summary");
    expect(html).toContain("marcenaria@pix.com");
  });

  it("escapa caracteres especiais HTML em nomes de clientes", () => {
    const data = makeQuoteData({
      customer: {
        name: 'Cliente <script>alert("xss")</script>',
        phone: null,
        email: null,
        address: null,
      },
    });

    const html = generatePdfHtml(data, "summary");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("versões múltiplas renderizam cada versão", () => {
    const data = makeQuoteData({
      versions: [
        {
          id: "v1",
          name: "Padrão",
          profit_margin_pct: 0,
          rooms: [{ id: "r1", name: "Sala", items: [] }],
        },
        {
          id: "v2",
          name: "Premium",
          profit_margin_pct: 30,
          rooms: [{ id: "r2", name: "Quarto Master", items: [] }],
        },
      ],
    });

    const html = generatePdfHtml(data, "summary");
    expect(html).toContain("Padrão");
    expect(html).toContain("Premium");
    expect(html).toContain("Sala");
    expect(html).toContain("Quarto Master");
  });
});
