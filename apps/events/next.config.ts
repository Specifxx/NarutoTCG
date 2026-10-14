import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@naruto-tcg/ui", "@naruto-tcg/types"],
  async redirects() {
    return [
      // This zone owns /events, /stores, /store and /countdowns; the bare origin lands on the directory.
      { source: "/", destination: "/events", permanent: false },
      { source: "/stores/:slug", destination: "/store/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
