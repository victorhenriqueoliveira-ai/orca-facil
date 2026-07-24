import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // Include Chromium brotli files for all API routes so they are available at runtime.
  // The bin directory is excluded by Vercel's file-tracing heuristic; this forces inclusion.
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
