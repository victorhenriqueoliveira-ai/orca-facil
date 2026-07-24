import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Force Vercel to include the Chromium binary in the PDF route's Lambda bundle.
  // Without this, @sparticuz/chromium/bin is excluded and executablePath() fails.
  outputFileTracingIncludes: {
    "/api/quotes/[id]/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
  },
};

export default nextConfig;
