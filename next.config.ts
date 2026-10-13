import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Embedded Postgres (local demo mode) ships WASM; keep it out of the bundler.
  serverExternalPackages: ["@electric-sql/pglite"],
  async headers() {
    const privateHeaders = [
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Cache-Control", value: "no-store" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Frame-Options", value: "DENY" },
    ];
    return ["/admin", "/admin/:path*", "/track/:path*", "/api/:path*", "/my-spot", "/unsubscribe"].map((source) => ({ source, headers: privateHeaders }));
  },
};

export default nextConfig;
