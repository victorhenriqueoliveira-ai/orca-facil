/**
 * Geração de PDF via Puppeteer + @sparticuz/chromium.
 * Em produção usa @sparticuz/chromium (serverless).
 * Em dev usa o Chrome local do sistema operacional.
 */

const isProd = process.env.NODE_ENV === "production";

async function launchBrowser() {
  const puppeteer = await import("puppeteer-core");

  if (isProd) {
    const chromium = await import("@sparticuz/chromium");
    // If CHROMIUM_PACK_URL is set (or if the local bin is missing), download the
    // brotli pack from GitHub releases and cache it in /tmp.  This avoids relying
    // on Vercel's file-tracing to include the binary in the Lambda bundle.
    const packUrl =
      process.env.CHROMIUM_PACK_URL ??
      "https://github.com/Sparticuz/chromium/releases/download/v147.0.0/chromium-v147.0.0-pack.tar";
    const executablePath = await chromium.default.executablePath(packUrl);
    // @sparticuz/chromium@147+ already includes --headless='shell' in args.
    // Passing headless:true would add --headless=new (conflict). Use 'shell' instead.
    return puppeteer.default.launch({
      args: chromium.default.args,
      executablePath,
      headless: "shell",
    });
  }

  // Dev: usa Chrome local (sem args serverless que causam conflito)
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ??
    (process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "/usr/bin/google-chrome-stable");

  return puppeteer.default.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
