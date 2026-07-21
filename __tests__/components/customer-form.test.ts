import { describe, it, expect } from "vitest";
import { formatPhoneBR } from "@/components/customer-form";

describe("formatPhoneBR", () => {
  it("retorna string vazia para entrada vazia", () => {
    expect(formatPhoneBR("")).toBe("");
  });

  it("formata número celular de 11 dígitos", () => {
    expect(formatPhoneBR("11999887766")).toBe("(11) 99988-7766");
  });

  it("formata número fixo de 10 dígitos", () => {
    expect(formatPhoneBR("1133334444")).toBe("(11) 3333-4444");
  });

  it("remove caracteres não numéricos antes de formatar", () => {
    expect(formatPhoneBR("(11) 99988-7766")).toBe("(11) 99988-7766");
  });

  it("retorna apenas dígitos para 2 dígitos", () => {
    expect(formatPhoneBR("11")).toBe("11");
  });

  it("formata parcialmente com DDD e início do número", () => {
    expect(formatPhoneBR("11999")).toBe("(11) 999");
  });

  it("limita a 11 dígitos ignorando excedentes", () => {
    expect(formatPhoneBR("119998877661234")).toBe("(11) 99988-7766");
  });
});
