import type { Tournament } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { getSeedTournaments } from "@/lib/data/tournaments";
import { importedDeckSummaries } from "./decks";
import { sanitizeImportedEvent, sanitizeImportedEvents } from "./imported-events";

const seed = getSeedTournaments()[0]!;
const copy = (overrides: Record<string, unknown> = {}) => ({ ...seed, id: "local-copy", ...overrides }) as unknown as Tournament;

describe("sanitizeImportedEvent", () => {
  it("returns a complete event unchanged in substance", () => {
    const clean = sanitizeImportedEvent(copy())!;
    expect(clean.tier).toBe(seed.tier);
    expect(clean.topCutSize).toBe(seed.topCutSize);
    expect(clean.players).toHaveLength(seed.players.length);
    expect(clean.matches).toHaveLength(seed.matches.length);
    expect(clean.players.map((p) => p.placement)).toEqual(seed.players.map((p) => p.placement));
  });

  it("fills a missing tier, top cut and name", () => {
    const clean = sanitizeImportedEvent(copy({ tier: "galactic", topCutSize: "8", name: " " }))!;
    expect(clean.tier).toBe("store-championship");
    expect(clean.topCutSize).toBe(0);
    expect(clean.name).toBe("local-copy");
  });

  it("ranks players without a placement after the known ones and maps unknown archetypes to rogue", () => {
    const [first, second, ...rest] = seed.players;
    const players = [{ ...first, placement: undefined }, { ...second, archetypeId: "made-up" }, ...rest];
    const clean = sanitizeImportedEvent(copy({ players }))!;
    const max = Math.max(...rest.map((p) => p.placement), second!.placement);
    expect(clean.players[0]!.placement).toBe(max + 1);
    expect(clean.players[1]!.archetypeId).toBe("rogue");
  });

  it("skips unreadable players, duplicate ids, malformed decklists and matches", () => {
    const [first, second] = seed.players;
    const players = [null, { name: "No id" }, first, { ...first, name: "Duplicate" }, { ...second, decklist: { leaderId: 3, cards: [] } }];
    const matches = [null, { player1Id: first!.id, player2Id: second!.id, outcome: "maybe" }, { round: 1, stage: "swiss", player1Id: first!.id, player2Id: null, outcome: "p1" }];
    const clean = sanitizeImportedEvent(copy({ players, matches }))!;
    expect(clean.players.map((p) => p.id)).toEqual([first!.id, second!.id]);
    expect(clean.players[0]!.name).toBe(first!.name);
    expect(clean.players[1]!.decklist).toBeUndefined();
    expect(clean.matches).toEqual([{ round: 1, stage: "swiss", player1Id: first!.id, player2Id: null, outcome: "p1" }]);
  });

  it("rejects records without an id", () => {
    expect(sanitizeImportedEvent(copy({ id: "" }))).toBeNull();
    expect(sanitizeImportedEvent(null as unknown as Tournament)).toBeNull();
    expect(sanitizeImportedEvents([copy({ id: 4 }), copy()]).map((t) => t.id)).toEqual(["local-copy"]);
  });
});

describe("imported decks from incomplete events", () => {
  it("never produce NaN votes or undefined tags", () => {
    const decks = importedDeckSummaries([copy({ tier: undefined, topCutSize: undefined })]);
    expect(decks.length).toBeGreaterThan(0);
    for (const deck of decks) {
      expect(Number.isFinite(deck.votes)).toBe(true);
      expect(deck.tags.every((tag) => typeof tag === "string" && !tag.includes("undefined"))).toBe(true);
      expect(deck.tournament?.tier).toBe("store-championship");
    }
  });
});
