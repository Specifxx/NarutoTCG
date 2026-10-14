import type { Decklist, MatchRecord, Tournament, TournamentPlayer } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { getArchetype } from "@/lib/data/archetypes";
import { COMMUNITY_DECKS } from "@/lib/data/community-decks";
import { isDecklistLegal, mainDeckSize } from "@/lib/decks/legality";
import { parseDeckId, type DeckSummary } from "@/lib/decks/types";
import { RULES } from "@/lib/rules";
import { buildDeckCatalog, buildTournamentDecks, deckCardIds, pickKeyCardIds, searchDecks, toSummary } from "./catalog";
import { getAllPlayerHandles, getDeck, getDeckCatalog, getDeckSummaries, getDecksForArchetype, getPlayerProfile } from "./repository";

/** A legal list from an archetype template: the 40-card core plus flex cards in order. */
function templateList(archetypeId: string, leaderId?: string): Decklist {
  const archetype = getArchetype(archetypeId)!;
  const cards = archetype.core.map(([cardId, quantity]) => ({ cardId, quantity }));
  let remaining = RULES.mainDeckSize - mainDeckSize({ leaderId: "", cards });
  for (const [cardId, weight] of archetype.flex) {
    if (remaining === 0) break;
    const quantity = Math.min(weight, remaining);
    cards.push({ cardId, quantity });
    remaining -= quantity;
  }
  return { leaderId: leaderId ?? archetype.leaderIds[0]!, cards };
}

const player = (id: string, name: string, archetypeId: string, placement: number, list = true, extra: Partial<TournamentPlayer> = {}): TournamentPlayer => ({
  id,
  name,
  country: "US",
  archetypeId,
  placement,
  ...(list ? { decklist: templateList(archetypeId) } : {}),
  ...extra,
});

const m = (round: number, p1: string, p2: string | null, outcome: MatchRecord["outcome"], extra: Partial<MatchRecord> = {}): MatchRecord => ({
  round,
  stage: round > 3 ? "top-cut" : "swiss",
  player1Id: p1,
  player2Id: p2,
  outcome,
  ...extra,
});

/** Five players, three Swiss rounds with byes, an intentional and an unintentional draw, then a top 4. */
const REGIONAL: Tournament = {
  id: "fixture-regional",
  name: "Fixture Regional Championship — Springfield",
  tier: "regional-championship",
  format: "Standard (NT01–NT03)",
  date: "2026-06-20",
  location: { city: "Springfield", country: "US" },
  organizer: "Fixture Events",
  swissRounds: 3,
  topCutSize: 4,
  bestOf: 3,
  players: [
    player("ayla-stone", "Ayla Stone", "akatsuki-pain", 2),
    player("bram-holt", "Bram Holt", "sand-gaara", 5, false),
    player("cyra-vance", "Cyra Vance", "hyuga-gentle-fist", 3),
    player("dov-lind", "Dov Lind", "uchiha-avenger", 4),
    player("esme-quill", "Esme Quill", "uzumaki-sage", 1),
  ],
  matches: [
    m(1, "ayla-stone", "bram-holt", "p1"),
    m(1, "cyra-vance", "dov-lind", "p2"),
    m(1, "esme-quill", null, "bye"),
    m(2, "ayla-stone", "dov-lind", "p1"),
    m(2, "bram-holt", "esme-quill", "p1"),
    m(2, "cyra-vance", null, "bye"),
    m(3, "ayla-stone", "esme-quill", "draw", { intentionalDraw: true }),
    m(3, "bram-holt", "cyra-vance", "draw"),
    m(3, "dov-lind", null, "bye"),
    m(4, "ayla-stone", "dov-lind", "p1"),
    m(4, "cyra-vance", "esme-quill", "p2"),
    m(5, "ayla-stone", "esme-quill", "p2"),
  ],
  source: "seed",
};

