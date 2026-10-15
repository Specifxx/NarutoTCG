import type { Accent } from "@/content/schema";
import type { PuzzleDifficulty } from "@/lib/game/puzzle";

export interface DifficultyStyle {
  accent: Accent;
  /** 1–3 pips shown next to the badge. */
  level: 1 | 2 | 3;
  /** Solid pill classes. */
  badge: string;
  /** Text colour for headings and pips. */
  text: string;
  /** Tile glow colour (rgba) for hover light. */
  glow: string;
  blurb: string;
}

export const DIFFICULTY_STYLES: Record<PuzzleDifficulty, DifficultyStyle> = {
  Genin: {
    accent: "leaf",
    level: 1,
    badge: "border-leaf-400/40 bg-leaf-500/15 text-leaf-300",
    text: "text-leaf-300",
    glow: "rgba(74,222,128,0.28)",
    blurb: "One clean trick",
  },
  Chunin: {
    accent: "energy",
    level: 2,
    badge: "border-energy-400/40 bg-energy-500/15 text-energy-200",
    text: "text-energy-300",
    glow: "rgba(56,196,255,0.28)",
    blurb: "Sequencing matters",
  },
  Jonin: {
    accent: "blood",
    level: 3,
    badge: "border-blood-400/45 bg-blood-500/15 text-blood-400",
    text: "text-blood-400",
    glow: "rgba(239,64,96,0.3)",
    blurb: "Read the opponent",
  },
};
