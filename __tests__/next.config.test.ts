import { describe, it, expect } from "vitest";
import nextConfig from "@/next.config";

describe("next.config.ts", () => {
  it("contém a propriedade serverExternalPackages", () => {
    expect(nextConfig).toHaveProperty("serverExternalPackages");
  });

  it("inclui @sparticuz/chromium nos serverExternalPackages", () => {
    expect(nextConfig.serverExternalPackages).toContain("@sparticuz/chromium");
  });

  it("inclui puppeteer-core nos serverExternalPackages", () => {
    expect(nextConfig.serverExternalPackages).toContain("puppeteer-core");
  });
});
