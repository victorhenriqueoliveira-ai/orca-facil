import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Testes para o componente CatalogRegionalOnboarding e função shouldShowCatalogOnboarding.
 * Como o projeto não usa @testing-library/react, testamos a lógica exportável diretamente.
 */

// ----------------------------------------------------------------
// shouldShowCatalogOnboarding
// ----------------------------------------------------------------

describe("shouldShowCatalogOnboarding", () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string): string | null => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; }),
    };
  })();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it("retorna true quando localStorage não tem a chave de skip", async () => {
    const { shouldShowCatalogOnboarding } = await import(
      "@/components/catalog-regional-onboarding"
    );
    localStorageMock.getItem.mockReturnValue(null);
    expect(shouldShowCatalogOnboarding()).toBe(true);
  });

  it("retorna false quando localStorage tem catalog_onboarding_skipped=true", async () => {
    const { shouldShowCatalogOnboarding } = await import(
      "@/components/catalog-regional-onboarding"
    );
    localStorageMock.getItem.mockReturnValue("true");
    expect(shouldShowCatalogOnboarding()).toBe(false);
  });

  it("retorna true quando localStorage tem outro valor (não 'true')", async () => {
    const { shouldShowCatalogOnboarding } = await import(
      "@/components/catalog-regional-onboarding"
    );
    localStorageMock.getItem.mockReturnValue("false");
    expect(shouldShowCatalogOnboarding()).toBe(true);
  });

  it("retorna true quando localStorage lança exceção (modo privado)", async () => {
    const { shouldShowCatalogOnboarding } = await import(
      "@/components/catalog-regional-onboarding"
    );
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(shouldShowCatalogOnboarding()).toBe(true);
  });
});

// ----------------------------------------------------------------
// Exportações do módulo
// ----------------------------------------------------------------

describe("catalog-regional-onboarding — módulo", () => {
  it("exporta CatalogRegionalOnboarding como função (componente React)", async () => {
    vi.resetModules();
    const mod = await import("@/components/catalog-regional-onboarding");
    expect(typeof mod.CatalogRegionalOnboarding).toBe("function");
  });

  it("exporta shouldShowCatalogOnboarding como função", async () => {
    vi.resetModules();
    const mod = await import("@/components/catalog-regional-onboarding");
    expect(typeof mod.shouldShowCatalogOnboarding).toBe("function");
  });
});