/** No cut; one rogue list, one player who only received a bye and one who never played. */
const STORE: Tournament = {
  id: "fixture-store",
  name: "Fixture Store Championship — Shelbyville",
  tier: "store-championship",
  format: "Standard (NT01–NT03)",
  date: "2026-07-04",
  location: { city: "Shelbyville", country: "US" },
  organizer: "Fixture Games",
  swissRounds: 2,
  topCutSize: 0,
  bestOf: 1,
  players: [
    player("hal-moreno", "Hal Moreno", "rogue", 3, false, { decklist: templateList("rogue", "NT02-L05") }),
    player("ayla-stone", "Ayla Stone", "akatsuki-pain", 2),
    player("iris-tanaka", "Iris Tanaka", "sand-gaara", 1),
    player("jun-park", "Jun Park", "medical-ninja", 4, true, { dropped: true }),
  ],
  matches: [
    m(1, "ayla-stone", "hal-moreno", "p1"),
    m(1, "iris-tanaka", null, "bye"),
    m(2, "ayla-stone", "iris-tanaka", "p2"),
    m(2, "hal-moreno", null, "bye"),
  ],
  source: "seed",
};

const TOURNAMENTS = [REGIONAL, STORE];
const byId = <T extends DeckSummary>(decks: readonly T[]) => new Map(decks.map((deck) => [deck.id, deck]));

describe("fixtures", () => {
  it("use legal lists", () => {
    for (const t of TOURNAMENTS) for (const p of t.players) if (p.decklist) expect(isDecklistLegal(p.decklist)).toBe(true);
  });
});

