import { describe, it, expect, vi, beforeEach } from "vitest";

// Usamos vi.hoisted para criar os mocks antes do hoisting de vi.mock
const { mockEmailsSend, mockResendInstance } = vi.hoisted(() => {
  const mockEmailsSend = vi.fn();
  const mockResendInstance = { emails: { send: mockEmailsSend } };
  return { mockEmailsSend, mockResendInstance };
});

// Mock do módulo resend — a factory é chamada no momento do hoist
vi.mock("resend", () => {
  // Usando uma função regular (não arrow) para que funcione como constructor
  function ResendMock() {
    return mockResendInstance;
  }
  return { Resend: ResendMock };
});

describe("lib/email/resend", () => {
  beforeEach(() => {
    mockEmailsSend.mockReset();
    vi.stubEnv("RESEND_API_KEY", "re_test_key_123");
  });

  describe("sendTrialReminder", () => {
    it("envia e-mail com sucesso e retorna { success: true, id }", async () => {
      mockEmailsSend.mockResolvedValue({ data: { id: "email_123" }, error: null });

      const { sendTrialReminder } = await import("@/lib/email/resend");

      const result = await sendTrialReminder("marceneiro@example.com", {
        business_name: "Madeirarte",
        quote_count: 5,
        days_left: 2,
        sign_up_url: "https://orcafacil.com.br/assinar",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("email_123");
      expect(result.error).toBeUndefined();
    });

    it("retorna erro descritivo quando Resend API falha (sem lançar exception)", async () => {
      mockEmailsSend.mockResolvedValue({
        data: null,
        error: { message: "Invalid API key", name: "validation_error" },
      });

      const { sendTrialReminder } = await import("@/lib/email/resend");

      const result = await sendTrialReminder("marceneiro@example.com", {
        business_name: "Madeirarte",
        quote_count: 3,
        days_left: 1,
        sign_up_url: "https://orcafacil.com.br/assinar",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid API key");
      expect(result.id).toBeUndefined();
    });

    it("captura exceções lançadas pelo Resend e retorna { success: false }", async () => {
      mockEmailsSend.mockRejectedValue(new Error("Network timeout"));

      const { sendTrialReminder } = await import("@/lib/email/resend");

      const result = await sendTrialReminder("marceneiro@example.com", {
        business_name: "Madeirarte",
        quote_count: 0,
        days_left: 3,
        sign_up_url: "https://orcafacil.com.br/assinar",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network timeout");
    });
  });

  describe("createResendClient", () => {
    it("lança erro quando RESEND_API_KEY não está configurada", async () => {
      vi.stubEnv("RESEND_API_KEY", "");

      const { createResendClient } = await import("@/lib/email/resend");

      expect(() => createResendClient()).toThrow("RESEND_API_KEY");
    });
  });
});
