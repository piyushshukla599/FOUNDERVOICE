import type { NextConfig } from "next";
import path from "path";

const apiTarget = process.env.API_REWRITE_TARGET || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  poweredByHeader: false,
  experimental: {
    middlewareClientMaxBodySize: "100mb",
    proxyClientMaxBodySize: "100mb",
  } as NextConfig["experimental"],
  async headers() {
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
