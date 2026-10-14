import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@naruto-tcg/ui", "@naruto-tcg/types"],
  typedRoutes: true,
  poweredByHeader: false,
};

export default nextConfig;
