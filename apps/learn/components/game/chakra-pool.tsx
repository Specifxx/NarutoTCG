"use client";

import { AnimatePresence, motion } from "framer-motion";
import { forwardRef } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Emblem } from "@/components/ui/emblem";
import { cn } from "@/lib/cn";

/** Chakra counter with a row of pips. Forward the ref to aim particle flights at it. */
export const ChakraPool = forwardRef<
  HTMLDivElement,
  { value: number; max?: number; label?: string; className?: string; size?: "sm" | "md" }
>(function ChakraPool({ value, max, label = "Chakra", className, size = "md" }, ref) {
  const pips = Math.max(value, max ?? 0, 0);
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-xl border border-energy-400/25 bg-energy-900/30 shadow-[inset_0_0_18px_rgba(14,165,233,0.15)]",
        size === "md" ? "px-3 py-2" : "px-2 py-1.5",
        className,
      )}
      aria-label={`${label}: ${value}${max !== undefined ? ` of ${max}` : ""}`}
      role="status"
    >
      <span className="text-energy-300 drop-shadow-[0_0_8px_rgba(56,196,255,0.9)]">
        <Emblem name="chakra" size={size === "md" ? 22 : 18} />
      </span>
      <div className="flex flex-col">
        <span className="eyebrow !text-[9px] text-energy-300/80">{label}</span>
        <span className={cn("font-black leading-none tabular-nums text-white", size === "md" ? "text-xl" : "text-base")}>
          <AnimatedNumber value={value} />
          {max !== undefined && <span className="text-sm font-bold text-ash-500"> / {max}</span>}
        </span>
      </div>
      {pips > 0 && pips <= 14 && (
        <div className="ml-1 hidden max-w-[120px] flex-wrap gap-1 sm:flex" aria-hidden="true">
          <AnimatePresence initial={false}>
            {Array.from({ length: pips }, (_, i) => (
              <motion.span
                key={i}
                layout
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-colors",
                  i < value
                    ? "bg-gradient-to-br from-energy-200 to-energy-500 shadow-[0_0_6px_rgba(56,196,255,0.9)]"
                    : "border border-energy-400/30 bg-transparent",
                )}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
});
