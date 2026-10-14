import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { aggregateTournament } from "@/lib/meta/aggregate";
import { buildMetaSnapshot, type MetaSnapshot } from "@/lib/meta/snapshot";
import type { TierId, TournamentAggregate } from "@/lib/meta/types";

/**
 * Server-side access to the seed meta. Never import this (or lib/data/tournaments) from a
 * "use client" module: it pulls the full seed JSON into the bundle. Pass the small, plain-JSON
 * aggregates or snapshot to client components as props instead.
 */

let aggregates: TournamentAggregate[] | undefined;
let snapshot: MetaSnapshot | undefined;

/** Per-event aggregates for every seed tournament, newest first. */
export function getSeedAggregates(): TournamentAggregate[] {
  return (aggregates ??= SEED_TOURNAMENTS.map(aggregateTournament));
}

/** Meta snapshot over every seed tournament. */
export function getSeedSnapshot(): MetaSnapshot {
  return (snapshot ??= buildMetaSnapshot(SEED_TOURNAMENTS));
}

/** Tier of an archetype in the all-events seed snapshot. */
export function getSeedTier(archetypeId: string): TierId {
  return getSeedSnapshot().stats.find((s) => s.archetypeId === archetypeId)?.tier ?? "unranked";
}
