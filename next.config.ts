import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal self-contained server (.next/standalone) for small,
  // fast-booting Docker images.
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // The host dashboard now lives under /host. Keep old /dashboard links and
  // bookmarks working.
  async redirects() {
    return [
      { source: "/dashboard", destination: "/host", permanent: true },
      { source: "/dashboard/:path*", destination: "/host/:path*", permanent: true },
      { source: "/reviews", destination: "/review", permanent: false },
      { source: "/reviews/:path*", destination: "/review", permanent: false },
    ];
  },
};

export default nextConfig;
