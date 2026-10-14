"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger" | "hidden";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-chakra-400 to-chakra-500 text-shadow-950 shadow-[0_0_0_1px_rgba(255,160,92,0.5),0_8px_24px_-10px_rgba(255,122,26,0.8)] hover:from-chakra-300 hover:to-chakra-400",
  secondary: "border border-white/10 bg-shadow-800/80 text-ash-100 hover:border-chakra-400/50 hover:text-ash-50",
  ghost: "text-ash-300 hover:bg-white/5 hover:text-ash-50",
  danger: "border border-blood-500/40 bg-blood-500/10 text-blood-400 hover:bg-blood-500/20",
  hidden: "border border-yin-400/40 bg-yin-500/10 text-yin-400 hover:bg-yin-500/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-md px-2.5 text-[11px]",
  md: "h-10 gap-2 rounded-lg px-3.5 text-xs",
  lg: "h-12 gap-2.5 rounded-xl px-5 text-sm",
};

export function Btn({
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex select-none items-center justify-center font-display font-semibold uppercase tracking-[0.12em] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400/70 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
