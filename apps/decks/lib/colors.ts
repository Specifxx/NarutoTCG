/** Color helpers for data-bearing UI. Text never wears these colors; they fill marks only. */

const FAVORED = [57, 135, 229] as const; // #3987e5
const UNFAVORED = [230, 103, 103] as const; // #e66767
const EVEN = [56, 56, 53] as const; // #383835

const hex = (rgb: readonly number[]) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => v + (b[i]! - v) * t);

/** Distance from 50% at which the diverging scale saturates. */
export const DIVERGING_SATURATION = 0.15;

/**
 * Diverging fill for a win rate: gray at 50%, blue when favored, red when unfavored,
 * saturating at ±{@link DIVERGING_SATURATION}. Stepped in 5 bins per arm so neighbors stay distinct.
 */
export function divergingFill(winRate: number | null): string {
  if (winRate === null || Number.isNaN(winRate)) return hex(EVEN);
  const distance = Math.min(1, Math.abs(winRate - 0.5) / DIVERGING_SATURATION);
  const step = Math.round(distance * 5) / 5;
  return hex(mix(EVEN, winRate >= 0.5 ? FAVORED : UNFAVORED, step));
}

/** Readable ink (light or dark) for text drawn on top of a fill. */
export function inkOn(fill: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(fill);
  if (!m) return "#ececf3";
  const value = parseInt(m[1]!, 16);
  const channel = (shift: number) => {
    const c = ((value >> shift) & 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
  return luminance > 0.22 ? "#07070b" : "#ececf3";
}

export type WinRateTone = "favored" | "even" | "unfavored" | "none";

/** Coarse verdict for a win rate: within ±3 points of 50% reads as even. */
export function winRateTone(winRate: number | null | undefined): WinRateTone {
  if (winRate === null || winRate === undefined || Number.isNaN(winRate)) return "none";
  if (winRate >= 0.53) return "favored";
  if (winRate <= 0.47) return "unfavored";
  return "even";
}
