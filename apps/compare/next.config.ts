import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { warnMissingAppUrls } from "@naruto-tcg/ui/nav";

// Anti-framing and sniffing headers only: a script CSP would need per-request nonces for Next's inline scripts.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) warnMissingAppUrls();
  return {
    transpilePackages: ["@naruto-tcg/ui", "@naruto-tcg/types"],
    poweredByHeader: false,
    async headers() {
      return [{ source: "/(.*)", headers: securityHeaders }];
    },
  };
}
