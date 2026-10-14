import type { Tournament, TournamentPlayer } from "@naruto-tcg/types";
import { ARCHETYPES } from "@/lib/data/archetypes";
import { formatForDate } from "@/lib/data/cards";
import { createRng, weightedPick, type Rng } from "@/lib/random";
import {
  MAX_LOCAL_TURNOUT,
  PREFERENCE_BOOST,
  SEED_EVENTS,
  STORE_PUBLISHED_LIST_DEPTH,
  metaPeriodFor,
  swissRoundsFor,
  type MetaPeriod,
  type SeedEventSpec,
} from "@/lib/seed/config";
import { buildSeedDecklist } from "@/lib/seed/decklists";
import { generatePlayerPool, type SeedPlayer } from "@/lib/seed/players";
import { canonicalTournament } from "@/lib/seed/serialize";
import { simulateEvent } from "@/lib/seed/simulate";
import { computeFinalPlacements } from "@/lib/tournament/standings";

/** Weighted sample of `count` items without replacement (Efraimidis–Spirakis keys). */
function sampleWeighted<T>(rng: Rng, items: readonly T[], count: number, weight: (item: T) => number): T[] {
  if (count > items.length) throw new Error(`Cannot sample ${count} of ${items.length}`);
  return items
    .map((item) => ({ item, key: rng() ** (1 / weight(item)) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, count)
    .map((entry) => entry.item);
}

/**
 * The event's field: mostly players from its home regions (capped at
 * {@link MAX_LOCAL_TURNOUT} of the local pool), the rest travelers; global events draw
 * from everyone. Active players are likelier to register. Nobody is drawn twice.
 */
export function selectEntrants(spec: SeedEventSpec, pool: readonly SeedPlayer[], rng: Rng): SeedPlayer[] {
  const byActivity = (p: SeedPlayer) => p.activity;
  const { localRegions } = spec;
  if (localRegions === "global") return sampleWeighted(rng, pool, spec.playerCount, byActivity);
  const local = pool.filter((p) => localRegions.includes(p.region));
  const travelers = pool.filter((p) => !localRegions.includes(p.region));
  const localCount = Math.min(Math.round(spec.playerCount * (1 - spec.travelerShare)), Math.floor(local.length * MAX_LOCAL_TURNOUT));
  return [
    ...sampleWeighted(rng, local, localCount, byActivity),
    ...sampleWeighted(rng, travelers, spec.playerCount - localCount, byActivity),
  ];
}

/** P(archetype) ∝ period popularity × (1 + {@link PREFERENCE_BOOST} × the player's preference weight). */
export function chooseArchetype(player: SeedPlayer, period: MetaPeriod, rng: Rng): string {
  const preference = (id: string) => player.preferences.find((p) => p.archetypeId === id)?.weight ?? 0;
  return weightedPick(
    rng,
    ARCHETYPES.map((a) => a.id),
    (id) => (period.popularity[id] ?? 0) * (1 + PREFERENCE_BOOST * preference(id)),
  );
}

/** Placements that publish a list: the top cut, extended to the Top 8 at Store Championships. */
export function publishedListDepth(spec: Pick<SeedEventSpec, "tier" | "topCutSize">): number {
  return spec.tier === "store-championship" ? Math.max(spec.topCutSize, STORE_PUBLISHED_LIST_DEPTH) : spec.topCutSize;
}

/** Generates one seed event from its spec. Every random draw is namespaced by the event id. */
export function generateSeedTournament(spec: SeedEventSpec, pool: readonly SeedPlayer[]): Tournament {
  const entrants = selectEntrants(spec, pool, createRng(`${spec.id}:entrants`));
  const period = metaPeriodFor(spec.date);
  const archetypeRng = createRng(`${spec.id}:archetypes`);
  const competitors = entrants.map((p) => ({ id: p.id, skill: p.skill, archetypeId: chooseArchetype(p, period, archetypeRng) }));
  const swissRounds = swissRoundsFor(spec.playerCount);
  const sim = simulateEvent({ seed: spec.id, competitors, swissRounds, topCutSize: spec.topCutSize });
  const listDepth = publishedListDepth(spec);

  const players: TournamentPlayer[] = entrants.map((entrant, index) => ({
    id: entrant.id,
    name: entrant.name,
    country: entrant.country,
    archetypeId: competitors[index]!.archetypeId,
    placement: 0,
    ...(sim.droppedIds.has(entrant.id) ? { dropped: true } : {}),
  }));
  const placements = computeFinalPlacements({ players, matches: sim.matches, topCutSize: spec.topCutSize });
  for (const player of players) {
    player.placement = placements.get(player.id)!;
    if (player.placement <= listDepth) {
      player.decklist = buildSeedDecklist(player.archetypeId, spec.date, createRng(`${spec.id}:list:${player.id}`));
    }
  }

  return canonicalTournament({
    id: spec.id,
    name: spec.name,
    tier: spec.tier,
    format: formatForDate(spec.date),
    date: spec.date,
    location: spec.location,
    organizer: spec.organizer,
    swissRounds,
    topCutSize: spec.topCutSize,
    bestOf: 3,
    source: "seed",
    notes: spec.notes,
    players,
    matches: sim.matches,
  });
}

/** All seed tournaments, oldest first. Pure and deterministic. */
export function generateSeedTournaments(): Tournament[] {
  const pool = generatePlayerPool();
  return SEED_EVENTS.map((spec) => generateSeedTournament(spec, pool));
}
