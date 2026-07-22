import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const globalsPath = resolve(__dirname, "../../app/globals.css");
const globalsContent = readFileSync(globalsPath, "utf-8");

describe("globals.css — Identidade Visual Orca Fácil", () => {
  describe("Tokens de cor da identidade visual", () => {
    it("contém o token --color-brand-primary com valor #C2703A", () => {
      expect(globalsContent).toContain("--color-brand-primary: #C2703A");
    });

    it("contém o token --color-brand-support com valor #2D5D5A", () => {
      expect(globalsContent).toContain("--color-brand-support: #2D5D5A");
    });

    it("contém o token --color-bg-base com valor #FAF7F2", () => {
      expect(globalsContent).toContain("--color-bg-base: #FAF7F2");
    });

    it("contém o token --color-text-base com valor #2B2621", () => {
      expect(globalsContent).toContain("--color-text-base: #2B2621");
    });

    it("contém o token --color-border com valor #E5DDD3", () => {
      expect(globalsContent).toContain("--color-border: #E5DDD3");
    });

    it("contém o token --color-success com valor #4A7C59", () => {
      expect(globalsContent).toContain("--color-success: #4A7C59");
    });

    it("contém o token --color-warning com valor #D4A017", () => {
      expect(globalsContent).toContain("--color-warning: #D4A017");
    });

    it("contém o token --color-error com valor #B3403A", () => {
      expect(globalsContent).toContain("--color-error: #B3403A");
    });
  });

  describe("Token de fonte", () => {
    it("contém o token --font-sans referenciando var(--font-manrope)", () => {
      expect(globalsContent).toContain("--font-sans: var(--font-manrope)");
    });
  });

  describe("Tokens originais preservados", () => {
    it("mantém a variável --background no :root", () => {
      expect(globalsContent).toContain("--background: #ffffff");
    });

    it("mantém a variável --foreground no :root", () => {
      expect(globalsContent).toContain("--foreground: #171717");
    });

    it("mantém --color-background no bloco @theme inline", () => {
      expect(globalsContent).toContain("--color-background: var(--background)");
    });

    it("mantém --color-foreground no bloco @theme inline", () => {
      expect(globalsContent).toContain("--color-foreground: var(--foreground)");
    });
  });

  describe("Remoção de font-family Arial", () => {
    it("não contém font-family: Arial no seletor body", () => {
      expect(globalsContent).not.toContain("font-family: Arial");
    });
  });

  describe("Bloco @theme com comentário identificador", () => {
    it("contém comentário 'Identidade Orca Fácil' para documentação", () => {
      expect(globalsContent).toContain("Identidade Orca Fácil");
    });
  });
});
