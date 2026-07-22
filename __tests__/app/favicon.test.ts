import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const publicDir = resolve(__dirname, "../../public");
const appDir = resolve(__dirname, "../../app");

describe("Favicon e ícones da marca", () => {
  describe("Arquivos estáticos em /public", () => {
    it("public/favicon.svg existe", () => {
      expect(existsSync(resolve(publicDir, "favicon.svg"))).toBe(true);
    });

    it("public/favicon-16x16.png existe", () => {
      expect(existsSync(resolve(publicDir, "favicon-16x16.png"))).toBe(true);
    });

    it("public/favicon-32x32.png existe", () => {
      expect(existsSync(resolve(publicDir, "favicon-32x32.png"))).toBe(true);
    });

    it("public/apple-touch-icon.png existe", () => {
      expect(existsSync(resolve(publicDir, "apple-touch-icon.png"))).toBe(true);
    });
  });

  describe("Conteúdo do SVG", () => {
    let svgContent: string;

    beforeEach(() => {
      svgContent = readFileSync(resolve(publicDir, "favicon.svg"), "utf-8");
    });

    it("SVG contém elementos de path/linha válidos", () => {
      const hasElements =
        svgContent.includes("<line") ||
        svgContent.includes("<path") ||
        svgContent.includes("<polyline") ||
        svgContent.includes("<polygon") ||
        svgContent.includes("<rect");
      expect(hasElements).toBe(true);
    });

    it("SVG usa a cor petróleo #2D5D5A para o esquadro", () => {
      const color = "#2D5D5A";
      expect(svgContent.toLowerCase()).toContain(color.toLowerCase());
    });

    it("SVG usa a cor terracota #C2703A para o check", () => {
      const color = "#C2703A";
      expect(svgContent.toLowerCase()).toContain(color.toLowerCase());
    });

    it("SVG tem viewBox definido", () => {
      expect(svgContent).toContain("viewBox");
    });
  });

  describe("Metadados de ícone em app/layout.tsx", () => {
    let layoutContent: string;

    beforeEach(() => {
      layoutContent = readFileSync(resolve(appDir, "layout.tsx"), "utf-8");
    });

    it("layout.tsx referencia /favicon.svg via metadata.icons", () => {
      expect(layoutContent).toContain("favicon.svg");
    });

    it("layout.tsx referencia /apple-touch-icon.png via metadata.icons", () => {
      expect(layoutContent).toContain("apple-touch-icon.png");
    });

    it("layout.tsx tem propriedade 'icons' no metadata", () => {
      expect(layoutContent).toContain("icons:");
    });
  });
});
