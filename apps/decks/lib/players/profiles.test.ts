import type { MatchRecord, Tournament, TournamentPlayer } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { getArchetype } from "@/lib/data/archetypes";
import { AUTHORS, type Author } from "@/lib/data/authors";
import { COMMUNITY_DECKS } from "@/lib/data/community-decks";
import { buildDeckCatalog, toSummary } from "@/lib/decks/catalog";
import { buildPlayerProfiles } from "./profiles";

const list = (archetypeId: string) => {
  const archetype = getArchetype(archetypeId)!;
  return { leaderId: archetype.leaderIds[0]!, cards: archetype.core.map(([cardId, quantity]) => ({ cardId, quantity })) };
};

const player = (id: string, name: string, archetypeId: string, placement: number, withList: boolean, country = "US"): TournamentPlayer => ({
  id,
  name,
  country,
  archetypeId,
  placement,
  ...(withList ? { decklist: list(archetypeId) } : {}),
});

const m = (round: number, p1: string, p2: string | null, outcome: MatchRecord["outcome"], stage: MatchRecord["stage"] = "swiss"): MatchRecord => ({
  round,
  stage,
  player1Id: p1,
  player2Id: p2,
  outcome,
});

const event = (id: string, date: string, tier: Tournament["tier"], topCutSize: number, players: TournamentPlayer[], matches: MatchRecord[]): Tournament => ({
  id,
  name: `${id} event`,
  tier,
  format: "Standard (NT01–NT03)",
  date,
  location: { online: true },
  organizer: "Fixture Events",
  swissRounds: 2,
  topCutSize,
  bestOf: 3,
  players,
  matches,
  source: "seed",
});

const SPRING = event(
  "spring-open",
  "2026-05-10",
  "online-open",
  2,
  [
    player("ayla-stone", "Ayla Stone", "akatsuki-pain", 1, true),
    player("bram-holt", "Bram Holt", "sand-gaara", 2, true),
    player("cyra-vance", "Cyra Vance", "hyuga-gentle-fist", 3, false),
  ],
  [
    m(1, "ayla-stone", "bram-holt", "p2"),
    m(1, "cyra-vance", null, "bye"),
    m(2, "ayla-stone", "cyra-vance", "p1"),
    m(2, "bram-holt", null, "bye"),
    m(3, "ayla-stone", "bram-holt", "p1", "top-cut"),
  ],
);

const SUMMER = event(
  "summer-store",
  "2026-07-18",
  "store-championship",
  0,
  [
    player("cyra-vance", "Cyra Vance-Ito", "uchiha-avenger", 1, true, "CA"),
    player("ayla-stone", "Ayla Stone", "sand-gaara", 2, false),
  ],
  [m(1, "cyra-vance", "ayla-stone", "p1"), m(2, "cyra-vance", "ayla-stone", "draw")],
);

const TOURNAMENTS = [SUMMER, SPRING];
const DECKS = buildDeckCatalog(TOURNAMENTS, COMMUNITY_DECKS).map(toSummary);

describe("buildPlayerProfiles", () => {
  const profiles = buildPlayerProfiles(TOURNAMENTS, DECKS);

  it("keys every player and author by handle, sorted", () => {
    const handles = [...profiles.keys()];
    expect(handles).toEqual(handles.slice().sort());
    expect(profiles.size).toBe(3 + AUTHORS.length);
    for (const author of AUTHORS) expect(profiles.has(author.handle)).toBe(true);
  });

  it("aggregates results newest first, with byes counted as wins", () => {
    const ayla = profiles.get("ayla-stone")!;
    expect(ayla).toMatchObject({ name: "Ayla Stone", country: "US", isAuthor: false });
    expect(ayla.bio).toBeUndefined();
    expect(ayla.results.map((r) => r.tournamentId)).toEqual(["summer-store", "spring-open"]);
    expect(ayla.results[0]).toEqual({
      tournamentId: "summer-store",
      tournamentName: "summer-store event",
      date: "2026-07-18",
      tier: "store-championship",
      placement: 2,
      playerCount: 2,
      topCutSize: 0,
      archetypeId: "sand-gaara",
      record: { wins: 0, losses: 1, draws: 1 },
    });
    expect(ayla.results[1]).toMatchObject({ placement: 1, record: { wins: 2, losses: 1, draws: 0 }, deckId: "spring-open--ayla-stone" });
    expect(ayla.totals).toEqual({ events: 2, wins: 2, losses: 2, draws: 1, topCuts: 1, eventWins: 1, bestPlacement: 1 });
    expect(ayla.archetypeCounts).toEqual({ "akatsuki-pain": 1, "sand-gaara": 1 });
    expect(ayla.decks.map((d) => d.id)).toEqual(["spring-open--ayla-stone"]);

    const cyra = profiles.get("cyra-vance")!;
    expect(cyra.results[1]).toMatchObject({ tournamentId: "spring-open", record: { wins: 1, losses: 1, draws: 0 } });
    expect(cyra.results[1]).not.toHaveProperty("deckId");
    expect(cyra.totals).toEqual({ events: 2, wins: 2, losses: 1, draws: 1, topCuts: 0, eventWins: 1, bestPlacement: 1 });
  });

  it("takes a player's name and country from their newest event", () => {
    expect(profiles.get("cyra-vance")).toMatchObject({ name: "Cyra Vance-Ito", country: "CA" });
  });

  it("only links decks the catalog holds", () => {
    const withoutCatalog = buildPlayerProfiles(TOURNAMENTS, []);
    for (const profile of withoutCatalog.values()) {
      expect(profile.decks).toEqual([]);
      for (const result of profile.results) expect(result).not.toHaveProperty("deckId");
    }
  });

  it("gives authors their bio and community decks", () => {
    const rhea = profiles.get("rinnegan-rhea")!;
    const author = AUTHORS.find((a) => a.handle === "rinnegan-rhea")!;
    expect(rhea).toMatchObject({ name: author.name, country: author.country, bio: author.bio, joined: author.joined, isAuthor: true });
    expect(rhea.results).toEqual([]);
    expect(rhea.totals).toEqual({ events: 0, wins: 0, losses: 0, draws: 0, topCuts: 0, eventWins: 0, bestPlacement: null });
    expect(rhea.decks.map((d) => d.id)).toEqual(COMMUNITY_DECKS.filter((d) => d.author.handle === "rinnegan-rhea").map((d) => d.id));
    const lev = profiles.get("lightning-lev")!;
    expect(lev.decks.map((d) => d.createdAt)).toEqual(["2026-09-21", "2026-06-20"]);
  });

  it("merges a player and an author sharing a handle", () => {
    const authors: Author[] = [
      { handle: "bram-holt", name: "Bram Holt", country: "NZ", bio: "Writes Gaara primers.", joined: "2026-01-02", specialties: ["sand-gaara"] },
    ];
    const merged = buildPlayerProfiles(TOURNAMENTS, DECKS, authors);
    expect(merged.size).toBe(3);
    expect(merged.get("bram-holt")).toMatchObject({
      country: "NZ",
      bio: "Writes Gaara primers.",
      isAuthor: true,
      totals: { events: 1, wins: 2, losses: 1, draws: 0, topCuts: 1, eventWins: 0, bestPlacement: 2 },
    });
    expect(merged.get("bram-holt")!.decks.map((d) => d.id)).toEqual(["spring-open--bram-holt"]);
  });
});
