import type { EventTier, MatchOutcome, MatchRecord, Tournament, TournamentPlayer } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { ROGUE_ID } from "@/lib/data/archetypes";
import { createRng, pick, randInt, shuffle } from "@/lib/random";
import { aggregateTournament, filterAggregates, matchesMetaFilter, mergeAggregates, placementPoints } from "./aggregate";
import { buildMatchupMatrix, topArchetypeIds } from "./matchups";
import type { MetaAggregate, TournamentAggregate } from "./types";

const AVENGER = "uchiha-avenger";
const SAGE = "uzumaki-sage";
const HYUGA = "hyuga-gentle-fist";

const player = (id: string, archetypeId: string, placement: number): TournamentPlayer => ({
  id,
  name: `Player ${id}`,
  archetypeId,
  placement,
});

const m = (round: number, p1: string, p2: string | null, outcome: MatchOutcome, extra: Partial<MatchRecord> = {}): MatchRecord => ({
  round,
  stage: "swiss",
  player1Id: p1,
  player2Id: p2,
  outcome,
  ...extra,
});

const event = (overrides: Partial<Tournament> & Pick<Tournament, "players" | "matches">): Tournament => ({
  id: "test-event",
  name: "Regional Championship — Testville",
  tier: "regional-championship",
  format: "Standard (NT01–NT03)",
  date: "2026-05-02",
  location: { city: "Testville" },
  organizer: "Mock Organizer",
  swissRounds: 3,
  topCutSize: 4,
  bestOf: 3,
  source: "seed",
  ...overrides,
});

/**
 * Six players, cut to top 4. Contains a non-intentional draw, two mirrors, an intentional
 * mirror draw, a non-mirror intentional draw, a bye and a match with an unknown player.
 */
const FIXTURE = event({
  players: [
    player("a", AVENGER, 1),
    player("b", SAGE, 2),
    player("c", AVENGER, 3),
    player("d", HYUGA, 4),
    player("e", ROGUE_ID, 5),
    player("f", SAGE, 6),
  ],
  matches: [
    m(1, "a", "b", "p1"),
    m(1, "c", "d", "draw"),
    m(1, "e", "f", "p2"),
    m(2, "a", "c", "p1"),
    m(2, "b", "f", "draw", { intentionalDraw: true }),
    m(2, "d", "e", "p1"),
    m(3, "a", "d", "draw", { intentionalDraw: true }),
    m(3, "b", "e", "p1"),
    m(3, "c", null, "bye"),
    m(3, "f", "ghost", "p1"),
    m(4, "a", "d", "p1", { stage: "top-cut" }),
    m(4, "b", "c", "p2", { stage: "top-cut" }),
    m(5, "a", "c", "p1", { stage: "top-cut" }),
  ],
});

const TIERS: EventTier[] = ["store-championship", "online-open", "regional-championship", "national-championship"];
const RANDOM_ARCHETYPES = [AVENGER, SAGE, HYUGA, "sand-gaara", ROGUE_ID];

/** Random but deterministic event: random pairings, outcomes, draws, IDs and byes. */
function randomTournament(seed: string): Tournament {
  const rng = createRng(seed);
  const playerCount = randInt(rng, 4, 24);
  const placements = shuffle(rng, Array.from({ length: playerCount }, (_, i) => i + 1));
  const players = placements.map((placement, i) => player(`p${i}`, pick(rng, RANDOM_ARCHETYPES), placement));
  const rounds = randInt(rng, 3, 6);
  const matches: MatchRecord[] = [];
  for (let round = 1; round <= rounds; round++) {
    const order = shuffle(rng, players.map((p) => p.id));
    for (let i = 0; i < order.length; i += 2) {
      const p2 = order[i + 1];
      if (p2 === undefined) {
        matches.push(m(round, order[i]!, null, "bye"));
        continue;
      }
      const roll = rng();
      const outcome: MatchOutcome = roll < 0.45 ? "p1" : roll < 0.9 ? "p2" : "draw";
      matches.push(m(round, order[i]!, p2, outcome, outcome === "draw" && rng() < 0.5 ? { intentionalDraw: true } : {}));
    }
  }
  return event({
    id: seed,
    tier: pick(rng, TIERS),
    date: `2026-0${randInt(rng, 1, 9)}-1${randInt(rng, 0, 9)}`,
    swissRounds: rounds,
    topCutSize: pick(rng, [0, 4, 8]),
    players,
    matches,
  });
}

