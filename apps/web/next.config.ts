import type { NextConfig } from "next";
import path from "path";

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
    // makes, so it is derived rather than written out by hand.
    const api = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
    const connect = ["'self'", api].filter(Boolean).join(" ");

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
      "media-src 'self' blob:",
      "font-src 'self' data:",
      `connect-src ${connect}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
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