describe("buildTournamentDecks", () => {
  const decks = buildTournamentDecks(TOURNAMENTS);
  const deck = byId(decks);

  it("builds one deck per published list, events in order and best finish first", () => {
    expect(decks.map((d) => d.id)).toEqual([
      "fixture-regional--esme-quill",
      "fixture-regional--ayla-stone",
      "fixture-regional--cyra-vance",
      "fixture-regional--dov-lind",
      "fixture-store--iris-tanaka",
      "fixture-store--ayla-stone",
      "fixture-store--hal-moreno",
      "fixture-store--jun-park",
    ]);
    for (const d of decks) {
      const parsed = parseDeckId(d.id);
      expect(parsed).toEqual({ kind: "tournament", tournamentId: d.tournament!.id, playerId: d.author.handle });
    }
  });

  it("copies identity, event and list", () => {
    const winner = deck.get("fixture-regional--esme-quill")!;
    expect(winner).toMatchObject({
      name: "Uzumaki Sage Mode",
      archetypeId: "uzumaki-sage",
      leaderId: "NT03-L01",
      source: "tournament",
      author: { handle: "esme-quill", name: "Esme Quill", country: "US" },
      createdAt: "2026-06-20",
      tournament: {
        id: "fixture-regional",
        name: REGIONAL.name,
        tier: "regional-championship",
        date: "2026-06-20",
        placement: 1,
        playerCount: 5,
        topCutSize: 4,
      },
      winRateSource: "event",
    });
    expect(winner.decklist).toBe(REGIONAL.players[4]!.decklist);
    expect(deck.get("fixture-store--hal-moreno")!.name).toBe("Zabuza Momochi Rogue");
  });

  it("counts byes as wins in the record but excludes byes and intentional draws from the win rate", () => {
    // Esme: bye, loss, ID, then wins both top cut rounds. Games that count: 2 wins, 1 loss.
    expect(deck.get("fixture-regional--esme-quill")).toMatchObject({ record: { wins: 3, losses: 1, draws: 1 } });
    expect(deck.get("fixture-regional--esme-quill")!.winRate).toBeCloseTo(2 / 3, 10);
    // Ayla: W, W, ID, W, L.
    expect(deck.get("fixture-regional--ayla-stone")).toMatchObject({ record: { wins: 3, losses: 1, draws: 1 }, winRate: 0.75 });
    // Cyra: L, bye, unintentional draw (counts half), L.
    expect(deck.get("fixture-regional--cyra-vance")).toMatchObject({ record: { wins: 1, losses: 2, draws: 1 } });
    expect(deck.get("fixture-regional--cyra-vance")!.winRate).toBeCloseTo(0.5 / 3, 10);
    // Hal only won a bye: a 1-1 record but no won games.
    expect(deck.get("fixture-store--hal-moreno")).toMatchObject({ record: { wins: 1, losses: 1, draws: 0 }, winRate: 0 });
    // Jun never played.
    expect(deck.get("fixture-store--jun-park")!.record).toBeUndefined();
    expect(deck.get("fixture-store--jun-park")!.winRate).toBeUndefined();
  });

  it("tags placement, tier and winners", () => {
    expect(deck.get("fixture-regional--esme-quill")!.tags).toEqual(["Winner", "Regional Championship", "Tournament ready"]);
    expect(deck.get("fixture-regional--ayla-stone")!.tags).toEqual(["Finalist", "Regional Championship"]);
    expect(deck.get("fixture-regional--dov-lind")!.tags).toEqual(["Top 4", "Regional Championship"]);
    expect(deck.get("fixture-store--hal-moreno")!.tags).toEqual(["3rd", "Store Championship"]);
  });

  it("derives votes deterministically from tier and placement", () => {
    const again = byId(buildTournamentDecks(TOURNAMENTS));
    for (const d of decks) expect(again.get(d.id)!.votes).toBe(d.votes);
    const votes = (id: string) => deck.get(id)!.votes;
    expect(votes("fixture-regional--esme-quill")).toBeGreaterThanOrEqual(85);
    expect(votes("fixture-regional--esme-quill")).toBeLessThanOrEqual(122);
    expect(votes("fixture-regional--esme-quill")).toBeGreaterThan(votes("fixture-regional--dov-lind"));
    expect(votes("fixture-store--iris-tanaka")).toBeGreaterThanOrEqual(17);
    expect(votes("fixture-store--iris-tanaka")).toBeLessThanOrEqual(25);
    for (const d of decks) expect(d.votes).toBeGreaterThanOrEqual(1);
  });

  it("lists the Leader and unique card ids, and highlights signature cards", () => {
    for (const d of decks) {
      expect(d.cardIds).toEqual(deckCardIds(d.decklist));
      expect(d.cardIds[0]).toBe(d.leaderId);
      expect(new Set(d.cardIds).size).toBe(d.cardIds.length);
      expect(d.keyCardIds.length).toBeLessThanOrEqual(3);
      for (const id of d.keyCardIds) expect(d.cardIds).toContain(id);
    }
    const sage = deck.get("fixture-regional--esme-quill")!;
    const signature = getArchetype("uzumaki-sage")!.signatureCardIds;
    expect(sage.keyCardIds).toHaveLength(3);
    for (const id of sage.keyCardIds) expect(signature).toContain(id);
    // Rarest first: Minato (secret rare) leads the Sage highlights.
    expect(sage.keyCardIds[0]).toBe("NT03-004");
  });
});

describe("pickKeyCardIds", () => {
  it("falls back to the rarest cards when the archetype has no signature cards", () => {
    const list = templateList("rogue", "NT02-L05");
    const keys = pickKeyCardIds(list, "rogue");
    expect(keys).toHaveLength(3);
    expect(keys[0]).toBe("NT02-036");
  });

  it("skips unknown cards and respects the limit", () => {
    expect(pickKeyCardIds({ leaderId: "NT02-L02", cards: [{ cardId: "nope", quantity: 4 }, { cardId: "NT02-014", quantity: 1 }] }, "akatsuki-pain", 2)).toEqual([
      "NT02-014",
    ]);
  });
});