const RANDOM_EVENTS = Array.from({ length: 30 }, (_, i) => randomTournament(`fixture-${i}`));

/** Rounds float sums so merges in different orders compare equal. */
function normalize(meta: MetaAggregate): MetaAggregate {
  return JSON.parse(JSON.stringify(meta, (_, value: unknown) => (typeof value === "number" ? Math.round(value * 1e9) / 1e9 : value)));
}

describe("placementPoints", () => {
  it("pays by bracket, scaled by event tier", () => {
    expect(placementPoints(1, 8, "store-championship")).toBe(100);
    expect(placementPoints(2, 8, "online-open")).toBe(105);
    expect(placementPoints(3, 8, "regional-championship")).toBe(125);
    expect(placementPoints(8, 8, "national-championship")).toBe(140);
    expect(placementPoints(12, 16, "store-championship")).toBe(22);
    expect(placementPoints(20, 32, "store-championship")).toBe(14);
  });

  it("pays nothing outside the cut, beyond 32nd, or for invalid placements", () => {
    expect(placementPoints(9, 8, "national-championship")).toBe(0);
    expect(placementPoints(5, 4, "store-championship")).toBe(0);
    expect(placementPoints(33, 64, "store-championship")).toBe(0);
    expect(placementPoints(0, 8, "store-championship")).toBe(0);
  });

  it("pays the top 8 at events without a cut", () => {
    expect(placementPoints(8, 0, "store-championship")).toBe(35);
    expect(placementPoints(9, 0, "store-championship")).toBe(0);
  });
});

