import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const layoutPath = resolve(__dirname, "../../../app/(app)/layout.tsx");
let layoutContent: string;

beforeEach(() => {
  layoutContent = readFileSync(layoutPath, "utf-8");
});

/**
 * Testes unitários para app/(app)/layout.tsx — task_09
 * Valida integração responsiva de Sidebar + BottomNav no layout.
 */
describe("app/(app)/layout.tsx — Layout responsivo Sidebar + BottomNav", () => {
  describe("Importações", () => {
    it("importa Sidebar de @/components/sidebar", () => {
      expect(layoutContent).toContain("@/components/sidebar");
      expect(layoutContent).toMatch(/import.*Sidebar.*from/);
    });

    it("importa BottomNav de @/components/bottom-nav", () => {
      expect(layoutContent).toContain("@/components/bottom-nav");
      expect(layoutContent).toMatch(/import.*BottomNav.*from/);
    });

    it("mantém import de SubscriptionProvider", () => {
      expect(layoutContent).toContain("SubscriptionProvider");
    });

    it("mantém import de TrialBanner", () => {
      expect(layoutContent).toContain("TrialBanner");
    });
  });

  describe("Sidebar responsiva", () => {
    it("renderiza <Sidebar> com className contendo 'hidden lg:flex'", () => {
      expect(layoutContent).toContain("hidden lg:flex");
      expect(layoutContent).toMatch(/<Sidebar[^>]*hidden lg:flex[^>]*>/);
    });

    it("renderiza <Sidebar> com className contendo 'w-64'", () => {
      expect(layoutContent).toContain("w-64");
    });

    it("renderiza <Sidebar> com className contendo 'shrink-0'", () => {
      expect(layoutContent).toContain("shrink-0");
    });
  });

  describe("BottomNav responsiva", () => {
    it("renderiza <BottomNav> com className contendo 'lg:hidden'", () => {
      expect(layoutContent).toMatch(/<BottomNav[^>]*lg:hidden[^>]*>/);
    });

    it("BottomNav está dentro do container filho (coluna de conteúdo)", () => {
      // Verifica que BottomNav vem depois do <main> no arquivo
      const mainIndex = layoutContent.indexOf("<main");
      const bottomNavIndex = layoutContent.indexOf("<BottomNav");
      expect(mainIndex).toBeGreaterThan(-1);
      expect(bottomNavIndex).toBeGreaterThan(mainIndex);
    });
  });

  describe("Estrutura flex responsiva", () => {
    it("container raiz tem classe 'flex'", () => {
      expect(layoutContent).toContain("flex min-h-screen");
    });

    it("container raiz tem classe 'bg-bg-base'", () => {
      expect(layoutContent).toContain("bg-bg-base");
    });

    it("container filho tem classe 'min-w-0' para prevenir overflow", () => {
      expect(layoutContent).toContain("min-w-0");
    });

    it("container filho tem classe 'flex-1' para ocupar espaço restante", () => {
      expect(layoutContent).toContain("flex-1");
    });
  });

  describe("Padding do <main>", () => {
    it("<main> tem classe 'pb-16' para mobile (espaço para bottom nav)", () => {
      expect(layoutContent).toMatch(/<main[^>]*pb-16[^>]*>/);
    });

    it("<main> tem classe 'lg:pb-0' para remover padding em desktop", () => {
      expect(layoutContent).toMatch(/<main[^>]*lg:pb-0[^>]*>/);
    });

    it("<main> tem padding padrão 'p-4' para mobile", () => {
      expect(layoutContent).toMatch(/<main[^>]*p-4[^>]*>/);
    });

    it("<main> tem padding desktop 'lg:p-8'", () => {
      expect(layoutContent).toMatch(/<main[^>]*lg:p-8[^>]*>/);
    });
  });

  describe("Lógica de autenticação preservada", () => {
    it("chama getUser() do supabase", () => {
      expect(layoutContent).toContain("getUser()");
    });

    it("redireciona para /login quando usuário não autenticado", () => {
      expect(layoutContent).toContain('redirect("/login")');
    });

    it("chama getSubscriptionStatus com user.id", () => {
      expect(layoutContent).toContain("getSubscriptionStatus(user.id)");
    });

    it("SubscriptionProvider envolve todo o conteúdo", () => {
      const providerOpenIndex = layoutContent.indexOf("<SubscriptionProvider");
      const providerCloseIndex = layoutContent.lastIndexOf(
        "</SubscriptionProvider>"
      );
      const sidebarIndex = layoutContent.indexOf("<Sidebar");
      const mainIndex = layoutContent.indexOf("<main");
      const bottomNavIndex = layoutContent.indexOf("<BottomNav");

      expect(providerOpenIndex).toBeGreaterThan(-1);
      expect(providerCloseIndex).toBeGreaterThan(-1);
      // Sidebar, main e BottomNav estão todos dentro do SubscriptionProvider
      expect(sidebarIndex).toBeGreaterThan(providerOpenIndex);
      expect(sidebarIndex).toBeLessThan(providerCloseIndex);
      expect(mainIndex).toBeGreaterThan(providerOpenIndex);
      expect(mainIndex).toBeLessThan(providerCloseIndex);
      expect(bottomNavIndex).toBeGreaterThan(providerOpenIndex);
      expect(bottomNavIndex).toBeLessThan(providerCloseIndex);
    });
  });

  describe("TrialBanner preservado", () => {
    it("TrialBanner é renderizado condicionalmente para status 'trial'", () => {
      expect(layoutContent).toContain('"trial"');
      expect(layoutContent).toContain("TrialBanner");
      expect(layoutContent).toContain("daysLeft");
    });

    it("TrialBanner está no container filho (não desloca a sidebar)", () => {
      const sidebarIndex = layoutContent.indexOf("<Sidebar");
      // Usa indexOf para a tag JSX <TrialBanner (não o import)
      const trialBannerJsxIndex = layoutContent.indexOf("<TrialBanner");
      // TrialBanner aparece depois da Sidebar no JSX (está no container filho)
      expect(trialBannerJsxIndex).toBeGreaterThan(sidebarIndex);
    });
  });

  describe("Comportamento responsivo — análise de classes CSS", () => {
    it("Sidebar é ocultada em mobile via 'hidden'", () => {
      // A sidebar usa 'hidden lg:flex' — hidden para mobile, flex para lg+
      expect(layoutContent).toContain("hidden lg:flex");
    });

    it("BottomNav é ocultada em desktop via 'lg:hidden'", () => {
      // BottomNav usa 'lg:hidden' — visível mobile, oculta em lg+
      expect(layoutContent).toContain("lg:hidden");
    });

    it("sidebar e bottom nav usam classes mutuamente exclusivas (lg breakpoint)", () => {
      // hidden lg:flex → mobile: hidden, desktop: visible
      // lg:hidden → mobile: visible, desktop: hidden
      // São mutuamente exclusivas no breakpoint lg
      expect(layoutContent).toContain("hidden lg:flex");
      expect(layoutContent).toContain("lg:hidden");
    });
  });
});

