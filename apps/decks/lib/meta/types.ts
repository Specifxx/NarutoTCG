import type { EventTier } from "@naruto-tcg/types";

/**
 * Meta engine types. The engine reduces each tournament to additive sufficient statistics
 * (a {@link TournamentAggregate}); aggregates merge by summation, so the server can ship
 * small per-event aggregates and the browser can filter them and fold in locally imported
 * events without ever seeing raw match data.
 */

export interface WLD {
  wins: number;
  losses: number;
  draws: number;
}

export interface ArchetypeCounts {
  /** Players registered on the archetype. */
  entries: number;
  /** Players that made the top cut (0 for events without a cut). */
  topCut: number;
  /** Event wins (placement 1). */
  eventWins: number;
  /** Non-mirror match results; byes and intentional draws excluded. Swiss and top cut. */
  matches: WLD;
  /** Mirror matches played (each match counted once). */
  mirrorMatches: number;
  /** Placement points, see `placementPoints()`. */
  points: number;
  /** Sum over entries of the placement percentile (1 = winner, 0 = last). */
  percentileSum: number;
}

export interface TournamentAggregate {
  tournamentId: string;
  name: string;
  date: string;
  tier: EventTier;
  format: string;
  playerCount: number;
  topCutSize: number;
  /** Players that made the cut: min(topCutSize, playerCount); 0 without a cut. */
  topCutSlots: number;
  winnerArchetypeId: string | null;
  archetypes: Record<string, ArchetypeCounts>;
  /**
   * Directional head-to-head results keyed `${archetypeId}|${opponentArchetypeId}`, from the
   * first archetype's point of view. Both directions are stored; mirrors are excluded.
   */
  matchups: Record<string, WLD>;
}

/** The sum of any number of tournament aggregates. */
export interface MetaAggregate {
  tournamentCount: number;
  playerCount: number;
  topCutSlots: number;
  archetypes: Record<string, ArchetypeCounts>;
  matchups: Record<string, WLD>;
}

export interface MetaFilter {
  /** Inclusive ISO date bounds. */
  from?: string;
  to?: string;
  tiers?: EventTier[];
  format?: string;
  minPlayers?: number;
}

export type TierId = "S" | "A" | "B" | "C" | "unranked";

export interface ArchetypeStats {
  archetypeId: string;
  entries: number;
  /** entries / total players, 0..1 */
  metaShare: number;
  topCut: number;
  /** Share of all top cut slots, 0..1 */
  topCutShare: number;
  /** topCut / entries, 0..1 */
  conversionRate: number;
  /** Smoothed conversion rate divided by the field-wide baseline (1 = average). */
  conversionLift: number;
  eventWins: number;
  record: WLD;
  mirrorMatches: number;
  /** Non-mirror win rate, draws count half; null without matches. */
  winRate: number | null;
  /** Win rate shrunk toward 50% by a prior of `priorMatches` games. */
  adjustedWinRate: number;
  /** Wilson 95% interval on the raw win rate; null without matches. */
  winRateInterval: [number, number] | null;
  points: number;
  /** Mean placement percentile, 0..1 */
  avgPercentile: number;
  /** Composite 0..100 used for tiering. */
  score: number;
  tier: TierId;
}

export interface TierConfig {
  /** Pseudo-games at 50% blended into the win rate. */
  priorMatches: number;
  /** Pseudo-entries at the baseline conversion blended into the conversion rate. */
  conversionPrior: number;
  /** Archetypes below either floor are "unranked". */
  minEntries: number;
  minShare: number;
  weights: { winRate: number; conversion: number; presence: number };
  /** Linear 0→100 scales: [value mapped to 0, value mapped to 100]. */
  scales: { winRate: [number, number]; conversionLift: [number, number]; metaShare: [number, number] };
  thresholds: { S: number; A: number; B: number };
}

export interface MatchupCell {
  archetypeId: string;
  opponentId: string;
  record: WLD;
  games: number;
  /** Row archetype's win rate vs the column archetype; null without games or for mirrors. */
  winRate: number | null;
  interval: [number, number] | null;
  mirror: boolean;
  /** True when games < the matrix's `minGames`. */
  lowSample: boolean;
}

export interface MatchupMatrix {
  archetypeIds: string[];
  /** cells[row][col]. */
  cells: MatchupCell[][];
  minGames: number;
}

/** One row per event for the stacked meta-share chart; values are shares 0..1 keyed by series id. */
export interface MetaShareRow {
  tournamentId: string;
  label: string;
  date: string;
  playerCount: number;
  shares: Record<string, number>;
}
