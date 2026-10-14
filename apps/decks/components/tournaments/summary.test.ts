import { describe, expect, it } from "vitest";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import type { Tournament } from "@naruto-tcg/types";
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
});
