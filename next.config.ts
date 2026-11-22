import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const loopbackOrigins = Array.from(new Set([
  process.env.NEXT_PUBLIC_API_URL,
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL,
].flatMap(value => {
  if (!value) return [];
  try {
    const url = new URL(value);
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !url.username && !url.password ? [url.origin] : [];
  } catch { return []; }
})));
const localSources = loopbackOrigins.length ? ` ${loopbackOrigins.join(" ")}` : "";

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
  `img-src 'self' data: blob: https:${localSources}`,
  `media-src 'self' blob: https:${localSources}`,
  "font-src 'self' data:",
  `connect-src 'self' https:${localSources}${isProd ? "" : " ws: wss: http:"}`,
  "frame-src 'none'",
  "worker-src 'self' blob:",
  ...(isProd && !loopbackOrigins.length ? ["upgrade-insecure-requests"] : []),
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

// Every old dashboard address answers 308 with its new home (ui-unify/dashboard-variant/COVERAGE.md),
// in English and in Arabic (/ar). Specific rules first: Next uses the first match.
type Move = [from: string, to: string, query?: { key: string; value?: string }];
const MOVES: Move[] = [
  ["/dashboard/subscribers", "/dashboard/inbox?queue=renewals", { key: "tab", value: "renewals" }],
  ["/dashboard/subscribers", "/dashboard/money/plans", { key: "tab", value: "settings" }],
  ["/dashboard/subscribers/:path*", "/dashboard/money/owners/:path*"],
  ["/dashboard/subscribers", "/dashboard/money/owners"],
  ["/dashboard/places/:id/menu", "/dashboard/places/:id?tab=menu"],
  ["/dashboard/submissions", "/dashboard/places/submissions"],
  ["/dashboard/cities/:path*", "/dashboard/places/library/cities/:path*"],
  ["/dashboard/categories/:path*", "/dashboard/places/library/categories/:path*"],
  ["/dashboard/amenities", "/dashboard/places/library/features"],
  ["/dashboard/amenities/:path+", "/dashboard/places/library/features/amenities/:path+"],
  ["/dashboard/places/library/features/amenities", "/dashboard/places/library/features"],
  ["/dashboard/tags", "/dashboard/places/library/features?kind=keywords"],
  ["/dashboard/tags/:path+", "/dashboard/places/library/features/keywords/:path+"],
  ["/dashboard/places/library/features/keywords", "/dashboard/places/library/features?kind=keywords"],
  ["/dashboard/badges", "/dashboard/places/library/badges"],
  ["/dashboard/collections", "/dashboard/places/library/collections"],
  ["/dashboard/storefront/sections/new", "/dashboard/places/library/collections?add=section"],
  ["/dashboard/storefront/sections", "/dashboard/places/library/collections"],
  ["/dashboard/storefront", "/dashboard/settings/website"],
  ["/dashboard/places/library", "/dashboard/places/library/cities"],
  ["/dashboard/money", "/dashboard/money/owners"],
  // The seat products are gone (DIRECTION D2): their pages open the one Ads page.
  ...["campaigns", "results", "always-on", "placements", "inventory", "top-10", "shuffle/new"].map((seat): Move => [`/dashboard/ads/${seat}`, "/dashboard/money/ads"]),
  ["/dashboard/ads", "/dashboard/money/ads"],
  ["/dashboard/ads/:path*", "/dashboard/money/ads/:path*"],
  ["/dashboard/tourism/listers/:id", "/dashboard/marketplace/hosts/:id"],
  ["/dashboard/tourism", "/dashboard/marketplace"],
  ["/dashboard/analytics/search-terms/:path*", "/dashboard/numbers/searches/:path*"],
  ["/dashboard/analytics/keywords/new", "/dashboard/places/library/features/keywords/new"],
  ["/dashboard/analytics/keywords/:id", "/dashboard/places/library/features/keywords/:id"],
  ["/dashboard/analytics/:path*", "/dashboard/numbers/:path*"],
  ["/dashboard/insights", "/dashboard/numbers/people"],
  ["/dashboard/settings/change-password", "/dashboard/settings/password"],
  ["/dashboard/admins/:path*", "/dashboard/settings/team/:path*"],
];

const nextConfig: NextConfig = {

  output: 'standalone', // self-hosted container build  poweredByHeader: false,
  async redirects() {
    const moves = MOVES.flatMap(([from, to, query]) => ["", "/ar"].map((lang) => ({
      source: lang + from,
      destination: lang + to,
      permanent: true,
      ...(query ? { has: [{ type: "query" as const, ...query }] } : {}),
    })));
    // There is no /en prefix: English is the plain URL.
    return [...moves, { source: "/en/:path*", destination: "/:path*", permanent: true }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
