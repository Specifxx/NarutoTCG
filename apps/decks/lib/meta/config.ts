import type { EventTier } from "@naruto-tcg/types";
import type { TierConfig, TierId } from "@/lib/meta/types";

/**
 * Tier list tuning. The composite score blends a shrunk win rate, the smoothed top cut
 * conversion lift and raw meta presence, each mapped onto 0..100 by a linear scale.
 */
export const TIER_CONFIG: TierConfig = {
  priorMatches: 20,
  conversionPrior: 10,
  minEntries: 10,
  minShare: 0.01,
  weights: { winRate: 0.5, conversion: 0.35, presence: 0.15 },
  scales: { winRate: [0.4, 0.6], conversionLift: [0, 2], metaShare: [0, 0.2] },
  thresholds: { S: 65, A: 52, B: 40 },
};

/** Multiplier applied to placement points by event tier. */
export const TIER_WEIGHT: Record<EventTier, number> = {
  "store-championship": 1,
  "online-open": 1.5,
  "regional-championship": 2.5,
  "national-championship": 4,
};

/** Display names for event tiers, in ascending order of prestige. */
export const TIER_LABELS: Record<EventTier, string> = {
  "store-championship": "Store Championship",
  "online-open": "Online Open",
  "regional-championship": "Regional Championship",
  "national-championship": "National Championship",
};

/** Tier list rows, best first. */
export const TIER_IDS: readonly TierId[] = ["S", "A", "B", "C", "unranked"];

/** Tier list headings and one-line explanations. */
export const TIER_META: Record<TierId, { label: string; blurb: string }> = {
  S: { label: "S Tier", blurb: "Format-defining: wins matches, converts to top cut and shows up everywhere." },
  A: { label: "A Tier", blurb: "Proven contenders that regularly reach the top tables." },
  B: { label: "B Tier", blurb: "Viable picks with real results, but clear holes in key matchups." },
  C: { label: "C Tier", blurb: "Underperforming the field; expect an uphill climb." },
  unranked: { label: "Unranked", blurb: "Rogue lists, or too few entries in the selected events to rank with confidence." },
};
