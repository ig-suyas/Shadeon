import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // The embedded development database ships WebAssembly; let Node load it directly.
  serverExternalPackages: ["@electric-sql/pglite"],
  cacheComponents: true,
  partialPrefetching: true,
  // Do not advertise the framework in every response.
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // The largest form is a few kilobytes of text; refuse anything far bigger.
      bodySizeLimit: "64kb",
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders(process.env.NODE_ENV === "development") },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
