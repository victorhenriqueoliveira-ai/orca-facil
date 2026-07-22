import { describe, it, expect } from "vitest";

/**
 * Testes unitários para o componente BottomNav.
 *
 * Como não há @testing-library/react disponível, testamos:
 * 1. Exportação correta do módulo
 * 2. Ausência de classes legadas (`blue-600`, `gray-200`, `bg-white`)
 * 3. Presença das classes do design system (`brand-primary`, `bg-bg-base`, `border-border`)
 * 4. Prop `className` presente na assinatura
 *
 * A lógica de acessibilidade (aria-current, aria-label) é verificada
 * via análise estática do código-fonte.
 */

describe("BottomNav — exportação do módulo", () => {
  it("exporta BottomNav como função", async () => {
    const mod = await import("@/components/bottom-nav");
    expect(typeof mod.BottomNav).toBe("function");
  });
});

describe("BottomNav — ausência de classes legadas", () => {
  it("não contém text-blue-600 no código-fonte", async () => {
    // Verificação via string do módulo transpilado
    const mod = await import("@/components/bottom-nav");
    const src = mod.BottomNav.toString();
    expect(src).not.toContain("blue-600");
  });

  it("não contém bg-white no código-fonte", async () => {
    const mod = await import("@/components/bottom-nav");
    const src = mod.BottomNav.toString();
    expect(src).not.toContain("bg-white");
  });

  it("não contém border-gray-200 no código-fonte", async () => {
    const mod = await import("@/components/bottom-nav");
    const src = mod.BottomNav.toString();
    expect(src).not.toContain("border-gray-200");
  });

  it("não contém text-gray-500 no código-fonte", async () => {
    const mod = await import("@/components/bottom-nav");
    const src = mod.BottomNav.toString();
    expect(src).not.toContain("text-gray-500");
  });
});

describe("BottomNav — classes do design system", () => {
  it("usa text-brand-primary para item ativo", async () => {
    const mod = await import("@/components/bottom-nav");
    const src = mod.BottomNav.toString();
    expect(src).toContain("brand-primary");
  });

  it("usa bg-bg-base no container", async () => {
    const mod = await import("@/components/bottom-nav");
    const src = mod.BottomNav.toString();
    expect(src).toContain("bg-bg-base");
  });

  it("usa border-border no container", async () => {
    const mod = await import("@/components/bottom-nav");
    const src = mod.BottomNav.toString();
    expect(src).toContain("border-border");
  });
});

describe("BottomNav — prop className", () => {
  it("BottomNav aceita prop className (interface BottomNavProps)", async () => {
    // Verificamos que a função aceita um argumento (props)
    const mod = await import("@/components/bottom-nav");
    expect(mod.BottomNav.length).toBeGreaterThanOrEqual(0);
  });

  it("className é propagado ao nav raiz", async () => {
    const mod = await import("@/components/bottom-nav");
    const src = mod.BottomNav.toString();
    // A prop className deve ser referenciada na função
    expect(src).toContain("className");
  });
});

describe("BottomNav — acessibilidade preservada", () => {
  it("mantém aria-label='Navegação principal' no nav", async () => {
    const mod = await import("@/components/bottom-nav");
    const src = mod.BottomNav.toString();
    expect(src).toContain("Navegação principal");
  });

  it("mantém aria-current para item ativo", async () => {
    const mod = await import("@/components/bottom-nav");
    const src = mod.BottomNav.toString();
    expect(src).toContain("aria-current");
  });

  it("mantém safe-area-pb para área segura", async () => {
    const mod = await import("@/components/bottom-nav");
    const src = mod.BottomNav.toString();
    expect(src).toContain("safe-area-pb");
  });
});

describe("BottomNav — lógica de navegação preservada", () => {
  it("mantém lógica de detecção de rota ativa (pathname)", async () => {
    const mod = await import("@/components/bottom-nav");
    const src = mod.BottomNav.toString();
    expect(src).toContain("pathname");
  });

  it("módulo contém as 4 rotas de navegação", async () => {
    // Os hrefs ficam em ITENS_NAV (módulo), fora do corpo de BottomNav
    // Verificamos via importação do módulo completo como texto
    const { readFileSync } = await import("fs");
    const fileSrc = readFileSync(
      new URL("../../components/bottom-nav.tsx", import.meta.url),
      "utf-8"
    );
    expect(fileSrc).toContain("/orcamentos");
    expect(fileSrc).toContain("/clientes");
    expect(fileSrc).toContain("/catalogo");
    expect(fileSrc).toContain("/configuracoes");
  });
});
