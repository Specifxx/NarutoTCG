import { archetypeColor, getArchetype, OTHER_COLOR } from "@/lib/data/archetypes";

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

/** Series id used for every archetype folded into "Other". */
export const OTHER_SERIES = "other";

export function seriesColor(id: string): string {
  return id === OTHER_SERIES ? OTHER_COLOR : archetypeColor(id);
}

export function seriesLabel(id: string, short = false): string {
  if (id === OTHER_SERIES) return "Other";
  const archetype = getArchetype(id);
  return archetype ? (short ? archetype.shortName : archetype.name) : id;
}
