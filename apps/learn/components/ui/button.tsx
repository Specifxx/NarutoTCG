import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "success" | "mist" | "energy" | "gold" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-chakra-400 to-chakra-600 text-shadow-950 shadow-[0_8px_24px_-8px_rgba(255,122,26,0.7)] hover:from-chakra-300 hover:to-chakra-500",
  secondary: "border border-white/10 bg-white/[0.06] text-ash-100 hover:border-white/20 hover:bg-white/10",
  ghost: "text-ash-300 hover:bg-white/5 hover:text-white",
  success:
    "bg-gradient-to-b from-leaf-400 to-leaf-600 text-shadow-950 shadow-[0_8px_24px_-8px_rgba(74,222,128,0.6)] hover:from-leaf-300 hover:to-leaf-500",
  mist: "bg-gradient-to-b from-mist-400 to-mist-600 text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,0.7)] hover:from-mist-300 hover:to-mist-500",
  energy:
    "bg-gradient-to-b from-energy-300 to-energy-500 text-shadow-950 shadow-[0_8px_24px_-8px_rgba(56,196,255,0.65)] hover:from-energy-200 hover:to-energy-400",
  gold: "bg-gradient-to-b from-gold-300 to-gold-500 text-shadow-950 shadow-[0_8px_24px_-8px_rgba(245,197,66,0.65)] hover:from-gold-200 hover:to-gold-400",
  danger: "border border-blood-400/40 bg-blood-500/15 text-blood-400 hover:bg-blood-500/25",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2.5 rounded-xl px-6 text-[15px]",
};

const SHINE =
  "before:pointer-events-none before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full";

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  const solid = variant !== "secondary" && variant !== "ghost" && variant !== "danger";
  return cn(
    "relative inline-flex select-none items-center justify-center overflow-hidden font-bold tracking-wide whitespace-nowrap transition duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-300 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950 disabled:pointer-events-none disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
    solid && SHINE,
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
