import type { MatchRecord, Tournament, TournamentPlayer } from "@naruto-tcg/types";

/**
 * Test-only event (fictional): 8 players, 3 Swiss rounds, Top 4. Swiss seeds work out to
 * ann 1, dee 2, ben 3, gus 4; the semifinal tables are deliberately out of bracket order.
 */

const player = (id: string, name: string, placement: number, archetypeId: string, extra: Partial<TournamentPlayer> = {}): TournamentPlayer => ({
  id,
  name,
  archetypeId,
  placement,
  ...extra,
});

const match = (
  stage: MatchRecord["stage"],
  round: number,
  table: number,
  p1: string,
  p2: string | null,
  outcome: MatchRecord["outcome"],
  games?: [number, number],
  extra: Partial<MatchRecord> = {},
): MatchRecord => ({
  round,
  stage,
  table,
  player1Id: p1,
  player2Id: p2,
  outcome,
  ...(games ? { games: { p1: games[0], p2: games[1] } } : {}),
  ...extra,
});

const DECKLIST = { leaderId: "NT02-L02", cards: [{ cardId: "NT02-009", quantity: 4 }] };

export function fixtureTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: "fixture-open",
    name: "Fixture Store Championship — Testville",
    tier: "store-championship",
    format: "Standard (NT01–NT04)",
    date: "2026-09-12",
    location: { city: "Testville", region: "OR", country: "US", venue: "Fixture Games" },
    organizer: "Fixture Games",
    swissRounds: 3,
    topCutSize: 4,
    bestOf: 3,
    source: "seed",
    players: [
      player("ann-a", "Ann Aoki", 1, "akatsuki-pain", { decklist: DECKLIST, country: "US" }),
      player("ben-b", "Ben Brandt", 2, "uchiha-avenger", { decklist: DECKLIST }),
      player("dee-d", "Dee Duarte", 3, "akatsuki-pain", { decklist: DECKLIST }),
      player("gus-g", "Gus Grieve", 4, "medical-ninja", { decklist: DECKLIST }),
      player("fay-f", "Fay Foster", 5, "uchiha-avenger"),
      player("cal-c", "Cal Cho", 6, "sannin-summons"),
      player("eve-e", "Eve Ekström", 7, "rogue"),
      player("hal-h", "Hal Hart", 8, "medical-ninja", { dropped: true }),
    ],
    matches: [
      match("swiss", 1, 1, "ann-a", "hal-h", "p1", [2, 0]),
      match("swiss", 1, 2, "ben-b", "gus-g", "p1", [2, 1]),
      match("swiss", 1, 3, "cal-c", "fay-f", "p1", [2, 1]),
      match("swiss", 1, 4, "dee-d", "eve-e", "p1", [2, 0]),
      match("swiss", 2, 1, "ann-a", "ben-b", "p1", [2, 1]),
      match("swiss", 2, 2, "cal-c", "dee-d", "p2", [1, 2]),
      match("swiss", 2, 3, "eve-e", "fay-f", "draw", [1, 1]),
      match("swiss", 2, 4, "gus-g", "hal-h", "p1", [2, 0]),
      match("swiss", 3, 1, "ann-a", "dee-d", "draw", undefined, { intentionalDraw: true }),
      match("swiss", 3, 2, "ben-b", "cal-c", "p1", [2, 0]),
      match("swiss", 3, 3, "eve-e", "gus-g", "p2", [0, 2]),
      match("swiss", 3, 4, "fay-f", null, "bye"),
      match("top-cut", 4, 1, "dee-d", "ben-b", "p2", [1, 2]),
      match("top-cut", 4, 2, "ann-a", "gus-g", "p1", [2, 0]),
      match("top-cut", 5, 1, "ann-a", "ben-b", "p1", [2, 1]),
    ],
    ...overrides,
  };
}
