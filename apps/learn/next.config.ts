import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Learn app is its own zone: every route lives under /learn
  // (/learn/how-to-play, /learn/puzzles, /learn/keywords).
  basePath: "/learn",
  transpilePackages: ["@naruto-tcg/ui", "@naruto-tcg/types"],
  async redirects() {
    return [{ source: "/", destination: "/learn", basePath: false, permanent: false }];
  },
};

export default nextConfig;
