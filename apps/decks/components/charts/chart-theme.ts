import { archetypeColor, OTHER_COLOR } from "@/lib/data/archetypes";
import { OTHER_SERIES_ID } from "@/lib/meta/share";

export { chartSeriesIds, seriesIdFor, seriesLabel } from "@/lib/meta/share";

/** Chart chrome for the dark surface. Marks carry color; text uses the ink tokens. */
export const CHART = {
  surface: "#0d0d14",
  grid: "#1f1f2e",
  axis: "#2a2a3d",
  tick: "#8d8da3",
  inkPrimary: "#ececf3",
  inkSecondary: "#b3b3c4",
  fontSize: 12,
  /** Bars never exceed this thickness. */
  maxBarSize: 24,
  /** Rounded data-end radius; baselines stay square. */
  radius: 4,
  /** Surface-colored gap between touching fills. */
  gap: 2,
} as const;

/** Fill for a chart series: the archetype's fixed slot color, or the neutral "Other" color. */
export function seriesColor(seriesId: string): string {
  return seriesId === OTHER_SERIES_ID ? OTHER_COLOR : archetypeColor(seriesId);
}
