import { describe, expect, it } from "vitest";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { buildTournamentDecks, toSummary } from "@/lib/decks/catalog";
import { sanitizeTournament } from "@/lib/storage/sanitize";
import { buildBracket } from "./bracket";
import { buildStandings, eventMetaBreakdown } from "./event";
import { eventRounds } from "./rounds";
import { countPlayedMatches, structureLabel, summarize } from "./summary";
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
      // 15 pairings less one bye and one intentional draw.
      matches: 13,
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

describe("countPlayedMatches", () => {
  it("leaves out byes, intentional draws and unregistered opponents", () => {
    const t = fixtureTournament();
    expect(t.matches).toHaveLength(15);
    expect(countPlayedMatches(t)).toBe(13);
    const ghost = { round: 1, stage: "swiss" as const, player1Id: "ann-a", player2Id: "nobody", outcome: "p1" as const };
    expect(countPlayedMatches({ ...t, matches: [...t.matches, ghost] })).toBe(13);
    expect(countPlayedMatches({ players: [], matches: [] })).toBe(0);
  });

  it("matches the meta engine's count on every seed event", () => {
    let all = 0;
    let played = 0;
    for (const t of SEED_TOURNAMENTS) {
      all += t.matches.filter((m) => m.outcome !== "bye" && m.player2Id !== null).length;
      played += summarize(t).matches;
      expect(summarize(t).matches).toBe(countPlayedMatches(t));
    }
    // The seed has intentional draws, so the played count is strictly lower than the pairing count.
    expect(played).toBeLessThan(all);
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

describe("hand-edited imports", () => {
  // The cases the imports store's sanitizer repairs are covered in lib/storage/sanitize.test.ts;
  // this checks that the event views can run on what it hands them.
  it("every view helper runs on a broken stored record once the store has sanitized it", () => {
    const t = fixtureTournament();
    const missingFields = { ...t, tier: "mystery", location: undefined, organizer: 4, format: "", swissRounds: -1, topCutSize: "8", bestOf: 5, source: "x" };
    const brokenRows = {
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
    for (const broken of [missingFields, brokenRows]) {
      const fixed = sanitizeTournament(broken)!;
      expect(fixed).not.toBeNull();
      expect(() => {
        const standings = buildStandings(fixed);
        buildBracket(fixed.matches, new Map(standings.map((r) => [r.playerId, r.swissRank ?? 0])));
        eventRounds(fixed.matches);
        eventMetaBreakdown(fixed.players, fixed.topCutSize);
        buildTournamentDecks([fixed]).map(toSummary);
        summarize(fixed);
      }).not.toThrow();
    }
  });
});
