import type { EventTier, MatchOutcome, Tournament } from "@naruto-tcg/types";
import { TIER_WEIGHT } from "@/lib/meta/config";
import { clamp01 } from "@/lib/meta/math";
import type { ArchetypeCounts, MetaAggregate, MetaFilter, TournamentAggregate, WLD } from "@/lib/meta/types";

/** Base placement points as [worst placement in the bracket, points], best bracket first. */
const PLACEMENT_POINTS: ReadonlyArray<readonly [number, number]> = [
  [1, 100],
  [2, 70],
  [4, 50],
  [8, 35],
  [16, 22],
  [32, 14],
];

/** How deep points are paid at events without a top cut. */
const NO_CUT_POINTS_DEPTH = 8;

export function emptyWLD(): WLD {
  return { wins: 0, losses: 0, draws: 0 };
}

export function emptyCounts(): ArchetypeCounts {
  return { entries: 0, topCut: 0, eventWins: 0, matches: emptyWLD(), mirrorMatches: 0, points: 0, percentileSum: 0 };
}

/** Key of the directional head-to-head record, from `archetypeId`'s point of view. */
export function matchupKey(archetypeId: string, opponentId: string): string {
  return `${archetypeId}|${opponentId}`;
}

/** Oldest first; ties broken by tournament id so the order is deterministic. */
export function compareAggregatesByDate(a: TournamentAggregate, b: TournamentAggregate): number {
  return a.date.localeCompare(b.date) || (a.tournamentId < b.tournamentId ? -1 : a.tournamentId > b.tournamentId ? 1 : 0);
}

/**
 * Points for a final placement, scaled by {@link TIER_WEIGHT}. Only players inside the top
 * cut score; at events without a cut the top {@link NO_CUT_POINTS_DEPTH} do.
 */
export function placementPoints(placement: number, topCutSize: number, tier: EventTier): number {
  const depth = topCutSize > 0 ? topCutSize : NO_CUT_POINTS_DEPTH;
  if (placement < 1 || placement > depth) return 0;
  const bracket = PLACEMENT_POINTS.find(([worst]) => placement <= worst);
  return bracket ? bracket[1] * TIER_WEIGHT[tier] : 0;
}

function getOrCreate<V>(map: Map<string, V>, key: string, create: () => V): V {
  let value = map.get(key);
  if (value === undefined) {
    value = create();
    map.set(key, value);
  }
  return value;
}

function tally(target: WLD, outcome: Exclude<MatchOutcome, "bye">, asPlayer1: boolean): void {
  if (outcome === "draw") target.draws++;
  else if ((outcome === "p1") === asPlayer1) target.wins++;
  else target.losses++;
}

/**
 * Reduces one event to additive per-archetype counts and directional matchup records.
 * Byes, intentional draws and matches with unknown players never reach win-rate stats;
 * mirrors are counted once per match and kept out of `matches` and `matchups`.
 */
export function aggregateTournament(tournament: Tournament): TournamentAggregate {
  const { players, topCutSize, tier } = tournament;
  const playerCount = players.length;
  const archetypes = new Map<string, ArchetypeCounts>();
  const archetypeOf = new Map<string, string>();

  for (const player of players) {
    archetypeOf.set(player.id, player.archetypeId);
    const counts = getOrCreate(archetypes, player.archetypeId, emptyCounts);
    counts.entries++;
    if (topCutSize > 0 && player.placement <= topCutSize) counts.topCut++;
    if (player.placement === 1) counts.eventWins++;
    counts.points += placementPoints(player.placement, topCutSize, tier);
    counts.percentileSum += playerCount > 1 ? clamp01(1 - (player.placement - 1) / (playerCount - 1)) : 1;
  }

  const matchups = new Map<string, WLD>();
  for (const match of tournament.matches) {
    if (match.player2Id === null || match.outcome === "bye" || match.intentionalDraw) continue;
    const a = archetypeOf.get(match.player1Id);
    const b = archetypeOf.get(match.player2Id);
    if (a === undefined || b === undefined) continue;
    const countsA = archetypes.get(a)!;
    if (a === b) {
      countsA.mirrorMatches++;
      continue;
    }
    tally(countsA.matches, match.outcome, true);
    tally(archetypes.get(b)!.matches, match.outcome, false);
    tally(getOrCreate(matchups, matchupKey(a, b), emptyWLD), match.outcome, true);
    tally(getOrCreate(matchups, matchupKey(b, a), emptyWLD), match.outcome, false);
  }

  return {
    tournamentId: tournament.id,
    name: tournament.name,
    date: tournament.date,
    tier,
    format: tournament.format,
    playerCount,
    topCutSize,
    topCutSlots: topCutSize > 0 ? Math.min(topCutSize, playerCount) : 0,
    winnerArchetypeId: players.find((p) => p.placement === 1)?.archetypeId ?? null,
    archetypes: Object.fromEntries(archetypes),
    matchups: Object.fromEntries(matchups),
  };
}

function addWLD(target: WLD, source: WLD): void {
  target.wins += source.wins;
  target.losses += source.losses;
  target.draws += source.draws;
}

function addCounts(target: ArchetypeCounts, source: ArchetypeCounts): void {
  target.entries += source.entries;
  target.topCut += source.topCut;
  target.eventWins += source.eventWins;
  addWLD(target.matches, source.matches);
  target.mirrorMatches += source.mirrorMatches;
  target.points += source.points;
  target.percentileSum += source.percentileSum;
}

/**
 * Sums tournament aggregates (or already-merged meta aggregates) into a fresh object.
 * Pure, associative and commutative; inputs are never mutated.
 */
export function mergeAggregates(aggregates: ReadonlyArray<TournamentAggregate | MetaAggregate>): MetaAggregate {
  const archetypes = new Map<string, ArchetypeCounts>();
  const matchups = new Map<string, WLD>();
  let tournamentCount = 0;
  let playerCount = 0;
  let topCutSlots = 0;
  for (const aggregate of aggregates) {
    tournamentCount += "tournamentCount" in aggregate ? aggregate.tournamentCount : 1;
    playerCount += aggregate.playerCount;
    topCutSlots += aggregate.topCutSlots;
    for (const [id, counts] of Object.entries(aggregate.archetypes)) addCounts(getOrCreate(archetypes, id, emptyCounts), counts);
    for (const [key, record] of Object.entries(aggregate.matchups)) addWLD(getOrCreate(matchups, key, emptyWLD), record);
  }
  return {
    tournamentCount,
    playerCount,
    topCutSlots,
    archetypes: Object.fromEntries(archetypes),
    matchups: Object.fromEntries(matchups),
  };
}

/**
 * True when an event passes the filter: inclusive ISO date bounds, tier membership (an
 * empty `tiers` list means any tier), exact format and a minimum player count.
 */
export function matchesMetaFilter(
  event: Pick<TournamentAggregate, "date" | "tier" | "format" | "playerCount">,
  filter: MetaFilter,
): boolean {
  if (filter.from && event.date < filter.from) return false;
  if (filter.to && event.date > filter.to) return false;
  if (filter.tiers && filter.tiers.length > 0 && !filter.tiers.includes(event.tier)) return false;
  if (filter.format && event.format !== filter.format) return false;
  if (filter.minPlayers !== undefined && event.playerCount < filter.minPlayers) return false;
  return true;
}

/** The events passing {@link matchesMetaFilter}, in input order. */
export function filterAggregates(aggregates: readonly TournamentAggregate[], filter: MetaFilter): TournamentAggregate[] {
  return aggregates.filter((aggregate) => matchesMetaFilter(aggregate, filter));
}
