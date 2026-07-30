import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildQuoteExpiringHtml } from "@/lib/email/templates/quote-expiring";

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

describe("lib/email/templates/quote-expiring", () => {
  describe("buildQuoteExpiringHtml", () => {
    it("retorna string HTML não vazia (length > 100)", () => {
      const html = buildQuoteExpiringHtml({
        business_name: "Carpintaria Silva",
        quote_number: 7,
        customer_name: "Ana",
        quote_url: "https://orcafacil.com.br/orcamentos/7",
        days_until_expiry: 3,
      });

      expect(html.length).toBeGreaterThan(100);
    });

    it("inclui days_until_expiry no HTML retornado", () => {
      const html = buildQuoteExpiringHtml({
        business_name: "Carpintaria Silva",
        quote_number: 7,
        customer_name: "Ana",
        quote_url: "https://orcafacil.com.br/orcamentos/7",
        days_until_expiry: 3,
      });

      expect(html).toContain("3");
    });

    it("inclui o número do orçamento no HTML", () => {
      const html = buildQuoteExpiringHtml({
        business_name: "Carpintaria Silva",
        quote_number: 7,
        customer_name: "Ana",
        quote_url: "https://orcafacil.com.br/orcamentos/7",
        days_until_expiry: 3,
      });

      expect(html).toContain("7");
    });

    it("inclui o nome do cliente no HTML", () => {
      const html = buildQuoteExpiringHtml({
        business_name: "Carpintaria Silva",
        quote_number: 7,
        customer_name: "Ana",
        quote_url: "https://orcafacil.com.br/orcamentos/7",
        days_until_expiry: 3,
      });

      expect(html).toContain("Ana");
    });

    it("inclui o nome da marcenaria no HTML", () => {
      const html = buildQuoteExpiringHtml({
        business_name: "Carpintaria Silva",
        quote_number: 7,
        customer_name: "Ana",
        quote_url: "https://orcafacil.com.br/orcamentos/7",
        days_until_expiry: 3,
      });

      expect(html).toContain("Carpintaria Silva");
    });

    it("inclui o link de ação (quote_url) no HTML", () => {
      const quoteUrl = "https://orcafacil.com.br/orcamentos/7";
      const html = buildQuoteExpiringHtml({
        business_name: "Carpintaria Silva",
        quote_number: 7,
        customer_name: "Ana",
        quote_url: quoteUrl,
        days_until_expiry: 3,
      });

      expect(html).toContain(quoteUrl);
    });

    it("formata '1 dia' corretamente no singular", () => {
      const html = buildQuoteExpiringHtml({
        business_name: "Carpintaria Silva",
        quote_number: 7,
        customer_name: "Ana",
        quote_url: "https://orcafacil.com.br/orcamentos/7",
        days_until_expiry: 1,
      });

      expect(html).toContain("1 dia");
      expect(html).not.toContain("1 dias");
    });

    it("usa 'Marceneiro' como fallback quando business_name é null", () => {
      const html = buildQuoteExpiringHtml({
        business_name: null,
        quote_number: 7,
        customer_name: "Ana",
        quote_url: "https://orcafacil.com.br/orcamentos/7",
        days_until_expiry: 3,
      });

      expect(html).toContain("Marceneiro");
    });

    it("usa 'Cliente' como fallback quando customer_name é null", () => {
      const html = buildQuoteExpiringHtml({
        business_name: "Carpintaria Silva",
        quote_number: 7,
        customer_name: null,
        quote_url: "https://orcafacil.com.br/orcamentos/7",
        days_until_expiry: 3,
      });

      expect(html).toContain("Cliente");
    });

    it("retorna HTML válido com DOCTYPE", () => {
      const html = buildQuoteExpiringHtml({
        business_name: "Carpintaria Silva",
        quote_number: 7,
        customer_name: "Ana",
        quote_url: "https://orcafacil.com.br/orcamentos/7",
        days_until_expiry: 3,
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
    });
  });

  describe("sendQuoteExpiring", () => {
    beforeEach(() => {
      mockEmailsSend.mockReset();
      vi.stubEnv("RESEND_API_KEY", "re_test_key_123");
    });

    it("retorna { success: true, id: '...' } ao simular resposta bem-sucedida da API", async () => {
      mockEmailsSend.mockResolvedValue({ data: { id: "email_expiring_789" }, error: null });

      const { sendQuoteExpiring } = await import(
        "@/lib/email/templates/quote-expiring"
      );

      const result = await sendQuoteExpiring("marceneiro@example.com", {
        business_name: "Carpintaria Silva",
        quote_number: 7,
        customer_name: "Ana",
        quote_url: "https://orcafacil.com.br/orcamentos/7",
        days_until_expiry: 3,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("email_expiring_789");
      expect(result.error).toBeUndefined();
    });

    it("retorna { success: false, error: ... } ao simular erro da API", async () => {
      mockEmailsSend.mockResolvedValue({
        data: null,
        error: { message: "Rate limit exceeded", name: "rate_limit_error" },
      });

      const { sendQuoteExpiring } = await import(
        "@/lib/email/templates/quote-expiring"
      );

      const result = await sendQuoteExpiring("marceneiro@example.com", {
        business_name: "Carpintaria Silva",
        quote_number: 7,
        customer_name: "Ana",
        quote_url: "https://orcafacil.com.br/orcamentos/7",
        days_until_expiry: 3,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Rate limit exceeded");
      expect(result.id).toBeUndefined();
    });

    it("captura exceções lançadas pelo Resend e retorna { success: false }", async () => {
      mockEmailsSend.mockRejectedValue(new Error("DNS resolution failed"));

      const { sendQuoteExpiring } = await import(
        "@/lib/email/templates/quote-expiring"
      );

      const result = await sendQuoteExpiring("marceneiro@example.com", {
        business_name: "Carpintaria Silva",
        quote_number: 7,
        customer_name: "Ana",
        quote_url: "https://orcafacil.com.br/orcamentos/7",
        days_until_expiry: 3,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("DNS resolution failed");
    });
  });
});
