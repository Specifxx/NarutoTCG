import { CHART } from "@/components/charts/chart-theme";

/** Axis tick text in muted ink. */
export const AXIS_TICK = { fill: CHART.tick, fontSize: CHART.fontSize } as const;

/** Category labels that name things (archetypes) read one step stronger than numeric ticks. */
export const CATEGORY_TICK = { fill: CHART.inkSecondary, fontSize: CHART.fontSize } as const;

/** Hover band behind the active category: a ghost wash, never a color. */
export const HOVER_CURSOR = { fill: "rgba(255, 255, 255, 0.04)" } as const;

/** Field share in the field-vs-top-cut chart: a muted gray from the ink ramp. */
export const FIELD_FILL = "#6e6e85";
/** Top-cut share: the chakra accent. */
export const TOP_CUT_FILL = "#ff7a1a";

/** 0.25 → "25%" (axis ticks). */
export function percentTick(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Smallest multiple of `step` at or above `value` (at least one step). */
export function niceCeil(value: number, step = 0.05): number {
  return Math.max(step, Math.ceil((value - 1e-9) / step) * step);
}
