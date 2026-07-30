import { describe, it, expect } from "vitest";
import { diasDesdeAtualizacao, precoDesatualizado } from "@/lib/catalog/price-alert";

describe("diasDesdeAtualizacao", () => {
  it("retorna 999 quando price_updated_at é null", () => {
    expect(diasDesdeAtualizacao(null)).toBe(999);
  });

  it("retorna 999 quando price_updated_at é undefined", () => {
    expect(diasDesdeAtualizacao(undefined)).toBe(999);
  });

  it("retorna 999 quando price_updated_at é string inválida", () => {
    expect(diasDesdeAtualizacao("invalid-date")).toBe(999);
  });

  it("retorna 0 para timestamp de agora", () => {
    const agora = new Date().toISOString();
    expect(diasDesdeAtualizacao(agora)).toBe(0);
  });

  it("retorna 61 para timestamp de 61 dias atrás", () => {
    const sessentaEUmDiasAtras = new Date(Date.now() - 61 * 86400000).toISOString();
    expect(diasDesdeAtualizacao(sessentaEUmDiasAtras)).toBe(61);
  });

  it("retorna 59 para timestamp de 59 dias atrás", () => {
    const cinquentaENoveDiasAtras = new Date(Date.now() - 59 * 86400000).toISOString();
    expect(diasDesdeAtualizacao(cinquentaENoveDiasAtras)).toBe(59);
  });

  it("retorna 60 para timestamp de exatamente 60 dias atrás", () => {
    const sessentaDiasAtras = new Date(Date.now() - 60 * 86400000).toISOString();
    expect(diasDesdeAtualizacao(sessentaDiasAtras)).toBe(60);
  });
});

describe("precoDesatualizado", () => {
  it("retorna true para item com price_updated_at null (sem data)", () => {
    expect(precoDesatualizado(null, 60)).toBe(true);
  });

  it("retorna true quando diasDesde >= priceAlertDays (61 dias, threshold 60)", () => {
    const sessentaEUmDiasAtras = new Date(Date.now() - 61 * 86400000).toISOString();
    expect(precoDesatualizado(sessentaEUmDiasAtras, 60)).toBe(true);
  });

  it("retorna true quando diasDesde === priceAlertDays (60 dias, threshold 60)", () => {
    const sessentaDiasAtras = new Date(Date.now() - 60 * 86400000).toISOString();
    expect(precoDesatualizado(sessentaDiasAtras, 60)).toBe(true);
  });

  it("retorna false quando diasDesde < priceAlertDays (59 dias, threshold 60)", () => {
    const cinquentaENoveDiasAtras = new Date(Date.now() - 59 * 86400000).toISOString();
    expect(precoDesatualizado(cinquentaENoveDiasAtras, 60)).toBe(false);
  });

  it("retorna false para item atualizado hoje", () => {
    const agora = new Date().toISOString();
    expect(precoDesatualizado(agora, 60)).toBe(false);
  });

  it("respeita threshold customizado (30 dias)", () => {
    const trintaEUmDiasAtras = new Date(Date.now() - 31 * 86400000).toISOString();
    expect(precoDesatualizado(trintaEUmDiasAtras, 30)).toBe(true);

    const vinteENoveDiasAtras = new Date(Date.now() - 29 * 86400000).toISOString();
    expect(precoDesatualizado(vinteENoveDiasAtras, 30)).toBe(false);
  });
});
