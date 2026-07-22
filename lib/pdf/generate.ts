/**
 * Geração de PDF via Puppeteer + @sparticuz/chromium.
 * Detecção automática de ambiente: dev vs produção.
 */

function devChromePath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }
  // Linux (CI, Docker)
  return "/usr/bin/google-chrome-stable";
}

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  // Dynamic imports to avoid issues in environments where these aren't available
  const puppeteer = await import("puppeteer-core");
  const chromium = await import("@sparticuz/chromium");

  const executablePath =
    process.env.NODE_ENV === "production"
      ? await chromium.default.executablePath()
      : devChromePath();

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
