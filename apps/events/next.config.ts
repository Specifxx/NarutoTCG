import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@naruto-tcg/ui", "@naruto-tcg/types"],
  // Multi-zone: every zone emits /_next/*, so this zone's assets live under a unique
  // prefix the shared-origin proxy can route (see the root README).
  assetPrefix: "/events-static",
  async redirects() {
    return [
      // This zone owns /events, /stores, /store and /countdowns; the bare origin lands on the directory.
      { source: "/", destination: "/events", permanent: false },
      { source: "/stores/:slug", destination: "/store/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