/**
 * Testes de integração — lógica de layout responsivo.
 * Como o ambiente de teste é Node (sem DOM), validamos a estrutura JSX via análise de texto.
 */
describe("app/(app)/layout.tsx — Integração viewport responsiva (análise estrutural)", () => {
  it("em viewport 1440px: sidebar visível (hidden lg:flex aplica flex), bottom nav oculta (lg:hidden)", () => {
    // Sidebar: className="hidden lg:flex w-64 shrink-0" → em lg+: display flex
    expect(layoutContent).toContain("hidden lg:flex");
    // BottomNav: className="lg:hidden" → em lg+: display none
    expect(layoutContent).toContain("lg:hidden");
  });

  it("em viewport 375px: sidebar oculta (hidden), bottom nav visível (lg:hidden não aplica)", () => {
    // Sidebar: hidden lg:flex → em mobile: display none
    expect(layoutContent).toContain("hidden lg:flex");
    // BottomNav: lg:hidden → em mobile: visível (lg:hidden não tem efeito abaixo de lg)
    expect(layoutContent).toContain("lg:hidden");
  });

  it("em viewport 1024px: sidebar visível e conteúdo sem overflow horizontal", () => {
    // min-w-0 no container filho previne overflow
    expect(layoutContent).toContain("min-w-0");
    // flex no container raiz
    expect(layoutContent).toContain("flex min-h-screen");
  });

  it("usuário não autenticado é redirecionado para /login", () => {
    expect(layoutContent).toContain('redirect("/login")');
    expect(layoutContent).toContain("if (!user)");
  });
});
