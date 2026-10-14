"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { XpFeedback } from "@/components/layout/xp-feedback";
import { ProgressProvider } from "@/lib/progress";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ProgressProvider>
        {children}
        <XpFeedback />
      </ProgressProvider>
    </MotionConfig>
  );
}