describe("aggregateTournament", () => {
  const agg = aggregateTournament(FIXTURE);

  it("copies event metadata and derives slots and the winner", () => {
    expect(agg).toMatchObject({
      tournamentId: "test-event",
      tier: "regional-championship",
      date: "2026-05-02",
      playerCount: 6,
      topCutSize: 4,
      topCutSlots: 4,
      winnerArchetypeId: AVENGER,
    });
  });

  it("counts entries, cuts, wins, points and percentiles per archetype", () => {
    expect(agg.archetypes[AVENGER]).toMatchObject({ entries: 2, topCut: 2, eventWins: 1, points: 375 });
    expect(agg.archetypes[SAGE]).toMatchObject({ entries: 2, topCut: 1, eventWins: 0, points: 175 });
    expect(agg.archetypes[HYUGA]).toMatchObject({ entries: 1, topCut: 1, points: 125 });
    expect(agg.archetypes[ROGUE_ID]).toMatchObject({ entries: 1, topCut: 0, points: 0 });
    expect(agg.archetypes[AVENGER]!.percentileSum).toBeCloseTo(1 + 0.6, 10);
    expect(agg.archetypes[SAGE]!.percentileSum).toBeCloseTo(0.8, 10);
    expect(agg.archetypes[ROGUE_ID]!.percentileSum).toBeCloseTo(0.2, 10);
  });

  it("excludes byes, intentional draws and unknown players; counts mirrors once", () => {
    expect(agg.archetypes[AVENGER]).toMatchObject({ matches: { wins: 3, losses: 0, draws: 1 }, mirrorMatches: 2 });
    expect(agg.archetypes[SAGE]).toMatchObject({ matches: { wins: 2, losses: 2, draws: 0 }, mirrorMatches: 0 });
    expect(agg.archetypes[HYUGA]).toMatchObject({ matches: { wins: 1, losses: 1, draws: 1 }, mirrorMatches: 0 });
    expect(agg.archetypes[ROGUE_ID]).toMatchObject({ matches: { wins: 0, losses: 3, draws: 0 }, mirrorMatches: 0 });
  });

  it("stores both directions of every non-mirror matchup", () => {
    expect(agg.matchups).toEqual({
      [`${AVENGER}|${SAGE}`]: { wins: 2, losses: 0, draws: 0 },
      [`${SAGE}|${AVENGER}`]: { wins: 0, losses: 2, draws: 0 },
      [`${AVENGER}|${HYUGA}`]: { wins: 1, losses: 0, draws: 1 },
      [`${HYUGA}|${AVENGER}`]: { wins: 0, losses: 1, draws: 1 },
      [`${SAGE}|${ROGUE_ID}`]: { wins: 2, losses: 0, draws: 0 },
      [`${ROGUE_ID}|${SAGE}`]: { wins: 0, losses: 2, draws: 0 },
      [`${HYUGA}|${ROGUE_ID}`]: { wins: 1, losses: 0, draws: 0 },
      [`${ROGUE_ID}|${HYUGA}`]: { wins: 0, losses: 1, draws: 0 },
    });
  });

  it("handles events without a cut and cuts larger than the field", () => {
    const noCut = aggregateTournament({ ...FIXTURE, topCutSize: 0 });
    expect(noCut.topCutSlots).toBe(0);
    expect(Object.values(noCut.archetypes).every((c) => c.topCut === 0)).toBe(true);
    expect(noCut.archetypes[ROGUE_ID]!.points).toBe(35 * 2.5);
    expect(aggregateTournament({ ...FIXTURE, topCutSize: 8 }).topCutSlots).toBe(6);
  });

  it("handles a single player and an empty event", () => {
    const solo = aggregateTournament(event({ players: [player("a", AVENGER, 1)], matches: [m(1, "a", null, "bye")] }));
    expect(solo.archetypes[AVENGER]).toMatchObject({ entries: 1, percentileSum: 1, matches: { wins: 0, losses: 0, draws: 0 } });
    const empty = aggregateTournament(event({ players: [], matches: [] }));
    expect(empty).toMatchObject({ playerCount: 0, topCutSlots: 0, winnerArchetypeId: null, archetypes: {}, matchups: {} });
  });

  it("keeps matchups antisymmetric and consistent with archetype records on random events", () => {
    let checked = 0;
    for (const tournament of RANDOM_EVENTS) {
      const a = aggregateTournament(tournament);
      let wins = 0;
      let losses = 0;
      for (const [key, record] of Object.entries(a.matchups)) {
        const [row, col] = key.split("|");
        expect(row).not.toBe(col);
        expect(a.matchups[`${col}|${row}`]).toEqual({ wins: record.losses, losses: record.wins, draws: record.draws });
        checked++;
      }
      for (const [id, counts] of Object.entries(a.archetypes)) {
        const rows = Object.entries(a.matchups).filter(([key]) => key.startsWith(`${id}|`));
        const summed = rows.reduce((s, [, r]) => ({ wins: s.wins + r.wins, losses: s.losses + r.losses, draws: s.draws + r.draws }), {
          wins: 0,
          losses: 0,
          draws: 0,
        });
        expect(counts.matches).toEqual(summed);
        wins += counts.matches.wins;
        losses += counts.matches.losses;
      }
      expect(wins).toBe(losses);
      expect(Object.values(a.archetypes).reduce((s, c) => s + c.entries, 0)).toBe(a.playerCount);
      expect(Object.values(a.archetypes).reduce((s, c) => s + c.topCut, 0)).toBe(a.topCutSlots);
      expect(Object.values(a.archetypes).reduce((s, c) => s + c.eventWins, 0)).toBe(1);
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe("mergeAggregates", () => {
  const aggs = RANDOM_EVENTS.map(aggregateTournament);
  const [a, b, c] = [aggs.slice(0, 10), aggs.slice(10, 20), aggs.slice(20)];

  it("is associative and commutative", () => {
    const flat = normalize(mergeAggregates(aggs));
    expect(normalize(mergeAggregates([mergeAggregates(a), mergeAggregates([...b, ...c])]))).toEqual(flat);
    expect(normalize(mergeAggregates([mergeAggregates([...a, ...b]), mergeAggregates(c)]))).toEqual(flat);
    expect(normalize(mergeAggregates([...aggs].reverse()))).toEqual(flat);
    expect(flat.tournamentCount).toBe(30);
  });

  it("matches aggregating every match and player of the union as one event", () => {
    const union = event({
      topCutSize: 0,
      players: RANDOM_EVENTS.flatMap((t) => t.players.map((p) => ({ ...p, id: `${t.id}/${p.id}` }))),
      matches: RANDOM_EVENTS.flatMap((t) =>
        t.matches.map((x) => ({ ...x, player1Id: `${t.id}/${x.player1Id}`, player2Id: x.player2Id && `${t.id}/${x.player2Id}` })),
      ),
    });
    const merged = mergeAggregates(aggs);
    const whole = aggregateTournament(union);
    expect(merged.playerCount).toBe(whole.playerCount);
    expect(merged.matchups).toEqual(whole.matchups);
    for (const [id, counts] of Object.entries(whole.archetypes)) {
      expect(merged.archetypes[id]).toMatchObject({ entries: counts.entries, matches: counts.matches, mirrorMatches: counts.mirrorMatches });
    }
    expect(merged.topCutSlots).toBe(aggs.reduce((s, x) => s + x.topCutSlots, 0));
  });

  it("yields an antisymmetric matchup matrix over the merged random events", () => {
    const merged = mergeAggregates(aggs);
    const ids = topArchetypeIds(merged, RANDOM_ARCHETYPES.length, { excludeRogue: false });
    expect(ids).toHaveLength(RANDOM_ARCHETYPES.length);
    const { cells } = buildMatchupMatrix(merged, ids);
    ids.forEach((id, r) => {
      expect(cells[r]![r]).toMatchObject({ mirror: true, games: merged.archetypes[id]!.mirrorMatches });
      ids.forEach((_, c) => {
        if (r === c) return;
        const [x, y] = [cells[r]![c]!, cells[c]![r]!];
        expect(x.games).toBeGreaterThan(0);
        expect(x.record).toEqual({ wins: y.record.losses, losses: y.record.wins, draws: y.record.draws });
        expect(x.winRate! + y.winRate!).toBeCloseTo(1, 10);
      });
    });
  });

  it("does not mutate its inputs and returns zeros for no input", () => {
    const before = JSON.stringify(aggs[0]);
    mergeAggregates([aggs[0]!, aggs[0]!]);
    expect(JSON.stringify(aggs[0])).toBe(before);
    expect(mergeAggregates([])).toEqual({ tournamentCount: 0, playerCount: 0, topCutSlots: 0, archetypes: {}, matchups: {} });
  });
});

describe("filterAggregates", () => {
  const agg = (id: string, date: string, tier: EventTier, playerCount: number, format = "Standard (NT01–NT03)") =>
    ({ ...aggregateTournament(event({ players: [], matches: [] })), tournamentId: id, date, tier, playerCount, format }) as TournamentAggregate;
  const aggs = [
    agg("a", "2026-03-01", "store-championship", 16),
    agg("b", "2026-04-15", "regional-championship", 120),
    agg("c", "2026-07-20", "online-open", 64, "Standard (NT01–NT04)"),
    agg("d", "2026-08-01", "national-championship", 300, "Standard (NT01–NT04)"),
  ];
  const ids = (filter: Parameters<typeof filterAggregates>[1]) => filterAggregates(aggs, filter).map((x) => x.tournamentId);

  it("applies inclusive date bounds", () => {
    expect(ids({ from: "2026-04-15", to: "2026-07-20" })).toEqual(["b", "c"]);
    expect(ids({ to: "2026-03-01" })).toEqual(["a"]);
  });

  it("filters by tier, format and player count", () => {
    expect(ids({ tiers: ["regional-championship", "national-championship"] })).toEqual(["b", "d"]);
    expect(ids({ tiers: [] })).toEqual(["a", "b", "c", "d"]);
    expect(ids({ format: "Standard (NT01–NT04)" })).toEqual(["c", "d"]);
    expect(ids({ minPlayers: 64 })).toEqual(["b", "c", "d"]);
    expect(ids({ minPlayers: 64, format: "Standard (NT01–NT03)" })).toEqual(["b"]);
    expect(ids({})).toEqual(["a", "b", "c", "d"]);
  });

  it("exposes the predicate for raw events", () => {
    expect(matchesMetaFilter({ date: "2026-01-01", tier: "online-open", format: "x", playerCount: 8 }, { from: "2026-02-01" })).toBe(false);
  });
});
