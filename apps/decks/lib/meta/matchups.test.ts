import { describe, expect, it } from "vitest";
import { ROGUE_ID } from "@/lib/data/archetypes";
import { emptyCounts } from "./aggregate";
import { wilsonInterval } from "./math";
import { buildMatchupMatrix, topArchetypeIds } from "./matchups";
import type { ArchetypeCounts, MetaAggregate } from "./types";

const counts = (partial: Partial<ArchetypeCounts>): ArchetypeCounts => ({ ...emptyCounts(), ...partial });

const META: MetaAggregate = {
  tournamentCount: 2,
  playerCount: 100,
  topCutSlots: 16,
  archetypes: {
    a: counts({ entries: 30, mirrorMatches: 5 }),
    b: counts({ entries: 20 }),
    c: counts({ entries: 10 }),
    d: counts({ entries: 10 }),
    [ROGUE_ID]: counts({ entries: 30 }),
  },
  matchups: {
    "a|b": { wins: 6, losses: 3, draws: 1 },
    "b|a": { wins: 3, losses: 6, draws: 1 },
    "a|c": { wins: 2, losses: 1, draws: 0 },
    "c|a": { wins: 1, losses: 2, draws: 0 },
  },
};

describe("buildMatchupMatrix", () => {
  const matrix = buildMatchupMatrix(META, ["a", "b", "c"]);
  const cell = (row: number, col: number) => matrix.cells[row]![col]!;

  it("lays out cells[row][col] from the row archetype's point of view", () => {
    expect(matrix.archetypeIds).toEqual(["a", "b", "c"]);
    expect(matrix.minGames).toBe(8);
    expect(cell(0, 1)).toEqual({
      archetypeId: "a",
      opponentId: "b",
      record: { wins: 6, losses: 3, draws: 1 },
      games: 10,
      winRate: 0.65,
      interval: wilsonInterval(6.5, 10),
      mirror: false,
      lowSample: false,
    });
    expect(cell(1, 0).winRate).toBeCloseTo(0.35, 10);
  });

  it("is antisymmetric off the diagonal", () => {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (r === c) continue;
        const [x, y] = [cell(r, c), cell(c, r)];
        expect(x.record).toEqual({ wins: y.record.losses, losses: y.record.wins, draws: y.record.draws });
        if (x.winRate !== null && y.winRate !== null) expect(x.winRate + y.winRate).toBeCloseTo(1, 10);
      }
    }
  });

  it("flags low samples and empty cells", () => {
    expect(cell(0, 2)).toMatchObject({ games: 3, lowSample: true, mirror: false });
    expect(cell(1, 2)).toMatchObject({ games: 0, winRate: null, interval: null, lowSample: true, record: { wins: 0, losses: 0, draws: 0 } });
    expect(buildMatchupMatrix(META, ["a", "c"], { minGames: 3 }).cells[0]![1]!.lowSample).toBe(false);
  });

  it("marks the diagonal as mirrors with mirror match counts", () => {
    expect(cell(0, 0)).toEqual({
      archetypeId: "a",
      opponentId: "a",
      record: { wins: 0, losses: 0, draws: 0 },
      games: 5,
      winRate: null,
      interval: null,
      mirror: true,
      lowSample: false,
    });
    expect(cell(2, 2)).toMatchObject({ mirror: true, games: 0, lowSample: false });
    expect(buildMatchupMatrix(META, ["unknown"]).cells[0]![0]!.games).toBe(0);
  });

  it("copies records instead of aliasing the aggregate", () => {
    buildMatchupMatrix(META, ["a", "b"]).cells[0]![1]!.record.wins = 99;
    expect(META.matchups["a|b"]!.wins).toBe(6);
  });

  it("handles an empty id list", () => {
    expect(buildMatchupMatrix(META, [])).toEqual({ archetypeIds: [], cells: [], minGames: 8 });
  });
});

describe("topArchetypeIds", () => {
  it("orders by entries then id and excludes rogue by default", () => {
    expect(topArchetypeIds(META, 10)).toEqual(["a", "b", "c", "d"]);
    expect(topArchetypeIds(META, 2)).toEqual(["a", "b"]);
    expect(topArchetypeIds(META, 2, { excludeRogue: false })).toEqual(["a", ROGUE_ID]);
    expect(topArchetypeIds(META, 0)).toEqual([]);
  });

  it("skips archetypes without entries", () => {
    expect(topArchetypeIds({ ...META, archetypes: { ...META.archetypes, z: counts({}) } }, 10)).not.toContain("z");
  });
});
