import { describe, expect, it } from "vitest";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { buildTournamentDecks, toSummary } from "@/lib/decks/catalog";
import type { Tournament } from "@naruto-tcg/types";
import { buildBracket } from "./bracket";
import { buildStandings, eventMetaBreakdown } from "./event";
import { eventRounds } from "./rounds";
import { normalizeTournament, structureLabel, summarize } from "./summary";
import { fixtureTournament } from "./test-fixtures";

describe("summarize", () => {
  it("reduces an event to its directory row", () => {
    const summary = summarize(fixtureTournament());
    expect(summary).toEqual({
      id: "fixture-open",
      name: "Fixture Store Championship — Testville",
      tier: "store-championship",
      date: "2026-09-12",
      location: { city: "Testville", region: "OR", country: "US", venue: "Fixture Games" },
      organizer: "Fixture Games",
      format: "Standard (NT01–NT04)",
      players: 8,
      swissRounds: 3,
      topCutSize: 4,
      matches: 14,
      decklists: 4,
      winner: { id: "ann-a", name: "Ann Aoki", archetypeId: "akatsuki-pain" },
      topCutArchetypeIds: ["akatsuki-pain", "uchiha-avenger", "akatsuki-pain", "medical-ninja"],
      source: "seed",
    });
  });

  it("orders the top cut by placement whatever the player order", () => {
    const t = fixtureTournament();
    const summary = summarize({ ...t, players: t.players.slice().reverse() });
    expect(summary.winner?.id).toBe("ann-a");
    expect(summary.topCutArchetypeIds).toEqual(["akatsuki-pain", "uchiha-avenger", "akatsuki-pain", "medical-ninja"]);
  });

  it("handles events without a cut, players or results", () => {
    const summary = summarize(fixtureTournament({ topCutSize: 0, players: [], matches: [], source: "import" }));
    expect(summary.winner).toBeNull();
    expect(summary.topCutArchetypeIds).toEqual([]);
    expect(summary.matches).toBe(0);
    expect(summary.source).toBe("import");
  });

  it("is plain serializable data for every seed event", () => {
    for (const t of SEED_TOURNAMENTS) {
      const summary = summarize(t);
      expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
      expect(summary.topCutArchetypeIds).toHaveLength(t.topCutSize);
      expect(summary.winner).not.toBeNull();
    }
  });
});

describe("structureLabel", () => {
  it("describes Swiss plus cut", () => {
    expect(structureLabel(7, 8)).toBe("7 rounds + Top 8");
    expect(structureLabel(1, 4)).toBe("1 round + Top 4");
  });
  it("handles Swiss-only and cut-only events", () => {
    expect(structureLabel(5, 0)).toBe("5 rounds");
    expect(structureLabel(0, 8)).toBe("Top 8 bracket");
    expect(structureLabel(0, 0)).toBe("—");
  });
});

describe("normalizeTournament", () => {
  it("returns complete records unchanged", () => {
    const t = fixtureTournament();
    expect(normalizeTournament(t)).toBe(t);
    for (const seed of SEED_TOURNAMENTS) expect(normalizeTournament(seed)).toBe(seed);
  });

  it("fills fields a stored import can lack", () => {
    const broken = { ...fixtureTournament(), tier: "mystery", location: undefined, organizer: 4, format: "", swissRounds: -1, topCutSize: "8", bestOf: 5, source: "x" };
    const fixed = normalizeTournament(broken as unknown as Tournament);
    expect(fixed).toMatchObject({
      tier: "store-championship",
      location: {},
      organizer: "Unknown organizer",
      format: "Unknown format",
      swissRounds: 0,
      topCutSize: 0,
      bestOf: 3,
      source: "import",
    });
    expect(fixed.players).toHaveLength(8);
    expect(() => summarize(fixed)).not.toThrow();
  });

  it("repairs broken players, matches and text fields so every view helper can run", () => {
    const t = fixtureTournament();
    const broken = {
      ...t,
      notes: { text: "not a string" },
      importedAt: 42,
      location: { city: "Testville", venue: { name: "Hall" }, online: "yes" },
      players: [
        null,
        { name: "No Id", archetypeId: "rogue", placement: 9 },
        t.players[0],
        { ...t.players[1], decklist: { leaderId: "NT02-L02", cards: [null, { cardId: "NT02-009", quantity: 4 }] } },
        { ...t.players[2], decklist: { cards: "nope" } },
        { id: "zed", placement: "first" },
        { id: "ann-a", name: "Duplicate Ann", archetypeId: "rogue", placement: 12 },
        ...t.players.slice(3),
      ],
      matches: [
        ...t.matches,
        null,
        { round: 1, stage: "swiss", player1Id: "", player2Id: "ben-b", outcome: "p1" },
        { round: 0, stage: "swiss", player1Id: "ann-a", player2Id: "ben-b", outcome: "p1" },
        { round: 2, stage: "swiss", player1Id: "zed", player2Id: "cal-c", outcome: "won" },
        { round: 2, stage: "elimination", table: "9", player1Id: "zed", player2Id: "fay-f", outcome: "p2", games: { p1: "x" } },
        { round: 3, stage: "swiss", player1Id: "zed", outcome: "p1" },
        { round: 3, stage: "swiss", player1Id: "hal-h", player2Id: "eve-e", outcome: "bye" },
      ],
    };
    const fixed = normalizeTournament(broken as unknown as Tournament);
    expect(fixed).not.toHaveProperty("notes");
    expect(fixed).not.toHaveProperty("importedAt");
    expect(fixed.location).toEqual({ city: "Testville" });

    expect(fixed.players.map((p) => p.id)).toEqual(["ann-a", "ben-b", "dee-d", "zed", "gus-g", "fay-f", "cal-c", "eve-e", "hal-h"]);
    expect(fixed.players[0]).toBe(t.players[0]);
    expect(fixed.players[1]!.decklist?.cards).toEqual([{ cardId: "NT02-009", quantity: 4 }]);
    expect(fixed.players[2]).not.toHaveProperty("decklist");
    expect(fixed.players[3]).toEqual({ id: "zed", name: "zed", archetypeId: "rogue", placement: 9 });

    const extra = fixed.matches.slice(t.matches.length);
    expect(extra).toEqual([
      { round: 2, stage: "swiss", player1Id: "zed", player2Id: "fay-f", outcome: "p2" },
      { round: 3, stage: "swiss", player1Id: "zed", player2Id: null, outcome: "bye" },
      { round: 3, stage: "swiss", player1Id: "hal-h", player2Id: null, outcome: "bye" },
    ]);

    expect(() => {
      const standings = buildStandings(fixed);
      buildBracket(fixed.matches, new Map(standings.map((r) => [r.playerId, r.swissRank ?? 0])));
      eventRounds(fixed.matches);
      eventMetaBreakdown(fixed.players, fixed.topCutSize);
      buildTournamentDecks([fixed]).map(toSummary);
      summarize(fixed);
    }).not.toThrow();
  });

  it("keeps a well-formed import as the same object", () => {
    const t = fixtureTournament({ source: "import", notes: "Fine", importedAt: "2026-09-13T10:00:00Z", location: { online: true } });
    expect(normalizeTournament(t)).toBe(t);
  });
});