describe("buildDeckCatalog / toSummary", () => {
  it("merges tournament and community decks, newest first", () => {
    const catalog = buildDeckCatalog(TOURNAMENTS);
    expect(catalog).toHaveLength(8 + COMMUNITY_DECKS.length);
    for (let i = 1; i < catalog.length; i++) expect(catalog[i - 1]!.createdAt >= catalog[i]!.createdAt).toBe(true);
    const sameDay = catalog.filter((d) => d.createdAt === "2026-06-20").map((d) => d.tournament?.placement ?? 99);
    expect(sameDay).toEqual([1, 2, 3, 4, 99]);
  });

  it("accepts a custom community list", () => {
    expect(buildDeckCatalog(TOURNAMENTS, []).every((d) => d.source === "tournament")).toBe(true);
  });

  it("drops the list and write-up from summaries", () => {
    const detail = COMMUNITY_DECKS[0]!;
    const summary = toSummary(detail);
    expect(summary).not.toHaveProperty("decklist");
    expect(summary).not.toHaveProperty("description");
    expect(summary).not.toHaveProperty("matchupNotes");
    expect(summary).toMatchObject({ id: detail.id, name: detail.name, votes: detail.votes, cardIds: detail.cardIds });
  });
});

describe("searchDecks", () => {
  const decks = buildDeckCatalog(TOURNAMENTS).map(toSummary);
  const ids = (query: Parameters<typeof searchDecks>[1]) => searchDecks(decks, query).map((d) => d.id);

  it("returns everything, newest first, for an empty query without mutating the input", () => {
    const before = decks.map((d) => d.id);
    expect(ids({})).toEqual(before);
    expect(ids({ text: "   " })).toEqual(before);
    searchDecks(decks, { sort: "votes" });
    expect(decks.map((d) => d.id)).toEqual(before);
  });

  it("matches archetype names and aliases, case-insensitively", () => {
    const pain = decks.filter((d) => d.archetypeId === "akatsuki-pain").map((d) => d.id);
    expect(ids({ text: "six paths" })).toEqual(pain);
    expect(ids({ text: "RINNEGAN" })).toEqual(pain);
  });

  it("requires every term, matched at the start of a word", () => {
    expect(ids({ text: "pain rhea" })).toEqual(["community--almighty-push-control"]);
    expect(ids({ text: "marin" })).toEqual(ids({ author: "lightning-lev" }));
    expect(ids({ text: "nescu" })).toEqual([]);
  });

  it("ignores accents on either side", () => {
    const ines = ["community--edo-tensei-curse-mark", "community--hundred-puppets-recursion"];
    expect(ids({ text: "ines laurier" })).toEqual(ines);
    expect(ids({ text: "Inès" })).toEqual(ines);
    expect(ids({ text: "joaquin" })).toEqual(ids({ author: "rogue-ronin" }));
  });

  it("searches pilots, events, tags and key card names", () => {
    expect(ids({ text: "esme" })).toEqual(["fixture-regional--esme-quill"]);
    expect(ids({ text: "shelbyville" })).toHaveLength(4);
    expect(ids({ text: "beginner friendly" })).toEqual(decks.filter((d) => d.tags.includes("Beginner friendly")).map((d) => d.id));
    expect(ids({ text: "beginner friendly" })).toHaveLength(5);
    expect(ids({ text: "kirin" })).toEqual(
      decks.filter((d) => d.keyCardIds.includes("NT02-007")).map((d) => d.id),
    );
    expect(ids({ text: "kirin" })).toContain("fixture-regional--dov-lind");
  });

  it("filters by archetype, source, author and cards", () => {
    const sandOrSage = decks.filter((d) => d.archetypeId === "sand-gaara" || d.archetypeId === "uzumaki-sage").map((d) => d.id);
    expect(sandOrSage.length).toBeGreaterThan(4);
    expect(ids({ archetypeIds: ["sand-gaara", "uzumaki-sage"] })).toEqual(sandOrSage);
    expect(ids({ source: "community" })).toHaveLength(COMMUNITY_DECKS.length);
    expect(ids({ source: "tournament" })).toHaveLength(8);
    expect(ids({ author: "AYLA-STONE" })).toEqual(["fixture-store--ayla-stone", "fixture-regional--ayla-stone"]);
    const shukakuDarui = ids({ cardIds: ["NT03-011", "NT03-037"] });
    expect(shukakuDarui).toEqual(decks.filter((d) => d.cardIds.includes("NT03-011") && d.cardIds.includes("NT03-037")).map((d) => d.id));
    expect(shukakuDarui).toEqual(expect.arrayContaining(["community--kazekage-wall", "fixture-store--iris-tanaka"]));
    expect(ids({ cardIds: ["NT01-L04"] })).toEqual(["community--gateless-lee-rush"]);
  });

  it("filters tiers and placements on tournament decks only", () => {
    expect(ids({ tiers: ["store-championship"] })).toEqual([
      "fixture-store--iris-tanaka",
      "fixture-store--ayla-stone",
      "fixture-store--hal-moreno",
      "fixture-store--jun-park",
    ]);
    expect(ids({ placement: "winner" })).toEqual(["fixture-store--iris-tanaka", "fixture-regional--esme-quill"]);
    expect(ids({ placement: "top4" })).toHaveLength(8);
    expect(ids({ placement: "top4", source: "community" })).toEqual([]);
    expect(ids({ placement: "any", source: "community" })).toHaveLength(COMMUNITY_DECKS.length);
  });

  it("sorts by votes and win rate, with missing win rates last", () => {
    const byVotes = searchDecks(decks, { sort: "votes" });
    for (let i = 1; i < byVotes.length; i++) expect(byVotes[i - 1]!.votes).toBeGreaterThanOrEqual(byVotes[i]!.votes);
    const byWinRate = searchDecks(decks, { sort: "winrate" });
    expect(byWinRate[byWinRate.length - 1]!.id).toBe("fixture-store--jun-park");
    const rates = byWinRate.slice(0, -1).map((d) => d.winRate!);
    for (let i = 1; i < rates.length; i++) expect(rates[i - 1]!).toBeGreaterThanOrEqual(rates[i]!);
    expect(byWinRate[0]!.id).toBe("fixture-store--iris-tanaka");
  });

  it("sorts by placement, then tier prestige, with community decks last", () => {
    const sorted = ids({ sort: "placement" });
    expect(sorted.slice(0, 8)).toEqual([
      "fixture-regional--esme-quill",
      "fixture-store--iris-tanaka",
      "fixture-regional--ayla-stone",
      "fixture-store--ayla-stone",
      "fixture-regional--cyra-vance",
      "fixture-store--hal-moreno",
      "fixture-regional--dov-lind",
      "fixture-store--jun-park",
    ]);
    expect(sorted.slice(8).every((id) => id.startsWith("community--"))).toBe(true);
    expect(ids({ sort: "placement" })).toEqual(sorted);
  });
});

