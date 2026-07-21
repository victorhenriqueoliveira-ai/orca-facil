/**
 * Geração de PDF via Puppeteer + @sparticuz/chromium.
 * Detecção automática de ambiente: dev vs produção.
 */

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  // Dynamic imports to avoid issues in environments where these aren't available
  const puppeteer = await import("puppeteer-core");
  const chromium = await import("@sparticuz/chromium");

  const executablePath =
    process.env.NODE_ENV === "production"
      ? await chromium.default.executablePath()
      : process.env.PUPPETEER_EXECUTABLE_PATH ?? "/usr/bin/google-chrome-stable";

  const browser = await puppeteer.default.launch({
    args: chromium.default.args,
    executablePath,
    headless: chromium.default.headless as boolean | "new",
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        bottom: "10mm",
        left: "10mm",
        right: "10mm",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
