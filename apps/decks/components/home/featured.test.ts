import { describe, expect, it } from "vitest";
import { getDeckSummaries } from "@/lib/decks/repository";
import { pickFeaturedDecks } from "./featured";
import { deck, winningDeck } from "./home-fixtures";

describe("pickFeaturedDecks", () => {
  it("picks the newest event winners, one per event", () => {
    const decks = [
      winningDeck("e1", "2026-05-01"),
      winningDeck("e2", "2026-07-01"),
      winningDeck("e2", "2026-07-01", "store-championship", 2),
      winningDeck("e3", "2026-06-01"),
      winningDeck("e4", "2026-04-01"),
      deck("community-1", { votes: 999 }),
    ];
    const { winners } = pickFeaturedDecks(decks);
    expect(winners.map((d) => d.tournament?.id)).toEqual(["e2", "e3", "e1"]);
  });

  it("breaks same-day ties by event prestige", () => {
    const decks = [
      winningDeck("store", "2026-07-01", "store-championship"),
      winningDeck("nats", "2026-07-01", "national-championship"),
      winningDeck("online", "2026-07-01", "online-open"),
    ];
    expect(pickFeaturedDecks(decks).winners.map((d) => d.tournament?.id)).toEqual(["nats", "online", "store"]);
  });

  it("picks the most upvoted community decks, newest first on ties", () => {
    const decks = [
      deck("a", { votes: 10, createdAt: "2026-05-01" }),
      deck("b", { votes: 40 }),
      deck("c", { votes: 10, createdAt: "2026-08-01" }),
      deck("d", { votes: 5 }),
      winningDeck("e1", "2026-05-01"),
    ];
    expect(pickFeaturedDecks(decks).community.map((d) => d.id)).toEqual(["b", "c", "a"]);
  });

  it("respects the requested counts and tolerates short input", () => {
    const decks = [winningDeck("e1", "2026-05-01"), deck("a")];
    expect(pickFeaturedDecks(decks, { winners: 0, community: 5 })).toEqual({ winners: [], community: [decks[1]] });
    expect(pickFeaturedDecks([])).toEqual({ winners: [], community: [] });
  });

  it("finds three winners and three community decks in the seed catalog", () => {
    const { winners, community } = pickFeaturedDecks(getDeckSummaries());
    expect(winners).toHaveLength(3);
    expect(community).toHaveLength(3);
    expect(new Set(winners.map((d) => d.tournament!.id)).size).toBe(3);
    expect(winners.every((d) => d.tournament!.placement === 1)).toBe(true);
    expect(community.every((d) => d.source === "community")).toBe(true);
    expect(community[0]!.votes).toBeGreaterThanOrEqual(community[2]!.votes);
  });
});
