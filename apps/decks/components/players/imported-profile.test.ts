import type { Tournament } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { IMPORTED_TAG } from "@/components/directory/decks";
import { getSeedTournaments } from "@/lib/data/tournaments";
import { sanitizeTournament } from "@/lib/storage/sanitize";
import { importedPlayerProfile } from "./imported-profile";

/** A seed event re-keyed as an import whose players are unknown to the seed. */
function importedEvent(id: string, source = getSeedTournaments()[0]!): Tournament {
  const rename = (playerId: string) => `imp-${playerId}`;
  return {
    ...source,
    id,
    name: `Imported ${id}`,
    source: "import",
    players: source.players.map((player) => ({ ...player, id: rename(player.id) })),
    matches: source.matches.map((match) => ({
      ...match,
      player1Id: rename(match.player1Id),
      player2Id: match.player2Id === null ? null : rename(match.player2Id),
    })),
  };
}

describe("importedPlayerProfile", () => {
  const event = importedEvent("local-a");
  const winner = event.players.find((player) => player.placement === 1)!;

  it("builds the profile of a player who only appears in imported events", () => {
    const profile = importedPlayerProfile([event], winner.id)!;
    expect(profile).not.toBeNull();
    expect(profile.name).toBe(winner.name);
    expect(profile.isAuthor).toBe(false);
    expect(profile.totals.events).toBe(1);
    expect(profile.totals.eventWins).toBe(1);
    expect(profile.results[0]).toMatchObject({ tournamentId: "local-a", placement: 1 });
  });

  it("links the player's imported decklist and tags it as imported", () => {
    const profile = importedPlayerProfile([event], winner.id)!;
    expect(winner.decklist).toBeDefined();
    expect(profile.decks).toHaveLength(1);
    expect(profile.decks[0]!.tags[0]).toBe(IMPORTED_TAG);
    expect(profile.results[0]!.deckId).toBe(profile.decks[0]!.id);
  });

  it("merges results across imported events, newest first", () => {
    const older = { ...importedEvent("local-b"), date: "2020-01-01" };
    const profile = importedPlayerProfile([older, event], winner.id)!;
    expect(profile.totals.events).toBe(2);
    expect(profile.results.map((result) => result.tournamentId)).toEqual(["local-a", "local-b"]);
  });

  it("is null for unknown handles, empty storage and unreadable events", () => {
    expect(importedPlayerProfile([event], "nobody-here")).toBeNull();
    expect(importedPlayerProfile([], winner.id)).toBeNull();
    expect(importedPlayerProfile([event], "")).toBeNull();
    expect(importedPlayerProfile([{ id: "", players: [] } as unknown as Tournament], winner.id)).toBeNull();
  });

  it("survives stored events with missing fields once the imports store has sanitized them", () => {
    const { tier, topCutSize, ...rest } = event;
    void tier;
    void topCutSize;
    const profile = importedPlayerProfile([sanitizeTournament(rest)!], winner.id)!;
    expect(profile.results[0]).toMatchObject({ tier: "store-championship", topCutSize: 0 });
    expect(Number.isFinite(profile.decks[0]!.votes)).toBe(true);
  });
});
