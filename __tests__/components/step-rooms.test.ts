import { describe, it, expect } from "vitest";
import { calcChapas, AREA_CHAPA_M2 } from "@/components/wizard/step-rooms";

describe("calcChapas", () => {
  it("retorna 0 quando área total é 0", () => {
    expect(calcChapas(0, 15)).toBe(0);
  });

  it("retorna 0 quando área total é negativa", () => {
    expect(calcChapas(-1, 15)).toBe(0);
  });

  it("retorna 1 para exatamente uma chapa sem desperdício", () => {
    expect(calcChapas(AREA_CHAPA_M2, 0)).toBe(1);
  });

  it("arredonda para cima quando área excede levemente uma chapa", () => {
    expect(calcChapas(AREA_CHAPA_M2 + 0.0001, 0)).toBe(2);
  });

  it("calcula corretamente com 15% de desperdício para 10 m²", () => {
    // 10 / (5.0325 * 0.85) = 10 / 4.277625 ≈ 2.337 → ceil = 3
    const resultado = calcChapas(10, 15);
    expect(resultado).toBe(Math.ceil(10 / (AREA_CHAPA_M2 * 0.85)));
    expect(resultado).toBe(3);
  });

  it("retorna 1 para área menor que a chapa sem desperdício", () => {
    expect(calcChapas(1, 0)).toBe(1);
  });

  it("lida com 100% de desperdício (areaUtil tende a zero) — retorna Infinity via ceil", () => {
    // Com 100% de desperdício, areaUtil = 0 → divisão por zero → resultado não é 0
    const resultado = calcChapas(1, 100);
    expect(resultado).toBe(Infinity);
  });

  it("calcula corretamente com 20% de desperdício para 5 m²", () => {
    // 5 / (5.0325 * 0.80) = 5 / 4.026 ≈ 1.242 → ceil = 2
    const resultado = calcChapas(5, 20);
    expect(resultado).toBe(Math.ceil(5 / (AREA_CHAPA_M2 * 0.80)));
  });

  it("retorna número inteiro sempre (tipo number)", () => {
    const resultado = calcChapas(7.5, 10);
    expect(Number.isInteger(resultado)).toBe(true);
  });

  it("constante AREA_CHAPA_M2 tem o valor correto (2.75 * 1.83)", () => {
    expect(AREA_CHAPA_M2).toBeCloseTo(5.0325, 4);
  });
});
