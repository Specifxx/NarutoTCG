"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { MoveOption } from "./types";

const VARIANT: Record<MoveOption["variant"], { icon: IconName; on: string }> = {
  faceup: {
    icon: "play",
    on: "border-chakra-300/60 bg-gradient-to-b from-chakra-400 to-chakra-600 text-shadow-950 shadow-[0_6px_18px_-6px_rgba(255,122,26,0.8)] hover:from-chakra-300 hover:to-chakra-500",
  },
  hidden: {
    icon: "eye-off",
    on: "border-mist-300/60 bg-gradient-to-b from-mist-400 to-mist-600 text-white shadow-[0_6px_18px_-6px_rgba(139,92,246,0.85)] hover:from-mist-300 hover:to-mist-500",
  },
  upgrade: {
    icon: "layers",
    on: "border-gold-200/60 bg-gradient-to-b from-gold-300 to-gold-500 text-shadow-950 shadow-[0_6px_18px_-6px_rgba(245,197,66,0.8)] hover:from-gold-200 hover:to-gold-400",
  },
  reveal: {
    icon: "eye",
    on: "border-mist-300/60 bg-gradient-to-b from-mist-400 to-mist-600 text-white shadow-[0_6px_18px_-6px_rgba(139,92,246,0.85)] hover:from-mist-300 hover:to-mist-500",
  },
};

/**
 * A move on the board. Illegal moves stay focusable (aria-disabled) so their
 * reason can be read, hovered or tapped.
 */
export function MoveButton({
  option,
  onPerform,
  onBlocked,
  coached,
  compact,
}: {
  option: MoveOption;
  onPerform: (option: MoveOption) => void;
  onBlocked: (option: MoveOption) => void;
  coached?: boolean;
  compact?: boolean;
}) {
  const reasonId = useId();
  const v = VARIANT[option.variant];
  return (
    <motion.span
      layout="position"
      initial={{ opacity: 0, y: 6, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
      transition={{ type: "spring", stiffness: 480, damping: 30 }}
      className="flex min-w-0 flex-col items-center gap-0.5"
    >
      <button
        type="button"
        aria-disabled={!option.enabled || undefined}
        aria-describedby={option.enabled ? undefined : reasonId}
        title={option.reason ?? undefined}
        onClick={() => (option.enabled ? onPerform(option) : onBlocked(option))}
        className={cn(
          "relative inline-flex max-w-full items-center justify-center gap-1.5 overflow-hidden rounded-lg border font-bold whitespace-nowrap transition active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-300 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950",
          compact ? "h-7 px-2 text-[11px]" : "h-8 px-2.5 text-[12px]",
          option.enabled
            ? v.on
            : "cursor-not-allowed border-white/10 bg-white/[0.03] text-ash-500 hover:border-white/20",
          coached && option.enabled && "ring-2 ring-gold-300 ring-offset-2 ring-offset-shadow-950",
        )}
      >
        {coached && option.enabled && (
          <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-white/20" />
        )}
        <Icon name={option.enabled ? v.icon : "lock"} size={compact ? 12 : 13} className="relative shrink-0" />
        <span className="relative truncate">{option.label}</span>
      </button>
      {!option.enabled && option.short && (
        <span aria-hidden="true" className="max-w-full truncate text-[10px] font-semibold text-blood-400/90">
          {option.short}
        </span>
      )}
      {!option.enabled && (
        <span id={reasonId} className="sr-only">
          {option.reason ?? "Not available right now."}
        </span>
      )}
    </motion.span>
  );
}
