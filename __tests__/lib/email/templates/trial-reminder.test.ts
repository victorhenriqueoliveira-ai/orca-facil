import { describe, it, expect } from "vitest";
import { buildTrialReminderHtml } from "@/lib/email/templates/trial-reminder";

describe("lib/email/templates/trial-reminder", () => {
  describe("buildTrialReminderHtml", () => {
    it("inclui o nome da marcenaria no HTML", () => {
      const html = buildTrialReminderHtml({
        business_name: "Madeirarte",
        quote_count: 5,
        days_left: 2,
        sign_up_url: "https://orcafacil.com.br/assinar",
      });

      expect(html).toContain("Madeirarte");
    });

    it("inclui a contagem de orçamentos no HTML", () => {
      const html = buildTrialReminderHtml({
        business_name: "Madeirarte",
        quote_count: 5,
        days_left: 2,
        sign_up_url: "https://orcafacil.com.br/assinar",
      });

      expect(html).toContain("5");
    });

    it("inclui os dias restantes no HTML", () => {
      const html = buildTrialReminderHtml({
        business_name: "Madeirarte",
        quote_count: 5,
        days_left: 2,
        sign_up_url: "https://orcafacil.com.br/assinar",
      });

      expect(html).toContain("2 dias");
    });

    it("inclui os três valores: business_name, quote_count e days_left", () => {
      const html = buildTrialReminderHtml({
        business_name: "Madeirarte",
        quote_count: 5,
        days_left: 2,
        sign_up_url: "https://orcafacil.com.br/assinar",
      });

      expect(html).toContain("Madeirarte");
      expect(html).toContain("5");
      expect(html).toContain("2 dias");
    });

    it("inclui o link para assinar", () => {
      const signUpUrl = "https://orcafacil.com.br/assinar";
      const html = buildTrialReminderHtml({
        business_name: "Marcenaria Teste",
        quote_count: 3,
        days_left: 1,
        sign_up_url: signUpUrl,
      });

      expect(html).toContain(signUpUrl);
    });

    it("usa 'Marceneiro' como fallback quando business_name é null", () => {
      const html = buildTrialReminderHtml({
        business_name: null,
        quote_count: 0,
        days_left: 3,
        sign_up_url: "https://orcafacil.com.br/assinar",
      });

      expect(html).toContain("Marceneiro");
    });

    it("formata '1 dia' corretamente no singular", () => {
      const html = buildTrialReminderHtml({
        business_name: "Madeira & Arte",
        quote_count: 10,
        days_left: 1,
        sign_up_url: "https://orcafacil.com.br/assinar",
      });

      expect(html).toContain("1 dia");
      expect(html).not.toContain("1 dias");
    });

    it("exibe mensagem especial quando quote_count é 0", () => {
      const html = buildTrialReminderHtml({
        business_name: "Novo Marceneiro",
        quote_count: 0,
        days_left: 2,
        sign_up_url: "https://orcafacil.com.br/assinar",
      });

      expect(html).toContain("ainda não criou orçamentos");
    });

    it("exibe mensagem no singular quando quote_count é 1", () => {
      const html = buildTrialReminderHtml({
        business_name: "Marcenaria Solo",
        quote_count: 1,
        days_left: 2,
        sign_up_url: "https://orcafacil.com.br/assinar",
      });

      expect(html).toContain("1 orçamento");
    });

    it("retorna HTML válido com DOCTYPE", () => {
      const html = buildTrialReminderHtml({
        business_name: "Qualquer Marcenaria",
        quote_count: 7,
        days_left: 3,
        sign_up_url: "https://orcafacil.com.br/assinar",
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
    });
  });
});
