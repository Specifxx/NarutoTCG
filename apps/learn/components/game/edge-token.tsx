"use client";

import { motion } from "framer-motion";
import { Emblem } from "@/components/ui/emblem";
import { cn } from "@/lib/cn";

/**
 * The Edge token coin. Give two instances the same `layoutId` (only one
 * rendered at a time) to animate the token flying between players.
 */
export function EdgeToken({ size = 44, layoutId, className, spin = true }: { size?: number; layoutId?: string; className?: string; spin?: boolean }) {
  return (
    <motion.span
      layoutId={layoutId}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-200 via-gold-400 to-gold-600 text-shadow-950 ring-2 ring-gold-200/60 shadow-[0_0_24px_rgba(245,197,66,0.65)]",
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Edge token"
    >
      <span className="absolute inset-[3px] rounded-full border border-shadow-950/25" />
      <span className={cn("relative", spin && "animate-spin-slow")}>
        <Emblem name="edge" size={size * 0.7} />
      </span>
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute -inset-y-2 -left-1/2 w-1/3 rotate-12 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)] bg-[length:200%_100%]" />
      </span>
    </motion.span>
  );
}
