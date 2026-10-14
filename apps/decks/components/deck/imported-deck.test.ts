import type { Tournament } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { tournamentDeckId } from "@/lib/decks/types";
import { sanitizeTournament } from "@/lib/storage/sanitize";
import { findImportedDeck, isImportedDeckId } from "./imported-deck";
import { DECK_KIND_LABEL, authorRole, deckKind, deckPageTitle } from "./deck-meta";

const seed = SEED_TOURNAMENTS[0]!;
const imported: Tournament = { ...seed, id: "local-test-cup-2026-09-12", source: "import" };
const pilot = imported.players.find((player) => player.decklist)!;
const deckId = tournamentDeckId(imported.id, pilot.id);
/** A hand-edited event as the imports store hands it to the page: sanitized. */
const stored = (raw: unknown): Tournament => sanitizeTournament(raw)!;

describe("isImportedDeckId", () => {
  it("recognizes decks from local- events only", () => {
    expect(isImportedDeckId(deckId)).toBe(true);
    expect(isImportedDeckId(tournamentDeckId(seed.id, pilot.id))).toBe(false);
    expect(isImportedDeckId("community--local-thing")).toBe(false);
    expect(isImportedDeckId("local-x")).toBe(false);
  });
});

describe("findImportedDeck", () => {
  it("builds the deck like a seed tournament deck", () => {
    const deck = findImportedDeck([imported], deckId)!;
    expect(deck.id).toBe(deckId);
    expect(deck.decklist).toEqual(pilot.decklist);
    expect(deck.tournament).toMatchObject({ id: imported.id, placement: pilot.placement, tier: imported.tier });
    expect(deck.author.handle).toBe(pilot.id);
  });

  it("returns null for unknown events, players and ids", () => {
    expect(findImportedDeck([imported], tournamentDeckId(imported.id, "nobody"))).toBeNull();
    expect(findImportedDeck([], deckId)).toBeNull();
    expect(findImportedDeck([imported], "not-a-deck-id")).toBeNull();
  });

  it("returns null instead of throwing when an event cannot be built", () => {
    const unreadable = { ...imported, players: [null, ...imported.players] } as unknown as Tournament;
    expect(findImportedDeck([unreadable], deckId)).toBeNull();
  });

  it("opens decks from stored events with a missing tier and cut size", () => {
    const sloppy = stored({ ...imported, tier: "mega-event", topCutSize: -3 });
    const deck = findImportedDeck([sloppy], deckId)!;
    expect(deck.tournament?.tier).toBe("store-championship");
    expect(deck.tournament?.topCutSize).toBe(0);
  });

  it("opens decks the directory lists from hand-edited events: bad matches, players and fields", () => {
    const players = imported.players.map((player) =>
      player.id === pilot.id
        ? ({ ...player, name: "", archetypeId: "not-an-archetype", placement: undefined, country: 7 } as unknown as typeof player)
        : player,
    );
    const sloppy = stored({
      ...imported,
      name: undefined,
      players: [null, { name: "No id" }, ...players, { ...pilot, name: "Duplicate" }],
      matches: [null, { player1Id: pilot.id, outcome: "weird" }, ...imported.matches],
    });
    const deck = findImportedDeck([sloppy], deckId)!;
    expect(deck).not.toBeNull();
    expect(deck.archetypeId).toBe("rogue");
    expect(deck.author).toMatchObject({ handle: pilot.id, name: pilot.id });
    expect(deck.author.country).toBeUndefined();
    expect(deck.tournament?.name).toBe(imported.id);
    expect(deck.tournament?.placement).toBe(Math.max(...imported.players.map((p) => p.placement)) + 1);
    expect(deck.record).toEqual(findImportedDeck([imported], deckId)!.record);
  });

  it("drops malformed decklist entries and lists without a leader", () => {
    const withList = (decklist: unknown) => stored({ ...imported, players: imported.players.map((p) => (p.id === pilot.id ? { ...p, decklist } : p)) });
    const cards = [...pilot.decklist!.cards, { cardId: "", quantity: 2 }, { cardId: "NT01-001", quantity: 0 }, null];
    expect(findImportedDeck([withList({ ...pilot.decklist, cards })], deckId)!.decklist.cards).toEqual(pilot.decklist!.cards);
    expect(findImportedDeck([withList({ cards: pilot.decklist!.cards })], deckId)).toBeNull();
    expect(findImportedDeck([withList("not a list")], deckId)).toBeNull();
  });
});

describe("deck meta", () => {
  it("labels the deck kind and title", () => {
    const deck = findImportedDeck([imported], deckId)!;
    expect(deckKind(deck)).toBe("imported");
    expect(deckKind({ source: "tournament", tournament: { ...deck.tournament!, id: seed.id } })).toBe("tournament");
    expect(deckKind({ source: "community" })).toBe("community");
    expect(DECK_KIND_LABEL.imported).toBe("Imported list");
    expect(deckPageTitle({ name: "Uchiha Avenger", author: { handle: "s", name: "Saga Lindgren" } })).toBe("Uchiha Avenger by Saga Lindgren");
    expect(authorRole({ source: "tournament" })).toBe("Piloted by");
    expect(authorRole({ source: "community" })).toBe("By");
  });
});
