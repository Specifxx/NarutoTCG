import type { FxPalette } from "@/lib/accents";
import type { EmblemName, Side } from "@/lib/game/types";

export interface SideStyle {
  label: string;
  title: string;
  text: string;
  soft: string;
  border: string;
  ring: string;
  /** Gradient stops for avatars and power pills. */
  solid: string;
  bar: string;
  palette: FxPalette;
  emblem: EmblemName;
}

/** You are blue chakra energy; the rival burns red. */
export const SIDE_STYLE: Record<Side, SideStyle> = {
  you: {
    label: "You",
    title: "Kage of the Leaf",
    text: "text-energy-300",
    soft: "bg-energy-500/10",
    border: "border-energy-400/35",
    ring: "ring-energy-400/50",
    solid: "from-energy-300 to-energy-600",
    bar: "from-energy-600 via-energy-400 to-energy-200",
    palette: "energy",
    emblem: "leaf",
  },
  opp: {
    label: "Rival",
    title: "Rival Kage",
    text: "text-blood-400",
    soft: "bg-blood-500/10",
    border: "border-blood-400/35",
    ring: "ring-blood-400/50",
    solid: "from-chakra-300 to-blood-500",
    bar: "from-blood-400 via-blood-500 to-blood-600",
    palette: "blood",
    emblem: "cloud",
  },
};

export const EDGE_LAYOUT_ID = "edge-duel-token";
