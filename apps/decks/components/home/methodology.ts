import { formatNumber, formatPercent } from "@/lib/format";
import { TIER_CONFIG } from "@/lib/meta/config";
import type { TierConfig } from "@/lib/meta/types";

export interface MethodologyPoint {
  title: string;
  body: string;
}

/** The overview's methodology teaser, with every constant read from the tier config. */
export function methodologyPoints(config: TierConfig = TIER_CONFIG): MethodologyPoint[] {
  const { priorMatches, minEntries, minShare, weights, thresholds } = config;
  const pct = (value: number) => formatPercent(value, 0);
  return [
    {
      title: "Win rate",
      body: "Non-mirror matches only. Byes and intentional draws are left out and a draw counts as half a win.",
    },
    {
      title: "Small samples",
      body: `Each win rate is blended with ${formatNumber(priorMatches)} pseudo-games at 50%, so one hot weekend cannot top the list.`,
    },
    {
      title: "Tier score",
      body: `${pct(weights.winRate)} adjusted win rate, ${pct(weights.conversion)} top-cut conversion lift and ${pct(weights.presence)} meta share, each on a fixed 0–100 scale.`,
    },
    {
      title: "Tiers",
      body: `S from ${formatNumber(thresholds.S)}, A from ${formatNumber(thresholds.A)}, B from ${formatNumber(thresholds.B)}, C below. Under ${formatNumber(minEntries)} entries or ${pct(minShare)} meta share stays unranked.`,
    },
  ];
}
