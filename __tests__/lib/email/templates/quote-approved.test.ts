import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildQuoteApprovedHtml } from "@/lib/email/templates/quote-approved";

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

describe("lib/email/templates/quote-approved", () => {
  describe("buildQuoteApprovedHtml", () => {
    it("retorna string HTML não vazia (length > 100)", () => {
      const html = buildQuoteApprovedHtml({
        business_name: "Marcenaria X",
        quote_number: 42,
        customer_name: "João",
        quote_url: "https://orcafacil.com.br/orcamentos/42",
      });

      expect(html.length).toBeGreaterThan(100);
    });

    it("inclui o número do orçamento no HTML", () => {
      const html = buildQuoteApprovedHtml({
        business_name: "Marcenaria X",
        quote_number: 42,
        customer_name: "João",
        quote_url: "https://orcafacil.com.br/orcamentos/42",
      });

      expect(html).toContain("42");
    });

    it("inclui o nome do cliente no HTML", () => {
      const html = buildQuoteApprovedHtml({
        business_name: "Marcenaria X",
        quote_number: 42,
        customer_name: "João",
        quote_url: "https://orcafacil.com.br/orcamentos/42",
      });

      expect(html).toContain("João");
    });

    it("inclui o nome da marcenaria no HTML", () => {
      const html = buildQuoteApprovedHtml({
        business_name: "Marcenaria X",
        quote_number: 42,
        customer_name: "João",
        quote_url: "https://orcafacil.com.br/orcamentos/42",
      });

      expect(html).toContain("Marcenaria X");
    });

    it("inclui os três valores: quote_number, customer_name e business_name", () => {
      const html = buildQuoteApprovedHtml({
        business_name: "Marcenaria X",
        quote_number: 42,
        customer_name: "João",
        quote_url: "https://orcafacil.com.br/orcamentos/42",
      });

      expect(html).toContain("42");
      expect(html).toContain("João");
      expect(html).toContain("Marcenaria X");
    });

    it("inclui o link de ação (quote_url) no HTML", () => {
      const quoteUrl = "https://orcafacil.com.br/orcamentos/42";
      const html = buildQuoteApprovedHtml({
        business_name: "Marcenaria X",
        quote_number: 42,
        customer_name: "João",
        quote_url: quoteUrl,
      });

      expect(html).toContain(quoteUrl);
    });

    it("usa 'Marceneiro' como fallback quando business_name é null", () => {
      const html = buildQuoteApprovedHtml({
        business_name: null,
        quote_number: 42,
        customer_name: "João",
        quote_url: "https://orcafacil.com.br/orcamentos/42",
      });

      expect(html).toContain("Marceneiro");
    });

    it("usa 'Cliente' como fallback quando customer_name é null", () => {
      const html = buildQuoteApprovedHtml({
        business_name: "Marcenaria X",
        quote_number: 42,
        customer_name: null,
        quote_url: "https://orcafacil.com.br/orcamentos/42",
      });

      expect(html).toContain("Cliente");
    });

    it("retorna HTML válido com DOCTYPE", () => {
      const html = buildQuoteApprovedHtml({
        business_name: "Marcenaria X",
        quote_number: 42,
        customer_name: "João",
        quote_url: "https://orcafacil.com.br/orcamentos/42",
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
    });
  });

  describe("sendQuoteApproved", () => {
    beforeEach(() => {
      mockEmailsSend.mockReset();
      vi.stubEnv("RESEND_API_KEY", "re_test_key_123");
    });

    it("retorna { success: false, error: ... } quando RESEND_API_KEY está ausente, sem lançar exceção", async () => {
      vi.stubEnv("RESEND_API_KEY", "");

      const { sendQuoteApproved } = await import(
        "@/lib/email/templates/quote-approved"
      );

      const result = await sendQuoteApproved("test@example.com", {
        business_name: "Marcenaria X",
        quote_number: 42,
        customer_name: "João",
        quote_url: "https://orcafacil.com.br/orcamentos/42",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("retorna { success: true, id: '...' } ao simular resposta bem-sucedida da API", async () => {
      mockEmailsSend.mockResolvedValue({ data: { id: "email_approved_123" }, error: null });

      const { sendQuoteApproved } = await import(
        "@/lib/email/templates/quote-approved"
      );

      const result = await sendQuoteApproved("cliente@example.com", {
        business_name: "Marcenaria X",
        quote_number: 42,
        customer_name: "João",
        quote_url: "https://orcafacil.com.br/orcamentos/42",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("email_approved_123");
      expect(result.error).toBeUndefined();
    });

    it("retorna { success: false, error: ... } ao simular erro da API", async () => {
      mockEmailsSend.mockResolvedValue({
        data: null,
        error: { message: "Invalid API key", name: "validation_error" },
      });

      const { sendQuoteApproved } = await import(
        "@/lib/email/templates/quote-approved"
      );

      const result = await sendQuoteApproved("cliente@example.com", {
        business_name: "Marcenaria X",
        quote_number: 42,
        customer_name: "João",
        quote_url: "https://orcafacil.com.br/orcamentos/42",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid API key");
      expect(result.id).toBeUndefined();
    });

    it("captura exceções lançadas pelo Resend e retorna { success: false }", async () => {
      mockEmailsSend.mockRejectedValue(new Error("Network timeout"));

      const { sendQuoteApproved } = await import(
        "@/lib/email/templates/quote-approved"
      );

      const result = await sendQuoteApproved("cliente@example.com", {
        business_name: "Marcenaria X",
        quote_number: 42,
        customer_name: "João",
        quote_url: "https://orcafacil.com.br/orcamentos/42",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network timeout");
    });
  });
});
