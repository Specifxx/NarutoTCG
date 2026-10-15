"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { STAGES } from "./types";

const STAR = "M12 2.4l2.86 5.98 6.54.84-4.8 4.53 1.22 6.5L12 17.07l-5.82 3.18 1.22-6.5-4.8-4.53 6.54-.84z";

/** A single star: gold and glowing when filled, a faint outline otherwise. */
export function StarGlyph({ filled, size = 18, className }: { filled: boolean; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn(filled ? "drop-shadow-[0_0_6px_rgba(245,197,66,0.75)]" : "text-white/20", className)}
    >
      <path
        d={STAR}
        fill={filled ? "#f5c542" : "none"}
        stroke={filled ? "#fdeaa8" : "currentColor"}
        strokeWidth={filled ? 1.1 : 1.5}
        strokeLinejoin="round"
      />
      {filled && <path d="M12 5.6l1.9 4 3.9.5" fill="none" stroke="#fff7d6" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />}
    </svg>
  );
}

/**
 * The three stage stars (Learn, Train, Test). Newly earned stars pop in.
 * Pass `hydrated={false}` to render neutral outlines before progress loads.
 */
export function StageStars({
  earned,
  hydrated,
  size = 18,
  labels = false,
  className,
}: {
  earned: readonly [boolean, boolean, boolean];
  hydrated: boolean;
  size?: number;
  /** Show the stage name under each star. */
  labels?: boolean;
  className?: string;
}) {
  const count = earned.filter(Boolean).length;
  const aria = hydrated
    ? `${count} of 3 stars: ${STAGES.map((s, i) => `${s.label} ${earned[i] ? "earned" : "not yet earned"}`).join(", ")}`
    : "Stars loading";
  return (
    <span role="img" aria-label={aria} className={cn("inline-flex items-center", labels ? "gap-2.5" : "gap-0.5", className)}>
      {earned.map((on, i) => {
        const lit = hydrated && on;
        return (
          <span key={STAGES[i]!.id} className="flex flex-col items-center gap-1">
            <motion.span
              className="flex"
              initial={false}
              animate={lit ? { scale: [0.4, 1.35, 1], rotate: [-40, 12, 0] } : { scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, delay: lit ? i * 0.08 : 0, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <StarGlyph filled={lit} size={size} />
            </motion.span>
            {labels && (
              <span className={cn("text-[9.5px] font-bold uppercase tracking-[0.14em]", lit ? "text-gold-300" : "text-ash-500")}>
                {STAGES[i]!.label}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
