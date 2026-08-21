import type { NextConfig } from "next";
import path from "path";
import { PRIVATE_ROUTES } from "./src/lib/private-routes";

const apiTarget = process.env.API_REWRITE_TARGET || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Lets a production build run without fighting a live `next dev` over .next:
  //   NEXT_DIST_DIR=.next-build npm run build
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  experimental: {
    middlewareClientMaxBodySize: "100mb",
  } as NextConfig["experimental"],
  async headers() {
    // The browser has to be allowed to reach the API, and that origin is only
    // known at build time. Getting this wrong blocks every request the app
    // makes, so it is derived rather than written out by hand. Falling back to
    // the rewrite target rather than to nothing matters: an unset variable
    // used to produce a policy that silently blocked the whole app.
    const api = (process.env.NEXT_PUBLIC_API_BASE || apiTarget).replace(/\/$/, "");
    // On a loopback API both spellings have to be listed. The client follows
    // whichever host the page was opened on so that the workspace cookie is
    // same-site (see resolveBase in lib/api.ts), and CSP is generated here at
    // build time, long before anyone knows which one that will be.
    const origins = new Set([api]);
    try {
      const parsed = new URL(api);
      if (/^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) {
        for (const host of ["localhost", "127.0.0.1"]) {
          parsed.hostname = host;
          origins.add(parsed.origin);
        }
      }
    } catch {
      /* a malformed base is left as the single entry above */
    }
    const fromApi = ["'self'", ...origins].filter(Boolean).join(" ");

    // 'unsafe-inline' for scripts is unavoidable without threading a nonce
    // through every response: the App Router inlines its hydration payload.
    // The policy still confines scripts, frames and form posts to this origin,
    // which is what stops an injected third-party script from exfiltrating.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // blob: covers the recorder's own audio; data: covers inlined icons.
      "img-src 'self' data: blob:",
      // The API origin belongs here as well as in connect-src. Playback is an
      // <audio src> pointed straight at FastAPI, not a fetch, and media-src is
      // what governs that - leaving it at 'self' blocked every recording from
      // playing back with no network request and no error anyone could read.
      `media-src ${fromApi} blob:`,
      "font-src 'self' data:",
      `connect-src ${fromApi}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

    return [
      // Keep the per-user screens out of search results with a header rather
      // than a robots.txt `Disallow` line - see src/lib/private-routes.ts for
      // why that distinction decides whether it works at all. Two entries per
      // route because `/x/:path*` matches the children but not `/x` itself.
      ...PRIVATE_ROUTES.map((route) => ({ source: route, headers: noindex })),
      ...PRIVATE_ROUTES.map((route) => ({
        source: `${route}/:path*`,
        headers: noindex,
      })),
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
  async rewrites() {
    // Optional proxy when browser calls same-origin /api — primary client uses NEXT_PUBLIC_API_BASE.
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
