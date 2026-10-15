"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

const STAR_PATH = "M12 2.6l2.85 6.03 6.6.8-4.87 4.53 1.26 6.54L12 17.3l-5.84 3.2 1.26-6.54L2.55 9.43l6.6-.8z";

export function StarGlyph({ filled, size = 16, className }: { filled: boolean; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <path
        d={STAR_PATH}
        fill={filled ? "#f5c542" : "none"}
        stroke={filled ? "#fdeaa8" : "currentColor"}
        strokeWidth={filled ? 0.8 : 1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Three-star rating. With `pop`, earned stars spring in one after another.
 */
export function StarRow({
  value,
  size = 16,
  pop = false,
  delay = 0,
  className,
  label,
}: {
  value: number;
  size?: number;
  pop?: boolean;
  delay?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label ?? `${value} of 3 stars`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {[0, 1, 2].map((i) => {
        const filled = i < value;
        return (
          <motion.span
            key={i}
            className={cn(
              "inline-flex",
              filled ? "drop-shadow-[0_0_6px_rgba(245,197,66,0.75)]" : "text-ash-500/60",
            )}
            initial={pop && filled ? { scale: 0, rotate: -120, opacity: 0 } : false}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 14, delay: pop ? delay + i * 0.22 : 0 }}
          >
            <StarGlyph filled={filled} size={size} />
          </motion.span>
        );
      })}
    </span>
  );
}
