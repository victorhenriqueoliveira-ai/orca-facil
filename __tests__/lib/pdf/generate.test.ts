import { describe, it, expect, vi, beforeEach } from "vitest";

// ----------------------------------------------------------------
// Mocks — MUST be before import of generate.ts
// ----------------------------------------------------------------

const mockClose = vi.fn().mockResolvedValue(undefined);
const mockPdf = vi.fn().mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])); // %PDF
const mockSetContent = vi.fn().mockResolvedValue(undefined);
const mockNewPage = vi.fn().mockResolvedValue({
  setContent: mockSetContent,
  pdf: mockPdf,
});
const mockLaunch = vi.fn().mockResolvedValue({
  newPage: mockNewPage,
  close: mockClose,
});

vi.mock("puppeteer-core", () => ({
  default: {
    launch: mockLaunch,
  },
}));

vi.mock("@sparticuz/chromium", () => ({
  default: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: vi.fn().mockResolvedValue("/usr/bin/chromium"),
    headless: true,
  },
}));

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("generatePdfFromHtml", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLaunch.mockResolvedValue({
      newPage: mockNewPage,
      close: mockClose,
    });
    mockNewPage.mockResolvedValue({
      setContent: mockSetContent,
      pdf: mockPdf,
    });
    mockPdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
  });

  it("retorna um Buffer", async () => {
    const { generatePdfFromHtml } = await import("@/lib/pdf/generate");
    const result = await generatePdfFromHtml("<html><body>Test</body></html>");
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("chama puppeteer.launch com os args corretos", async () => {
    const { generatePdfFromHtml } = await import("@/lib/pdf/generate");
    await generatePdfFromHtml("<html></html>");

    expect(mockLaunch).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining(["--no-sandbox"]),
      })
    );
  });

  it("chama page.setContent com o HTML fornecido", async () => {
    const { generatePdfFromHtml } = await import("@/lib/pdf/generate");
    const html = "<html><body>Orçamento Teste</body></html>";
    await generatePdfFromHtml(html);

    expect(mockSetContent).toHaveBeenCalledWith(html, { waitUntil: "networkidle0" });
  });

  it("chama page.pdf com formato A4 e printBackground true", async () => {
    const { generatePdfFromHtml } = await import("@/lib/pdf/generate");
    await generatePdfFromHtml("<html></html>");

    expect(mockPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "A4",
        printBackground: true,
      })
    );
  });

  it("sempre fecha o browser, mesmo se houver erro", async () => {
    mockNewPage.mockResolvedValue({
      setContent: vi.fn().mockRejectedValue(new Error("page error")),
      pdf: mockPdf,
    });

    const { generatePdfFromHtml } = await import("@/lib/pdf/generate");

    await expect(generatePdfFromHtml("<html></html>")).rejects.toThrow("page error");
    expect(mockClose).toHaveBeenCalled();
  });
});