describe("repository (seed data)", () => {
  it("serves a consistent, memoized catalog", () => {
    const catalog = getDeckCatalog();
    expect(getDeckCatalog()).toBe(catalog);
    expect(catalog.length).toBeGreaterThanOrEqual(COMMUNITY_DECKS.length);
    expect(new Set(catalog.map((d) => d.id)).size).toBe(catalog.length);
    expect(getDeckSummaries().map((d) => d.id)).toEqual(catalog.map((d) => d.id));
    for (const deck of catalog) {
      expect(parseDeckId(deck.id)).not.toBeNull();
      expect(getDeck(deck.id)).toBe(deck);
    }
    expect(getDeck("missing--deck")).toBeUndefined();
    const sand = getDeckSummaries().filter((d) => d.archetypeId === "sand-gaara");
    expect(sand.length).toBeGreaterThanOrEqual(2);
    expect(getDecksForArchetype("sand-gaara")).toEqual(sand);
  });

  it("has a profile for every pilot and author", () => {
    const handles = getAllPlayerHandles();
    expect(handles).toEqual(handles.slice().sort());
    for (const deck of getDeckSummaries()) {
      const profile = getPlayerProfile(deck.author.handle);
      expect(profile, deck.author.handle).toBeDefined();
      expect(profile!.decks.map((d) => d.id)).toContain(deck.id);
    }
  });
});
