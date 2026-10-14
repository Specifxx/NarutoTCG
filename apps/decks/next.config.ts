import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@naruto-tcg/ui", "@naruto-tcg/types"],
  // Lets parallel QA runs build into separate folders, e.g. NEXT_DIST_DIR=.next-qa next dev.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
