import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Security headers, same baseline as MiniRue's dashboard (security level Medium).
// frame-ancestors/object-src/base-uri/form-action are strict: they do not affect rendering.
// script-src still allows 'unsafe-inline' because the App Router injects inline hydration
// scripts; moving to a nonce-based script-src is the High-level follow-up. Dev adds
// 'unsafe-eval' + ws/http so HMR keeps working.
// connect-src allows https: because the dashboard still calls the API origin directly
// (NEXT_PUBLIC_API_URL); tighten to 'self' once API calls go through a same-origin proxy.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  // Place/city photos come from the storage and imgproxy hosts; uploads preview as blob:.
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https:${isProd ? "" : " ws: wss: http:"}`,
  "frame-src 'none'",
  "worker-src 'self' blob:",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // The admin UI is never indexed.
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
