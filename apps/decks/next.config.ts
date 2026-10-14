import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { warnMissingAppUrls } from "@naruto-tcg/ui/nav";

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) warnMissingAppUrls();
  return {
    transpilePackages: ["@naruto-tcg/ui", "@naruto-tcg/types"],
  };
}
