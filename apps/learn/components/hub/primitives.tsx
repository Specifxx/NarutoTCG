"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Eyebrow → heavy title → muted description, revealed once on scroll. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  eyebrowClassName = "text-chakra-300",
  aside,
}: {
  id: string;
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  eyebrowClassName?: string;
  aside?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 140, damping: 20 }}
      className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0 max-w-2xl">
        <p className={cn("eyebrow flex items-center gap-2.5", eyebrowClassName)}>
          <span aria-hidden="true" className="h-px w-8 bg-gradient-to-r from-transparent to-current" />
          {eyebrow}
        </p>
        <h2 id={id} className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          {title}
        </h2>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-ash-400 sm:text-base">{description}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </motion.div>
  );
}

/** Shimmering placeholder shown until saved progress has loaded. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block animate-shimmer rounded-md bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.13),rgba(255,255,255,0.04))] bg-[length:200%_100%] align-middle",
        className,
      )}
    />
  );
}

/** Five-point star used for lesson stars. */
export function StarGlyph({ filled, size = 14, className }: { filled: boolean; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn(
        filled ? "text-gold-300 drop-shadow-[0_0_6px_rgba(245,197,66,0.75)]" : "text-white/20",
        "transition-colors duration-500",
        className,
      )}
    >
      <path
        d="M12 2.6l2.83 5.98 6.55.8-4.83 4.52 1.25 6.5L12 17.2l-5.8 3.2 1.25-6.5L2.62 9.38l6.55-.8z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Thin progress bar with a spring fill and a travelling shine. */
export function ProgressBar({
  value,
  className,
  fillClassName = "from-chakra-300 to-chakra-500",
  label,
  shine = true,
}: {
  /** 0..1 */
  value: number;
  className?: string;
  fillClassName?: string;
  label?: string;
  shine?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <span
      role={label ? "progressbar" : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? Math.round(pct) : undefined}
      aria-hidden={label ? undefined : true}
      className={cn("relative block h-1.5 overflow-hidden rounded-full bg-white/[0.07]", className)}
    >
      <motion.span
        className={cn("absolute inset-y-0 left-0 block rounded-full bg-gradient-to-r", fillClassName)}
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 90, damping: 20 }}
      >
        {shine && pct > 0 && (
          <span className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent_30%,rgba(255,255,255,0.45)_50%,transparent_70%)] bg-[length:200%_100%]" />
        )}
      </motion.span>
    </span>
  );
}
