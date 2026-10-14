import { describe, expect, it } from "vitest";
import { getSeedComments } from "@/lib/data/comments";
import { getSeedSnapshot, getSeedTier } from "@/lib/data/meta";
import { toSummary } from "@/lib/decks/catalog";
import { getDeckCatalog } from "@/lib/decks/repository";
import { buildSeedDeckContext, seedTierMap } from "./server-context";

const decks = getDeckCatalog();
const community = decks.find((deck) => deck.source === "community" && Object.keys(deck.matchupNotes ?? {}).length > 0)!;
const winner = decks.find((deck) => deck.tournament?.placement === 1)!;

describe("buildSeedDeckContext", () => {
  it("is plain JSON", () => {
    const context = buildSeedDeckContext(winner);
    expect(JSON.parse(JSON.stringify(context))).toEqual(context);
  });

  it("carries the tier, the seed comments and the matrix settings", () => {
    const context = buildSeedDeckContext(winner);
    const snapshot = getSeedSnapshot();
    expect(context.tier).toBe(getSeedTier(winner.archetypeId));
    expect(context.comments).toEqual(getSeedComments(toSummary(winner)));
    expect(context.minGames).toBe(snapshot.matrix.minGames);
    expect(context.eventCount).toBe(snapshot.meta.tournamentCount);
  });

  it("lists opponents most-played first, without the mirror", () => {
    const { matchups } = buildSeedDeckContext(winner);
    const entries = getSeedSnapshot().meta.archetypes;
    expect(matchups.length).toBeGreaterThan(0);
    expect(matchups.some((m) => m.opponentId === winner.archetypeId)).toBe(false);
    const played = matchups.map((m) => entries[m.opponentId]?.entries ?? 0);
    expect(played).toEqual([...played].sort((a, b) => b - a));
    expect(matchups.every((m) => m.guide !== null)).toBe(true);
  });

  it("covers every opponent the author wrote notes about", () => {
    const { matchups } = buildSeedDeckContext(community);
    const opponents = new Set(matchups.map((m) => m.opponentId));
    for (const id of Object.keys(community.matchupNotes!)) {
      if (id !== community.archetypeId) expect(opponents.has(id)).toBe(true);
    }
  });
});

describe("seedTierMap", () => {
  it("maps archetypes to their seed tier", () => {
    const tiers = seedTierMap();
    expect(tiers[winner.archetypeId]).toBe(getSeedTier(winner.archetypeId));
  });
});
