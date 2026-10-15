"use client";

import { motion } from "framer-motion";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { svgId } from "./types";

/** Circular progress gauge with a gradient stroke that springs to `value` (0..1). */
export function ProgressRing({
  value,
  size = 160,
  stroke = 10,
  colors = ["#fdeaa8", "#f5c542", "#ff7a1a"],
  label,
  className,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  /** Gradient stops: [start, middle, end]. */
  colors?: readonly [string, string, string];
  /** Accessible description; the centre content is then hidden from assistive tech. */
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  const id = svgId(useId());
  const r = (size - stroke) / 2;
  const c = size / 2;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="55%" stopColor={colors[1]} />
            <stop offset="100%" stopColor={colors[2]} />
          </linearGradient>
        </defs>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1}
          strokeDasharray="1 7"
          transform={`translate(${c} ${c}) scale(0.82) translate(${-c} ${-c})`}
        />
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={`url(#${id}-ring)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: v, opacity: v > 0 ? 1 : 0 }}
          transition={{ pathLength: { type: "spring", stiffness: 50, damping: 16 }, opacity: { duration: 0.3 } }}
          style={{ filter: `drop-shadow(0 0 6px ${colors[1]}99)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden={label ? true : undefined}>
        {children}
      </div>
    </div>
  );
}
