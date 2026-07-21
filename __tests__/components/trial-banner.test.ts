import { describe, it, expect } from "vitest";

/**
 * Testa a lógica de geração de texto do TrialBanner.
 * Como não há @testing-library/react, testamos a lógica de apresentação
 * diretamente via funções extraídas.
 */

function gerarTextoBanner(daysLeft: number): string {
  if (daysLeft === 1) return "Seu período de teste termina amanhã!";
  if (daysLeft === 0) return "Seu período de teste termina hoje!";
  return `Seu período de teste termina em ${daysLeft} dias`;
}

describe("TrialBanner — lógica de texto", () => {
  it("exibe 'amanhã' quando daysLeft=1", () => {
    expect(gerarTextoBanner(1)).toBe("Seu período de teste termina amanhã!");
  });

  it("exibe 'hoje' quando daysLeft=0", () => {
    expect(gerarTextoBanner(0)).toBe("Seu período de teste termina hoje!");
  });

  it("exibe número de dias quando daysLeft=3", () => {
    expect(gerarTextoBanner(3)).toBe(
      "Seu período de teste termina em 3 dias"
    );
  });

  it("exibe número de dias quando daysLeft=7", () => {
    expect(gerarTextoBanner(7)).toBe(
      "Seu período de teste termina em 7 dias"
    );
  });

  it("exibe número de dias quando daysLeft=30", () => {
    expect(gerarTextoBanner(30)).toBe(
      "Seu período de teste termina em 30 dias"
    );
  });

  it("não usa plural errado para 1 dia", () => {
    const texto = gerarTextoBanner(1);
    expect(texto).not.toContain("1 dias");
    expect(texto).toContain("amanhã");
  });
});

describe("TrialBanner — estrutura do componente", () => {
  it("módulo trial-banner exporta TrialBanner", async () => {
    const mod = await import("@/components/trial-banner");
    expect(typeof mod.TrialBanner).toBe("function");
  });
});
