import type { Tournament } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { emptyCounts, mergeAggregates } from "@/lib/meta/aggregate";
import { OTHER_SERIES_ID, chartSeriesIds, overallShare } from "@/lib/meta/share";
import type { ArchetypeStats, MatchupCell, TournamentAggregate } from "@/lib/meta/types";
import {
  aggregateImported,
  availableFormats,
  blendHex,
  compactEventTick,
  countMatches,
  formatLift,
  formatWinRateInterval,
  matchupCellTitle,
  mergeImportedAggregates,
  newestEventDate,
  sanitizeImportedTournament,
  sliceDonut,
  sortFieldVsTopCut,
  trendDirection,
  unrankedReason,
} from "./derive";

function agg(id: string, date: string, overrides: Partial<TournamentAggregate> = {}): TournamentAggregate {
  return {
    tournamentId: id,
    name: `Event ${id}`,
    date,
    tier: "store-championship",
    format: "Standard (NT01–NT04)",
    playerCount: 0,
    topCutSize: 0,
    topCutSlots: 0,
    winnerArchetypeId: null,
    archetypes: {},
    matchups: {},
    ...overrides,
  };
}

describe("imported aggregates", () => {
  it("dedupes by tournament id with seed winning", () => {
    const seed = [agg("a", "2026-10-01"), agg("b", "2026-09-01")];
    const imported = [agg("b", "2026-12-01", { name: "Imported B" }), agg("c", "2026-11-01"), agg("c", "2026-11-02")];
    const merged = mergeImportedAggregates(seed, imported);
    expect(merged.map((a) => a.tournamentId)).toEqual(["a", "b", "c"]);
    expect(merged[1]!.name).toBe("Event b");
    expect(merged[2]!.date).toBe("2026-11-01");
    expect(seed).toHaveLength(2);
  });

  it("aggregates valid imports and skips malformed ones", () => {
    const valid: Tournament = {
      id: "imp-1",
      name: "Imported Store Championship — Somewhere",
      date: "2026-10-12",
      tier: "store-championship",
      format: "Standard (NT01–NT04)",
      topCutSize: 0,
      players: [],
      matches: [],
    } as unknown as Tournament;
    const broken = {
      id: "imp-2",
      name: "Broken",
      date: "2026-10-12",
      players: [{ id: "p1" }],
      matches: [null],
    } as unknown as Tournament;
    const result = aggregateImported([valid, broken]);
    expect(result.map((a) => a.tournamentId)).toEqual(["imp-1"]);
  });
});

describe("sanitizeImportedTournament", () => {
  const base = {
    id: "local-1",
    name: "Local Store Championship",
    date: "2026-10-12",
    tier: "store-championship",
    format: "Standard (NT01–NT04)",
    topCutSize: 4,
    players: [
      { id: "a", name: "A", archetypeId: "sand-gaara", placement: 1 },
      { id: "b", name: "B", archetypeId: "akatsuki-pain", placement: 2 },
    ],
    matches: [{ round: 1, stage: "swiss", player1Id: "a", player2Id: "b", outcome: "p1" }],
  };
  const tournament = (overrides: Record<string, unknown> = {}) => ({ ...base, ...overrides }) as unknown as Tournament;

  it("passes a well-formed import through unchanged", () => {
    expect(sanitizeImportedTournament(tournament())).toEqual(base);
  });

  it("skips imports that cannot be placed in time or tier", () => {
    expect(sanitizeImportedTournament(tournament({ date: "10/12/2026" }))).toBeNull();
    expect(sanitizeImportedTournament(tournament({ date: "2026-13-45" }))).toBeNull();
    expect(sanitizeImportedTournament(tournament({ date: undefined }))).toBeNull();
    expect(sanitizeImportedTournament(tournament({ tier: undefined }))).toBeNull();
    expect(sanitizeImportedTournament(tournament({ tier: "worlds" }))).toBeNull();
    expect(sanitizeImportedTournament(tournament({ id: "" }))).toBeNull();
  });

  it("trims ISO timestamps to dates and defaults a missing cut and format", () => {
    const clean = sanitizeImportedTournament(tournament({ date: "2026-10-12T18:00:00Z", topCutSize: undefined, format: undefined }))!;
    expect(clean.date).toBe("2026-10-12");
    expect(clean.topCutSize).toBe(0);
    expect(clean.format).toBe("");
  });

  it("maps unknown archetypes to rogue and drops malformed players and matches", () => {
    const clean = sanitizeImportedTournament(
      tournament({
        players: [...base.players, { id: "c", placement: 3 }, { id: "d", archetypeId: "kaguya", placement: 4 }, null, { name: "no id" }],
        matches: [...base.matches, null, { player1Id: "a", player2Id: "c" }, { player1Id: "c", player2Id: "d", outcome: "draw" }],
      }),
    )!;
    expect(clean.players.map((p) => [p.id, p.archetypeId])).toEqual([
      ["a", "sand-gaara"],
      ["b", "akatsuki-pain"],
      ["c", "rogue"],
      ["d", "rogue"],
    ]);
    expect(clean.matches.map((m) => m.outcome)).toEqual(["p1", "draw"]);
  });

  it("keeps NaN out of the merged meta and bad dates out of the date presets", () => {
    const aggs = aggregateImported([
      tournament({ format: undefined, topCutSize: undefined }),
      tournament({ id: "local-2", tier: undefined }),
      tournament({ id: "local-3", date: "Oct 30, 2026" }),
    ]);
    expect(aggs.map((a) => a.tournamentId)).toEqual(["local-1"]);
    const meta = mergeAggregates(aggs);
    expect(Object.values(meta.archetypes).every((c) => Number.isFinite(c.points))).toBe(true);
    expect(newestEventDate(aggs)).toBe("2026-10-12");
    expect(availableFormats(aggs)).toEqual([]);
  });
});

