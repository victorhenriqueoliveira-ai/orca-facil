import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildQuoteFollowupHtml } from "@/lib/email/templates/quote-followup";

// Usamos vi.hoisted para criar os mocks antes do hoisting de vi.mock
const { mockEmailsSend, mockResendInstance } = vi.hoisted(() => {
  const mockEmailsSend = vi.fn();
  const mockResendInstance = { emails: { send: mockEmailsSend } };
  return { mockEmailsSend, mockResendInstance };
});

// Mock do módulo resend
vi.mock("resend", () => {
  function ResendMock() {
    return mockResendInstance;
  }
  return { Resend: ResendMock };
});

describe("lib/email/templates/quote-followup", () => {
  describe("buildQuoteFollowupHtml", () => {
    it("retorna string HTML não vazia (length > 100)", () => {
      const html = buildQuoteFollowupHtml({
        business_name: "Madeirarte",
        quote_number: 10,
        customer_name: "Maria",
        quote_url: "https://orcafacil.com.br/orcamentos/10",
        days_since_sent: 5,
      });

      expect(html.length).toBeGreaterThan(100);
    });

    it("inclui days_since_sent no HTML retornado", () => {
      const html = buildQuoteFollowupHtml({
        business_name: "Madeirarte",
        quote_number: 10,
        customer_name: "Maria",
        quote_url: "https://orcafacil.com.br/orcamentos/10",
        days_since_sent: 5,
      });

      expect(html).toContain("5");
    });

    it("inclui o número do orçamento no HTML", () => {
      const html = buildQuoteFollowupHtml({
        business_name: "Madeirarte",
        quote_number: 10,
        customer_name: "Maria",
        quote_url: "https://orcafacil.com.br/orcamentos/10",
        days_since_sent: 5,
      });

      expect(html).toContain("10");
    });

    it("inclui o nome do cliente no HTML", () => {
      const html = buildQuoteFollowupHtml({
        business_name: "Madeirarte",
        quote_number: 10,
        customer_name: "Maria",
        quote_url: "https://orcafacil.com.br/orcamentos/10",
        days_since_sent: 5,
      });

      expect(html).toContain("Maria");
    });

    it("inclui o nome da marcenaria no HTML", () => {
      const html = buildQuoteFollowupHtml({
        business_name: "Madeirarte",
        quote_number: 10,
        customer_name: "Maria",
        quote_url: "https://orcafacil.com.br/orcamentos/10",
        days_since_sent: 5,
      });

      expect(html).toContain("Madeirarte");
    });

    it("inclui o link de ação (quote_url) no HTML", () => {
      const quoteUrl = "https://orcafacil.com.br/orcamentos/10";
      const html = buildQuoteFollowupHtml({
        business_name: "Madeirarte",
        quote_number: 10,
        customer_name: "Maria",
        quote_url: quoteUrl,
        days_since_sent: 5,
      });

      expect(html).toContain(quoteUrl);
    });

    it("formata '1 dia' corretamente no singular", () => {
      const html = buildQuoteFollowupHtml({
        business_name: "Madeirarte",
        quote_number: 10,
        customer_name: "Maria",
        quote_url: "https://orcafacil.com.br/orcamentos/10",
        days_since_sent: 1,
      });

      expect(html).toContain("1 dia");
      expect(html).not.toContain("1 dias");
    });

    it("usa 'Marceneiro' como fallback quando business_name é null", () => {
      const html = buildQuoteFollowupHtml({
        business_name: null,
        quote_number: 10,
        customer_name: "Maria",
        quote_url: "https://orcafacil.com.br/orcamentos/10",
        days_since_sent: 5,
      });

      expect(html).toContain("Marceneiro");
    });

    it("usa 'Cliente' como fallback quando customer_name é null", () => {
      const html = buildQuoteFollowupHtml({
        business_name: "Madeirarte",
        quote_number: 10,
        customer_name: null,
        quote_url: "https://orcafacil.com.br/orcamentos/10",
        days_since_sent: 5,
      });

      expect(html).toContain("Cliente");
    });

    it("retorna HTML válido com DOCTYPE", () => {
      const html = buildQuoteFollowupHtml({
        business_name: "Madeirarte",
        quote_number: 10,
        customer_name: "Maria",
        quote_url: "https://orcafacil.com.br/orcamentos/10",
        days_since_sent: 5,
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
    });
  });

  describe("sendQuoteFollowup", () => {
    beforeEach(() => {
      mockEmailsSend.mockReset();
      vi.stubEnv("RESEND_API_KEY", "re_test_key_123");
    });

    it("retorna { success: false, error: ... } ao simular erro da API", async () => {
      mockEmailsSend.mockResolvedValue({
        data: null,
        error: { message: "API quota exceeded", name: "quota_error" },
      });

      const { sendQuoteFollowup } = await import(
        "@/lib/email/templates/quote-followup"
      );

      const result = await sendQuoteFollowup("marceneiro@example.com", {
        business_name: "Madeirarte",
        quote_number: 10,
        customer_name: "Maria",
        quote_url: "https://orcafacil.com.br/orcamentos/10",
        days_since_sent: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("API quota exceeded");
      expect(result.id).toBeUndefined();
    });

    it("retorna { success: true, id: '...' } ao simular resposta bem-sucedida da API", async () => {
      mockEmailsSend.mockResolvedValue({ data: { id: "email_followup_456" }, error: null });

      const { sendQuoteFollowup } = await import(
        "@/lib/email/templates/quote-followup"
      );

      const result = await sendQuoteFollowup("marceneiro@example.com", {
        business_name: "Madeirarte",
        quote_number: 10,
        customer_name: "Maria",
        quote_url: "https://orcafacil.com.br/orcamentos/10",
        days_since_sent: 5,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("email_followup_456");
      expect(result.error).toBeUndefined();
    });

    it("captura exceções lançadas pelo Resend e retorna { success: false }", async () => {
      mockEmailsSend.mockRejectedValue(new Error("Connection refused"));

      const { sendQuoteFollowup } = await import(
        "@/lib/email/templates/quote-followup"
      );

      const result = await sendQuoteFollowup("marceneiro@example.com", {
        business_name: "Madeirarte",
        quote_number: 10,
        customer_name: "Maria",
        quote_url: "https://orcafacil.com.br/orcamentos/10",
        days_since_sent: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Connection refused");
    });
  });
});
