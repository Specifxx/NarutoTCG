import { describe, expect, it } from "vitest";
import { getSeedSnapshot } from "@/lib/data/meta";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { getDeckSummaries } from "@/lib/decks/repository";
import { formatDateRange, latestResults, overviewKpis } from "./events";
import { deck, event, match, player, stat, winningDeck } from "./home-fixtures";

describe("overviewKpis", () => {
  const tournaments = [
    event("b", "2026-07-01", {
      players: [player("ann", 1, "akatsuki-pain"), player("ben", 2, "sand-gaara"), player("cid", 3, "rogue")],
      matches: [match(1, "ann", "ben", "p1"), match(1, "cid", null, "bye"), match(2, "ann", "cid", "draw")],
    }),
    event("a", "2026-05-02", {
      players: [player("ann", 2, "akatsuki-pain"), player("dee", 1, "uzumaki-sage")],
      matches: [match(1, "dee", "ann", "p1")],
    }),
  ];

  it("counts distinct players, entries and matches without byes", () => {
    const kpis = overviewKpis(tournaments, [], []);
    expect(kpis.events).toBe(2);
    expect(kpis.dateRange).toEqual({ from: "2026-05-02", to: "2026-07-01" });
    expect(kpis.players).toBe(4);
    expect(kpis.entries).toBe(5);
    expect(kpis.matches).toBe(3);
  });

  it("splits decklists by source and counts ranked archetypes", () => {
    const decks = [winningDeck("a", "2026-05-02"), deck("x"), deck("y")];
    const stats = [stat("akatsuki-pain", "S"), stat("sand-gaara", "C"), stat("rogue", "unranked"), stat("unused", "unranked", { entries: 0 })];
    const kpis = overviewKpis(tournaments, decks, stats);
    expect(kpis).toMatchObject({ decklists: 3, eventDecklists: 1, communityDecklists: 2, rankedArchetypes: 2, playedArchetypes: 3 });
  });

  it("has no date range without events", () => {
    expect(overviewKpis([], [], []).dateRange).toBeNull();
  });

  it("matches the seed snapshot", () => {
    const snapshot = getSeedSnapshot();
    const kpis = overviewKpis(SEED_TOURNAMENTS, getDeckSummaries(), snapshot.stats);
    expect(kpis.events).toBe(snapshot.aggregates.length);
    expect(kpis.entries).toBe(snapshot.meta.playerCount);
    expect(kpis.dateRange).toEqual(snapshot.dateRange);
    expect(kpis.players).toBeGreaterThan(0);
    expect(kpis.players).toBeLessThanOrEqual(kpis.entries);
    expect(kpis.rankedArchetypes).toBe(snapshot.stats.filter((s) => s.tier !== "unranked").length);
  });
});

describe("formatDateRange", () => {
  it("drops the repeated year", () => {
    expect(formatDateRange("2026-05-16", "2026-10-10")).toBe("May 16 – Oct 10, 2026");
  });

  it("keeps both years across a new year", () => {
    expect(formatDateRange("2025-12-06", "2026-01-10")).toBe("Dec 6, 2025 – Jan 10, 2026");
  });

  it("prints a single day once", () => {
    expect(formatDateRange("2026-05-16", "2026-05-16")).toBe("May 16, 2026");
  });
});

describe("latestResults", () => {
  const top4 = event("cut", "2026-09-01", {
    topCutSize: 4,
    players: [
      player("eve", 5, "rogue"),
      player("dan", 4, "sand-gaara"),
      player("ann", 1, "akatsuki-pain", { decklist: { leaderId: "NT01-L01", cards: [] } }),
      player("cat", 3, "uchiha-avenger"),
      player("bob", 2, "uzumaki-sage"),
    ],
  });

  it("returns the newest events first, ties by id, limited to count", () => {
    const rows = latestResults(
      [event("old", "2026-01-01"), event("z-same", "2026-03-01"), event("a-same", "2026-03-01"), event("new", "2026-04-01")],
      3,
    );
    expect(rows.map((r) => r.id)).toEqual(["new", "a-same", "z-same"]);
  });

  it("orders the top cut by placement and links the winning list", () => {
    const [row] = latestResults([top4]);
    expect(row!.winner).toEqual({ id: "ann", name: "ann", archetypeId: "akatsuki-pain", deckId: "cut--ann" });
    expect(row!.topCut.map((p) => p.placement)).toEqual([1, 2, 3, 4]);
    expect(row!.topCut.map((p) => p.archetypeId)).toEqual(["akatsuki-pain", "uzumaki-sage", "uchiha-avenger", "sand-gaara"]);
    expect(row!.players).toBe(5);
  });

  it("handles events without a cut, a winner or a published list", () => {
    const [row] = latestResults([event("x", "2026-01-01", { players: [player("ann", 1, "rogue")] })]);
    expect(row!.topCut).toEqual([]);
    expect(row!.winner?.deckId).toBeNull();
    expect(latestResults([event("empty", "2026-01-01")])[0]!.winner).toBeNull();
    expect(latestResults([top4], 0)).toEqual([]);
  });

  it("follows the seed order", () => {
    const rows = latestResults(SEED_TOURNAMENTS, 4);
    expect(rows.map((r) => r.id)).toEqual(SEED_TOURNAMENTS.slice(0, 4).map((t) => t.id));
    for (const row of rows) expect(row.winner).not.toBeNull();
  });
});
