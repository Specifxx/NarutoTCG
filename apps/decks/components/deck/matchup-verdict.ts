import { CHART } from "@/components/charts/chart-theme";
import { divergingFill, inkOn, winRateTone, type WinRateTone } from "@/lib/colors";
import { formatPercent, pluralize } from "@/lib/format";
import { formatRecord } from "@/lib/tournament/standings";
import type { MatchupEntry } from "./types";

/** Verdicts, numbers and chip colors for the matchup strategy guide. Pure. */

/** The most-played opponents whose accordions start open. */
export const OPEN_MATCHUPS = 3;

export const VERDICT_LABEL: Record<WinRateTone, string> = {
  favored: "Favored",
  even: "Even",
  unfavored: "Unfavored",
  none: "No data",
};

export interface MatchupVerdict {
  tone: WinRateTone;
  label: string;
  /** True when there are games, but fewer than the matrix minimum. */
  lowSample: boolean;
}

/** Favored / Even / Unfavored from the win rate; "No data" without games. */
export function matchupVerdict(entry: Pick<MatchupEntry, "winRate" | "games" | "lowSample">): MatchupVerdict {
  const tone = entry.games > 0 ? winRateTone(entry.winRate) : "none";
  return { tone, label: VERDICT_LABEL[tone], lowSample: entry.games > 0 && entry.lowSample };
}

/** "62.5% over 24 games (15-9)", or "No games recorded". */
export function matchupNumbers(entry: Pick<MatchupEntry, "winRate" | "games" | "record">): string {
  if (entry.games === 0) return "No games recorded";
  return `${formatPercent(entry.winRate)} over ${pluralize(entry.games, "game")} (${formatRecord(entry.record)})`;
}

/** "48–74%", the 95% interval on the win rate; null without one. */
export function formatInterval(interval: readonly [number, number] | null): string | null {
  if (!interval) return null;
  return `${(interval[0] * 100).toFixed(0)}–${formatPercent(interval[1], 0)}`;
}

const LOW_SAMPLE_DIM = 0.5;

function mixHex(from: string, to: string, t: number): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const a = parse(from);
  const b = parse(to);
  return `#${a.map((v, i) => Math.round(v + (b[i]! - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Diverging fill and readable ink for a win-rate chip. Low-sample chips are pulled halfway toward
 * the surface so they read as tentative; the UI also labels them, so color is never the only cue.
 */
export function winRateChipColors(winRate: number | null, lowSample: boolean): { background: string; color: string } {
  const base = divergingFill(winRate);
  const background = lowSample ? mixHex(base, CHART.surface, LOW_SAMPLE_DIM) : base;
  return { background, color: inkOn(background) };
}
