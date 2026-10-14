import type { Accent } from "@/content/schema";

export interface AccentStyle {
  /** Text colour for headings and icons. */
  text: string;
  /** Soft tinted background. */
  softBg: string;
  /** Solid background for pills and badges. */
  solidBg: string;
  border: string;
  ring: string;
  /** Coloured drop-shadow glow. */
  glow: string;
  /** Gradient stops for `bg-gradient-to-*`. */
  gradient: string;
  /** Hex values for SVG and particles: [light, base, deep]. */
  hex: [string, string, string];
}

export const ACCENT_STYLES: Record<Accent, AccentStyle> = {
  gold: {
    text: "text-gold-300",
    softBg: "bg-gold-400/10",
    solidBg: "bg-gold-400 text-shadow-950",
    border: "border-gold-400/40",
    ring: "ring-gold-400/60",
    glow: "shadow-[0_0_32px_-6px_rgba(245,197,66,0.6)]",
    gradient: "from-gold-200 via-gold-400 to-gold-600",
    hex: ["#fdeaa8", "#f5c542", "#a16207"],
  },
  energy: {
    text: "text-energy-300",
    softBg: "bg-energy-400/10",
    solidBg: "bg-energy-400 text-shadow-950",
    border: "border-energy-400/40",
    ring: "ring-energy-400/60",
    glow: "shadow-[0_0_32px_-6px_rgba(56,196,255,0.6)]",
    gradient: "from-energy-200 via-energy-400 to-energy-600",
    hex: ["#cdf3ff", "#38c4ff", "#0369a1"],
  },
  mist: {
    text: "text-mist-300",
    softBg: "bg-mist-500/10",
    solidBg: "bg-mist-500 text-white",
    border: "border-mist-400/40",
    ring: "ring-mist-400/60",
    glow: "shadow-[0_0_32px_-6px_rgba(139,92,246,0.65)]",
    gradient: "from-mist-200 via-mist-400 to-mist-600",
    hex: ["#ddd6fe", "#8b5cf6", "#6d28d9"],
  },
  blood: {
    text: "text-blood-400",
    softBg: "bg-blood-500/10",
    solidBg: "bg-blood-500 text-white",
    border: "border-blood-400/40",
    ring: "ring-blood-400/60",
    glow: "shadow-[0_0_32px_-6px_rgba(239,64,96,0.6)]",
    gradient: "from-chakra-300 via-blood-400 to-blood-600",
    hex: ["#ffa95c", "#ef4060", "#8f0f20"],
  },
  chakra: {
    text: "text-chakra-300",
    softBg: "bg-chakra-500/10",
    solidBg: "bg-chakra-500 text-shadow-950",
    border: "border-chakra-400/40",
    ring: "ring-chakra-400/60",
    glow: "shadow-[0_0_32px_-6px_rgba(255,122,26,0.6)]",
    gradient: "from-chakra-200 via-chakra-400 to-chakra-600",
    hex: ["#ffd8b0", "#ff7a1a", "#c44700"],
  },
  leaf: {
    text: "text-leaf-300",
    softBg: "bg-leaf-500/10",
    solidBg: "bg-leaf-500 text-shadow-950",
    border: "border-leaf-400/40",
    ring: "ring-leaf-400/60",
    glow: "shadow-[0_0_32px_-6px_rgba(74,222,128,0.55)]",
    gradient: "from-leaf-300 via-leaf-500 to-leaf-600",
    hex: ["#86efac", "#22c55e", "#15803d"],
  },
};

/** Particle colour sets for FX components. */
export const FX_COLORS = {
  chakra: ["#fff1e3", "#ffa95c", "#ff7a1a", "#f25c00"],
  energy: ["#ffffff", "#cdf3ff", "#7ddcff", "#38c4ff", "#0ea5e9"],
  mist: ["#ffffff", "#ddd6fe", "#a78bfa", "#8b5cf6"],
  gold: ["#fff7d6", "#fdeaa8", "#f5c542", "#d9a514"],
  leaf: ["#ecfdf5", "#86efac", "#4ade80", "#22c55e"],
  blood: ["#ffd8b0", "#ef4060", "#c0182d"],
} as const;
export type FxPalette = keyof typeof FX_COLORS;
