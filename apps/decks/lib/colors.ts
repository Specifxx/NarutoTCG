/** Color helpers for data-bearing UI. Text never wears these colors; they fill marks only. */

const FAVORED = [57, 135, 229] as const; // #3987e5
const UNFAVORED = [230, 103, 103] as const; // #e66767
const EVEN = [56, 56, 53] as const; // #383835

/** Inks for text drawn on a fill: the darkest and lightest ink tokens. */
const DARK_INK = "#07070b";
const LIGHT_INK = "#ececf3";

const hex = (rgb: readonly number[]) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => v + (b[i]! - v) * t);

/** Distance from 50% inside which a matchup reads as Even (the Favored / Unfavored thresholds sit at 50% ± this). */
export const VERDICT_MARGIN = 0.03;
/** Tinted steps per arm of the diverging scale; each step spans {@link VERDICT_MARGIN} of win rate. */
export const DIVERGING_STEPS = 5;
/** Distance from 50% at which the diverging scale saturates (±15 points: the fifth step). */
export const DIVERGING_SATURATION = VERDICT_MARGIN * DIVERGING_STEPS;

/**
 * Where each tinted step sits between gray (0) and the full arm color (1). Linear, except the
 * favored arm's fourth step: at 0.8 its luminance (≈0.18) falls in the band where neither ink
 * reaches 4.5:1, so it is nudged lighter to take dark ink.
 */
const STEP_POSITIONS = {
  favored: [0.2, 0.4, 0.6, 0.85, 1],
  unfavored: [0.2, 0.4, 0.6, 0.8, 1],
} as const;

/**
 * Tinted step for a win rate, 1..{@link DIVERGING_STEPS}, signed (+ favored, − unfavored); 0 for
 * Even and for no data. Shares {@link winRateTone}'s thresholds, so gray means exactly "Even" and
 * the first tinted step starts at the Favored / Unfavored line. Each further 3 points is one step.
 */
export function divergingStep(winRate: number | null | undefined): number {
  const tone = winRateTone(winRate);
  if (tone !== "favored" && tone !== "unfavored") return 0;
  // The epsilon keeps values built by float arithmetic (0.35 + 8 × 0.03 = 0.5899…) in the bin they name.
  const step = Math.min(DIVERGING_STEPS, Math.max(1, Math.floor(Math.abs(winRate! - 0.5) / VERDICT_MARGIN + 1e-9)));
  return tone === "favored" ? step : -step;
}

/** Fill for a signed diverging step (see {@link divergingStep}): gray at 0. */
export function divergingStepFill(step: number): string {
  const size = Math.min(DIVERGING_STEPS, Math.abs(Math.trunc(step)));
  if (size === 0) return hex(EVEN);
  const arm = step > 0 ? "favored" : "unfavored";
  return hex(mix(EVEN, step > 0 ? FAVORED : UNFAVORED, STEP_POSITIONS[arm][size - 1]!));
}

/**
 * Diverging fill for a win rate: gray across the Even band (47–53%), then blue when favored and
 * red when unfavored, one step every 3 points, saturating at ±{@link DIVERGING_SATURATION}.
 * Stepped (5 bins per arm) so neighbors stay distinct.
 */
export function divergingFill(winRate: number | null): string {
  return divergingStepFill(divergingStep(winRate));
}

function luminance(fill: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(fill);
  if (!m) return null;
  const value = parseInt(m[1]!, 16);
  const channel = (shift: number) => {
    const c = ((value >> shift) & 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
}

/** WCAG contrast ratio between two hex colors (1..21); NaN when either is not a 6-digit hex. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return Number.NaN;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Readable ink for text drawn on top of a fill: whichever of the dark and light inks contrasts more. */
export function inkOn(fill: string): string {
  if (luminance(fill) === null) return LIGHT_INK;
  return contrastRatio(fill, DARK_INK) >= contrastRatio(fill, LIGHT_INK) ? DARK_INK : LIGHT_INK;
}

export type WinRateTone = "favored" | "even" | "unfavored" | "none";

/** Coarse verdict for a win rate: Favored at 53% or more, Unfavored at 47% or less, Even in between. */
export function winRateTone(winRate: number | null | undefined): WinRateTone {
  if (winRate === null || winRate === undefined || Number.isNaN(winRate)) return "none";
  if (winRate >= 0.5 + VERDICT_MARGIN) return "favored";
  if (winRate <= 0.5 - VERDICT_MARGIN) return "unfavored";
  return "even";
}
