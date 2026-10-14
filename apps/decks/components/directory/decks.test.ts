import type { Tournament } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { getSeedTournaments } from "@/lib/data/tournaments";
import { normalizeSearchText } from "@/lib/decks/catalog";
import { getDeckSummaries } from "@/lib/decks/repository";
import type { DeckSummary } from "@/lib/decks/types";
import { IMPORTED_TAG, cardOptionsFor, featuredDecks, importedDeckSummaries, matchCardOptions, mergeDecks } from "./decks";

const seed = getDeckSummaries();

function importedCopy(): Tournament {
  const source = getSeedTournaments()[0]!;
  return { ...source, id: "my-local-event", name: "My Local Event" };
}

describe("importedDeckSummaries", () => {
  it("builds tagged directory rows for imported events", () => {
    const decks = importedDeckSummaries([importedCopy()]);
    expect(decks.length).toBeGreaterThan(0);
    for (const deck of decks) {
      expect(deck.tags[0]).toBe(IMPORTED_TAG);
      expect(deck.tournament?.id).toBe("my-local-event");
      expect(deck).not.toHaveProperty("decklist");
    }
  });

  it("skips events that cannot be built", () => {
    const broken = { id: "x", name: "X", date: "2026-01-01", players: [null], matches: [] } as unknown as Tournament;
    expect(importedDeckSummaries([broken, importedCopy()]).every((deck) => deck.tournament?.id === "my-local-event")).toBe(true);
  });
});

describe("mergeDecks", () => {
  it("keeps the first row per id", () => {
    const first = seed[0]!;
    const dupe: DeckSummary = { ...first, name: "Imported copy" };
    const merged = mergeDecks(seed, [dupe]);
    expect(merged).toHaveLength(seed.length);
    expect(merged.find((deck) => deck.id === first.id)?.name).toBe(first.name);
  });

  it("appends new ids", () => {
    const imported = importedDeckSummaries([importedCopy()]);
    expect(mergeDecks(seed, imported)).toHaveLength(seed.length + imported.length);
  });
});

describe("featuredDecks", () => {
  it("picks the newest winners and the most upvoted community decks", () => {
    const { winners, community } = featuredDecks(seed);
    expect(winners).toHaveLength(3);
    expect(winners.every((deck) => deck.tournament?.placement === 1)).toBe(true);
    const dates = winners.map((deck) => deck.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);

    expect(community).toHaveLength(3);
    expect(community.every((deck) => deck.source === "community")).toBe(true);
    const votes = community.map((deck) => deck.votes);
    expect([...votes].sort((a, b) => b - a)).toEqual(votes);
    const best = Math.max(...seed.filter((deck) => deck.source === "community").map((deck) => deck.votes));
    expect(votes[0]).toBe(best);
  });

  it("returns empty lists for an empty catalog", () => {
    expect(featuredDecks([])).toEqual({ winners: [], community: [] });
  });
});

describe("card options", () => {
  const options = cardOptionsFor(seed);

  it("lists each card in any deck once, sorted by name", () => {
    const ids = new Set(seed.flatMap((deck) => deck.cardIds));
    expect(options).toHaveLength(ids.size);
    expect(new Set(options.map((option) => option.id)).size).toBe(options.length);
    const names = options.map((option) => normalizeSearchText(option.name));
    expect(names.every((name, i) => i === 0 || names[i - 1]! <= name)).toBe(true);
  });

  it("extends a base list without duplicating it", () => {
    const base = options.slice(0, 5);
    expect(cardOptionsFor(seed, base)).toHaveLength(options.length);
  });

  it("matches word prefixes of names and ids, best matches first", () => {
    const kakashi = matchCardOptions(options, "kakashi");
    expect(kakashi.length).toBeGreaterThan(0);
    expect(kakashi.every((option) => option.name.toLowerCase().includes("kakashi"))).toBe(true);

    const byId = matchCardOptions(options, "NT01-L01");
    expect(byId[0]?.id).toBe("NT01-L01");

    expect(matchCardOptions(options, "zzzz")).toEqual([]);
  });

  it("leaves out selected cards and respects the limit", () => {
    const all = matchCardOptions(options, "", [], 1000);
    expect(all).toHaveLength(options.length);
    const first = all[0]!.id;
    expect(matchCardOptions(options, "", [first], 5).map((o) => o.id)).not.toContain(first);
    expect(matchCardOptions(options, "", [], 5)).toHaveLength(5);
  });

  it("ranks names that start with the query above mid-name matches", () => {
    const sample = [
      { id: "A", name: "Great Toad Gamabunta" },
      { id: "B", name: "Gamabunta Summon" },
    ];
    expect(matchCardOptions(sample, "gamabunta").map((o) => o.id)).toEqual(["B", "A"]);
  });
});