describe("event helpers", () => {
  it("finds the newest date and lists formats newest first", () => {
    const aggs = [
      agg("a", "2026-06-01", { format: "Standard (NT01–NT03)" }),
      agg("b", "2026-10-01"),
      agg("c", "2026-07-20"),
      agg("d", "2026-05-01", { format: "" }),
    ];
    expect(newestEventDate(aggs)).toBe("2026-10-01");
    expect(newestEventDate([])).toBeNull();
    expect(availableFormats(aggs)).toEqual(["Standard (NT01–NT04)", "Standard (NT01–NT03)"]);
  });

  it("counts each match once, mirrors included", () => {
    const meta = mergeAggregates([
      agg("a", "2026-10-01", {
        archetypes: {
          x: { ...emptyCounts(), matches: { wins: 3, losses: 1, draws: 1 }, mirrorMatches: 2 },
          y: { ...emptyCounts(), matches: { wins: 1, losses: 3, draws: 1 } },
        },
      }),
    ]);
    expect(countMatches(meta)).toBe(7);
  });
});

describe("sliceDonut", () => {
  const ids = chartSeriesIds().filter((id) => id !== OTHER_SERIES_ID);
  const row = (seriesId: string, entries: number) => ({ seriesId, label: seriesId, entries, share: entries / 100 });

  it("keeps the five largest named series in chart order and folds the rest into Other", () => {
    const rows = [...ids.map((id, i) => row(id, (i + 1) * 2)), row(OTHER_SERIES_ID, 10)];
    const { slices, folded } = sliceDonut(rows);
    expect(slices).toHaveLength(6);
    expect(slices.slice(0, 5).map((s) => s.seriesId)).toEqual(ids.slice(-5));
    const other = slices[5]!;
    expect(other.seriesId).toBe(OTHER_SERIES_ID);
    expect(other.entries).toBe(2 + 4 + 6 + 10);
    expect(other.share).toBeCloseTo(0.22);
    expect(folded).toEqual(ids.slice(0, 3));
    expect(slices.reduce((sum, s) => sum + s.entries, 0)).toBe(rows.reduce((sum, r) => sum + r.entries, 0));
  });

  it("drops empty series and omits an empty Other", () => {
    const rows = [row(ids[0]!, 5), row(ids[1]!, 0), row(ids[2]!, 3), row(OTHER_SERIES_ID, 0)];
    const { slices, folded } = sliceDonut(rows);
    expect(slices.map((s) => s.seriesId)).toEqual([ids[0], ids[2]]);
    expect(folded).toEqual([]);
  });

  it("breaks ties by chart order and works on real share rows", () => {
    const rows = ids.map((id) => row(id, 4));
    expect(sliceDonut(rows, 2).slices.map((s) => s.seriesId)).toEqual([ids[0], ids[1], OTHER_SERIES_ID]);
    const meta = mergeAggregates([
      agg("a", "2026-10-01", { playerCount: 3, archetypes: { rogue: { ...emptyCounts(), entries: 3 } } }),
    ]);
    expect(sliceDonut(overallShare(meta)).slices).toEqual([{ seriesId: OTHER_SERIES_ID, label: "Other", entries: 3, share: 1 }]);
  });
});

