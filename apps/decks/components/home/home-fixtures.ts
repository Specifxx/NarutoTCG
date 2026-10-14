import type { MatchRecord, Tournament, TournamentPlayer } from "@naruto-tcg/types";
import type { DeckSummary } from "@/lib/decks/types";
import type { ArchetypeStats, TierId } from "@/lib/meta/types";

/** Test-only builders (fictional data) for the overview helpers. */

export const player = (id: string, placement: number, archetypeId: string, extra: Partial<TournamentPlayer> = {}): TournamentPlayer => ({
  id,
  name: id.replace(/-/g, " "),
  archetypeId,
  placement,
  ...extra,
});

export const match = (round: number, p1: string, p2: string | null, outcome: MatchRecord["outcome"]): MatchRecord => ({
  round,
  stage: "swiss",
  player1Id: p1,
  player2Id: p2,
  outcome,
});

export function event(id: string, date: string, overrides: Partial<Tournament> = {}): Tournament {
  return {
    id,
    name: `Event ${id}`,
    tier: "store-championship",
    format: "Standard (NT01–NT04)",
    date,
    location: { city: "Testville" },
    organizer: "Fixture Games",
    swissRounds: 3,
    topCutSize: 0,
    bestOf: 3,
    players: [],
    matches: [],
    source: "seed",
    ...overrides,
  };
}

export function deck(id: string, overrides: Partial<DeckSummary> = {}): DeckSummary {
  return {
    id,
    name: `Deck ${id}`,
    archetypeId: "akatsuki-pain",
    leaderId: "NT01-L01",
    source: "community",
    author: { handle: "fixture", name: "Fixture" },
    createdAt: "2026-06-01",
    winRateSource: "playtest",
    votes: 0,
    keyCardIds: [],
    cardIds: [],
    tags: [],
    ...overrides,
  };
}

export function winningDeck(
  eventId: string,
  date: string,
  tier: NonNullable<DeckSummary["tournament"]>["tier"] = "store-championship",
  placement = 1,
): DeckSummary {
  return deck(`${eventId}--p${placement}`, {
    source: "tournament",
    createdAt: date,
    winRateSource: "event",
    tournament: { id: eventId, name: `Event ${eventId}`, tier, date, placement, playerCount: 32, topCutSize: 8 },
  });
}

export function stat(archetypeId: string, tier: TierId, overrides: Partial<ArchetypeStats> = {}): ArchetypeStats {
  return {
    archetypeId,
    entries: 20,
    metaShare: 0.1,
    topCut: 2,
    topCutShare: 0.1,
    conversionRate: 0.1,
    conversionLift: 1,
    eventWins: 0,
    record: { wins: 10, losses: 10, draws: 0 },
    mirrorMatches: 0,
    winRate: 0.5,
    adjustedWinRate: 0.5,
    winRateInterval: [0.3, 0.7],
    points: 0,
    avgPercentile: 0.5,
    score: 50,
    tier,
    ...overrides,
  };
}
