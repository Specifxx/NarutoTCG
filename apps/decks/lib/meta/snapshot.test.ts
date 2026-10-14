import type { EventTier, MatchRecord, Tournament } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { ARCHETYPES, ROGUE_ID } from "@/lib/data/archetypes";
import { aggregateTournament } from "./aggregate";
import { chartSeriesIds } from "./share";
import { buildMetaSnapshot, deriveSnapshotFromAggregates } from "./snapshot";

const IDS = ARCHETYPES.map((a) => a.id);

/**
 * `size` players cycling through the archetype list from `offset`; placement follows seat
 * order, and two Swiss rounds pair neighbours with the better-placed player winning.
 */
function tournament(id: string, date: string, tier: EventTier, size: number, offset: number): Tournament {
  const players = Array.from({ length: size }, (_, i) => ({
    id: `${id}-p${i}`,
    name: `Test Pilot ${i}`,
    archetypeId: IDS[(offset + i) % IDS.length]!,
    placement: i + 1,
  }));
  const matches: MatchRecord[] = [];
  for (const [round, stride] of [[1, 1], [2, 2]] as const) {
    for (let i = 0; i + stride < size; i += 2 * stride) {
      matches.push({ round, stage: "swiss", player1Id: players[i]!.id, player2Id: players[i + stride]!.id, outcome: "p1" });
    }
  }
  return {
    id,
    name: `Store Championship — ${id}`,
    tier,
    format: "Standard (NT01–NT03)",
    date,
    location: { city: "Testville" },
    organizer: "Mock Organizer",
    swissRounds: 2,
    topCutSize: size >= 8 ? 4 : 0,
    bestOf: 3,
    players,
    matches,
    source: "seed",
  };
}

const EVENTS = [
  tournament("spring", "2026-03-14", "store-championship", 16, 0),
  tournament("summer", "2026-06-06", "regional-championship", 26, 3),
  tournament("autumn", "2026-09-12", "online-open", 20, 7),
];

function allFinite(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (value && typeof value === "object") return Object.values(value).every(allFinite);
  return true;
}

describe("buildMetaSnapshot", () => {
  const snapshot = buildMetaSnapshot(EVENTS);

  it("summarizes every event, newest first, with its date range", () => {
    expect(snapshot.aggregates.map((a) => a.tournamentId)).toEqual(["autumn", "summer", "spring"]);
    expect(snapshot.dateRange).toEqual({ from: "2026-03-14", to: "2026-09-12" });
    expect(snapshot.meta).toMatchObject({ tournamentCount: 3, playerCount: 62, topCutSlots: 12 });
    expect(snapshot.shareByEvent.map((r) => r.tournamentId)).toEqual(["spring", "summer", "autumn"]);
  });

  it("ranks archetypes and groups them into tiers", () => {
    expect(snapshot.stats.map((s) => s.archetypeId).sort()).toEqual(Object.keys(snapshot.meta.archetypes).sort());
    expect(Object.values(snapshot.tiers).flat()).toHaveLength(snapshot.stats.length);
    expect(snapshot.tiers.unranked.map((s) => s.archetypeId)).toContain(ROGUE_ID);
  });

  it("builds an 8x8 matrix of the most-played non-rogue archetypes", () => {
    const { archetypeIds, cells } = snapshot.matrix;
    expect(archetypeIds).toHaveLength(8);
    expect(archetypeIds).not.toContain(ROGUE_ID);
    expect(cells).toHaveLength(8);
    expect(cells.every((row) => row.length === 8)).toBe(true);
    const entries = archetypeIds.map((id) => snapshot.meta.archetypes[id]!.entries);
    expect(entries).toEqual([...entries].sort((a, b) => b - a));
  });

  it("produces chart rows for every series and only finite numbers", () => {
    expect(snapshot.overallShare.map((r) => r.seriesId)).toEqual(chartSeriesIds());
    expect(snapshot.fieldVsTopCut.map((r) => r.seriesId)).toEqual(chartSeriesIds());
    expect(allFinite(snapshot)).toBe(true);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it("matches deriving from precomputed aggregates", () => {
    expect(deriveSnapshotFromAggregates(EVENTS.map(aggregateTournament))).toEqual(snapshot);
  });

  it("applies the filter before every computation", () => {
    const filtered = buildMetaSnapshot(EVENTS, { tiers: ["regional-championship", "online-open"], from: "2026-07-01" });
    expect(filtered.aggregates.map((a) => a.tournamentId)).toEqual(["autumn"]);
    expect(filtered.meta.playerCount).toBe(20);
    expect(filtered.shareByEvent).toHaveLength(1);
    expect(filtered.dateRange).toEqual({ from: "2026-09-12", to: "2026-09-12" });
  });

  it("honours options", () => {
    const small = buildMetaSnapshot(EVENTS, {}, { matrixSize: 3, minGames: 1, recentEvents: 1 });
    expect(small.matrix.archetypeIds).toHaveLength(3);
    expect(small.matrix.minGames).toBe(1);
    expect(Object.keys(small.trends).length).toBeGreaterThan(0);
  });

  it("returns an empty, NaN-free snapshot when nothing matches", () => {
    const empty = buildMetaSnapshot(EVENTS, { minPlayers: 1000 });
    expect(empty).toMatchObject({
      aggregates: [],
      stats: [],
      tiers: { S: [], A: [], B: [], C: [], unranked: [] },
      matrix: { archetypeIds: [], cells: [], minGames: 8 },
      shareByEvent: [],
      trends: {},
      dateRange: null,
    });
    expect(empty.overallShare.every((r) => r.share === 0)).toBe(true);
    expect(allFinite(empty)).toBe(true);
    expect(buildMetaSnapshot([]).meta).toEqual({ tournamentCount: 0, playerCount: 0, topCutSlots: 0, archetypes: {}, matchups: {} });
  });
});

describe("deriveSnapshotFromAggregates", () => {
  it("folds a locally imported event into the seed aggregates", () => {
    const seed = EVENTS.map(aggregateTournament);
    const local = aggregateTournament({ ...tournament("local-test-cup", "2026-10-03", "store-championship", 8, 2), source: "import" });
    const merged = deriveSnapshotFromAggregates([...seed, local]);
    expect(merged.meta.tournamentCount).toBe(4);
    expect(merged.meta.playerCount).toBe(70);
    expect(merged.aggregates[0]!.tournamentId).toBe("local-test-cup");
    expect(merged.dateRange!.to).toBe("2026-10-03");
  });
});