describe("sortFieldVsTopCut", () => {
  it("sorts by field share with Other last and drops empty series", () => {
    const rows = [
      { seriesId: "a", label: "A", fieldShare: 0.1, topCutShare: 0.2 },
      { seriesId: OTHER_SERIES_ID, label: "Other", fieldShare: 0.4, topCutShare: 0.3 },
      { seriesId: "b", label: "B", fieldShare: 0.3, topCutShare: 0.1 },
      { seriesId: "c", label: "C", fieldShare: 0, topCutShare: 0 },
    ];
    expect(sortFieldVsTopCut(rows).map((r) => r.seriesId)).toEqual(["b", "a", OTHER_SERIES_ID]);
  });
});

describe("formatting helpers", () => {
  it("classifies trends with a neutral band", () => {
    expect(trendDirection(0.021)).toBe("up");
    expect(trendDirection(-0.03)).toBe("down");
    expect(trendDirection(0.0049)).toBe("flat");
    expect(trendDirection(-0.0049)).toBe("flat");
    expect(trendDirection(Number.NaN)).toBe("flat");
  });

  it("explains unranked archetypes", () => {
    const base = { archetypeId: "x", entries: 50, metaShare: 0.05 } as ArchetypeStats;
    expect(unrankedReason({ ...base, archetypeId: "rogue" })).toBe("rogue");
    expect(unrankedReason({ ...base, entries: 9 })).toBe("entries");
    expect(unrankedReason({ ...base, metaShare: 0.005 })).toBe("share");
    expect(unrankedReason(base)).toBeNull();
  });

  it("formats win rates with intervals and lifts", () => {
    expect(formatWinRateInterval(0.5213, [0.4831, 0.5589])).toBe("52.1% (48.3–55.9)");
    expect(formatWinRateInterval(null, null)).toBe("—");
    expect(formatWinRateInterval(0.5, null)).toBe("50.0%");
    expect(formatLift(1.62)).toBe("1.6×");
    expect(formatLift(Number.NaN)).toBe("—");
  });

  it("titles matchup cells", () => {
    const cell: MatchupCell = {
      archetypeId: "akatsuki-pain",
      opponentId: "sand-gaara",
      record: { wins: 60, losses: 54, draws: 0 },
      games: 114,
      winRate: 60 / 114,
      interval: [0.4347, 0.6166],
      mirror: false,
      lowSample: false,
    };
    expect(matchupCellTitle(cell, "Six Paths of Pain", "Sand Coffin Gaara", 8)).toBe(
      "Six Paths of Pain vs Sand Coffin Gaara: 52.6% · 60-54-0 · 95% CI 43–62%",
    );
    expect(matchupCellTitle({ ...cell, games: 5, lowSample: true }, "A", "B", 8)).toMatch(/low sample \(fewer than 8 games\)$/);
    expect(matchupCellTitle({ ...cell, mirror: true, winRate: null, games: 1 }, "A", "A", 8)).toBe(
      "A mirror: 1 match (not counted in win rates)",
    );
    expect(matchupCellTitle({ ...cell, winRate: null, interval: null, games: 0 }, "A", "B", 8)).toBe("A vs B: no games yet");
  });

  it("blends hex colors", () => {
    expect(blendHex("#ffffff", 0.5, "#000000")).toBe("#808080");
    expect(blendHex("#3987e5", 0)).toBe("#3987e5");
    expect(blendHex("#3987e5", 1)).toBe("#0d0d14");
  });

  it("compacts long event ticks", () => {
    expect(compactEventTick("Seattle")).toBe("Seattle");
    expect(compactEventTick("Shinobi Online Open #4")).toBe("Shinobi #4");
    expect(compactEventTick("Konohagakure Hidden Leaf Invitational")).toBe("Konohagakure…");
    expect(compactEventTick("Konohagakure Village 12")).toBe("Konohagakure…");
  });
});
