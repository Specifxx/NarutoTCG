import { CHART_COLORS, OTHER_COLOR } from "@/lib/data/archetypes";
import type { CostCurvePoint, DeckSectionKey } from "@/lib/decks/deck-utils";

/** Plot height, cost-label band included; the lazy plot's placeholder reserves exactly this. */
export const COST_CURVE_HEIGHT = 228;

export interface CostCurveSeries {
  key: DeckSectionKey;
  label: string;
  color: string;
}

/** Card-type series (not archetypes): fixed colors, stacked bottom to top in this order. */
export const COST_CURVE_SERIES: readonly CostCurveSeries[] = [
  { key: "character", label: "Characters", color: CHART_COLORS[0] },
  { key: "jutsu", label: "Jutsus", color: CHART_COLORS[1] },
  { key: "mission", label: "Missions", color: CHART_COLORS[2] },
  { key: "other", label: "Other", color: OTHER_COLOR },
];

/** Copies at one cost across the shown series. */
export const curveTotal = (point: CostCurvePoint, series: readonly CostCurveSeries[]) =>
  series.reduce((sum, s) => sum + point[s.key], 0);
