import type { FxPalette } from "@/lib/accents";
import type { GameAction, Side } from "@/lib/game/types";

/** One way to play the selected card (or reveal the selected hidden unit). */
export interface MoveOption {
  key: string;
  action: GameAction;
  variant: "faceup" | "hidden" | "upgrade" | "reveal";
  /** Button text, e.g. "Play face-up · 4". */
  label: string;
  cost: number;
  enabled: boolean;
  /** Full reason from the rules engine when the move is illegal. */
  reason: string | null;
  /** Compact reason shown under a disabled button. */
  short: string | null;
}

/** A burst on a unit, fired whenever `seq` grows. */
export interface UnitFx {
  seq: number;
  palette: FxPalette;
  /** Floating label such as "+2". */
  float?: string;
}

/** A burst in one side of a lane (used when a unit there is defeated). */
export interface LaneFx {
  seq: number;
  side: Side;
}

/** What the solution walkthrough wants you to look at next. */
export interface CoachTarget {
  cardId?: string;
  missionId?: string;
  uid?: string;
  pass?: boolean;
  actionKey: string;
}

export type FeedbackTone = "info" | "good" | "warn" | "opp";

export interface Feedback {
  tone: FeedbackTone;
  text: string;
}

/** Turns the engine's reasons into a few words for under a disabled button. */
export function shortReason(reason: string): string {
  const needs = reason.match(/needs (\d+)/);
  if (reason.startsWith("Not enough Chakra")) return needs ? `Needs ${needs[1]} Chakra` : "Not enough Chakra";
  if (reason.startsWith("You already have")) return "Same name already here";
  if (reason.startsWith("Reveal a hidden")) return "Reveal it first";
  if (reason.startsWith("An upgrade must have a higher")) return "Cost must be higher";
  if (reason.startsWith("An upgrade must share")) return "Different name";
  if (reason.startsWith("It is not your turn")) return "Not your turn";
  if (reason.startsWith("You already passed")) return "You passed";
  return reason;
}
