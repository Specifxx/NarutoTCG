import { describe, expect, it } from "vitest";
import { ARCHETYPES, CHARTED_ARCHETYPES, getArchetype, ROGUE_ID } from "@/lib/data/archetypes";
import { AUTHOR_INDEX, AUTHORS } from "@/lib/data/authors";
import { CARD_INDEX, CARDS } from "@/lib/data/cards";
import { getSeedComments, SEED_COMMENTS_BEFORE } from "@/lib/data/comments";
import { COMMUNITY_DECKS, COMMUNITY_TAGS } from "@/lib/data/community-decks";
import { CURATED_GUIDES, getMatchupGuide, getMatchupGuidesFor, type MatchupGuide } from "@/lib/data/guides";
import { deckCardIds, pickKeyCardIds, toSummary } from "@/lib/decks/catalog";
import { checkDecklistLegality } from "@/lib/decks/legality";
import { communityDeckId, parseDeckId, type DeckComment, type DeckSummary } from "@/lib/decks/types";

/** Full card names plus the short forms prose uses ("Minato Namikaze", "Shield of Shukaku"). */
const CARD_NAMES = [
  ...new Set(CARDS.flatMap((card) => [card.name, card.name.split(" — ")[0]!, card.name.split(": ")[1]].filter((n): n is string => Boolean(n)))),
];
const cardNamesIn = (text: string) => CARD_NAMES.filter((name) => text.includes(name));
const NUMERIC_WIN_RATE = /\d\s*%|percent|\b\d{2}\s*[-/]\s*\d{2}\b/i;

describe("authors", () => {
  it("are well-formed and unique", () => {
    expect(AUTHORS.length).toBeGreaterThanOrEqual(8);
    expect(AUTHOR_INDEX.size).toBe(AUTHORS.length);
    for (const author of AUTHORS) {
      expect(author.handle).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(author.country).toMatch(/^[A-Z]{2}$/);
      expect(author.joined).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(author.joined < "2026-10-14").toBe(true);
      expect(author.bio.length).toBeGreaterThan(20);
      expect(author.specialties.length).toBeGreaterThan(0);
      for (const id of author.specialties) expect(getArchetype(id)).toBeDefined();
    }
  });

  it("each publish at least one community deck, after joining", () => {
    for (const author of AUTHORS) expect(COMMUNITY_DECKS.some((d) => d.author.handle === author.handle)).toBe(true);
    for (const deck of COMMUNITY_DECKS) expect(AUTHOR_INDEX.get(deck.author.handle)!.joined <= deck.createdAt, deck.id).toBe(true);
  });
});

describe("community decks", () => {
  it("have unique ids that round-trip through parseDeckId", () => {
    expect(COMMUNITY_DECKS).toHaveLength(18);
    expect(new Set(COMMUNITY_DECKS.map((d) => d.id)).size).toBe(COMMUNITY_DECKS.length);
    for (const deck of COMMUNITY_DECKS) {
      const parsed = parseDeckId(deck.id);
      expect(parsed?.kind).toBe("community");
      if (parsed?.kind !== "community") continue;
      expect(parsed.slug).not.toContain("--");
      expect(communityDeckId(parsed.slug)).toBe(deck.id);
    }
  });

  it("are legal on their publish date", () => {
    for (const deck of COMMUNITY_DECKS) {
      expect(deck.createdAt >= "2026-05-01" && deck.createdAt <= "2026-10-12").toBe(true);
      expect(checkDecklistLegality(deck.decklist, { date: deck.createdAt }), deck.id).toEqual([]);
    }
  });

  it("are consistent with their archetype", () => {
    const otherLeaders = new Set(ARCHETYPES.filter((a) => a.id !== ROGUE_ID).flatMap((a) => a.leaderIds));
    const allSignatures = new Set(ARCHETYPES.flatMap((a) => a.signatureCardIds));
    for (const deck of COMMUNITY_DECKS) {
      const archetype = getArchetype(deck.archetypeId)!;
      expect(archetype, deck.id).toBeDefined();
      expect(deck.leaderId).toBe(deck.decklist.leaderId);
      if (archetype.id === ROGUE_ID) {
        expect(otherLeaders.has(deck.leaderId)).toBe(false);
        expect(deck.decklist.cards.some((e) => allSignatures.has(e.cardId)), deck.id).toBe(false);
        continue;
      }
      expect(archetype.leaderIds, deck.id).toContain(deck.leaderId);
      const signatureCopies = deck.decklist.cards
        .filter((e) => archetype.signatureCardIds.includes(e.cardId))
        .reduce((sum, e) => sum + e.quantity, 0);
      expect(signatureCopies, deck.id).toBeGreaterThanOrEqual(20);
      for (const id of deck.keyCardIds) expect(archetype.signatureCardIds, deck.id).toContain(id);
    }
  });

  it("only run Jutsu their Leader lets them cast", () => {
    const lee = COMMUNITY_DECKS.filter((d) => d.leaderId === "NT01-L04");
    expect(lee.length).toBeGreaterThan(0);
    for (const deck of lee) {
      for (const { cardId } of deck.decklist.cards) {
        const card = CARD_INDEX.get(cardId)!;
        // Rock Lee — Splendid Taijutsu bans Jutsu costing 3 or more unless they are Taijutsu.
        if (card.type === "jutsu" && !card.traits?.includes("Taijutsu")) {
          expect(card.cost!, `${deck.id}: ${card.name}`).toBeLessThan(3);
        }
      }
    }
  });

  it("cover every archetype with the planned spread", () => {
    const counts: Record<string, number> = {};
    for (const deck of COMMUNITY_DECKS) counts[deck.archetypeId] = (counts[deck.archetypeId] ?? 0) + 1;
    const doubles = ["akatsuki-pain", "sand-gaara", "uzumaki-sage", "uchiha-avenger", "hyuga-gentle-fist"];
    for (const archetype of ARCHETYPES) expect(counts[archetype.id], archetype.id).toBe(doubles.includes(archetype.id) ? 2 : 1);
  });

  it("carry consistent metadata", () => {
    for (const deck of COMMUNITY_DECKS) {
      const author = AUTHOR_INDEX.get(deck.author.handle)!;
      expect(deck.author).toEqual({ handle: author.handle, name: author.name, country: author.country });
      expect(deck.source).toBe("community");
      expect(deck.tournament).toBeUndefined();
      expect(deck.winRateSource).toBe("playtest");
      const { wins, losses, draws } = deck.record!;
      expect(deck.winRate).toBeCloseTo((wins + draws / 2) / (wins + losses + draws), 12);
      expect(deck.votes).toBeGreaterThanOrEqual(8);
      expect(deck.votes).toBeLessThanOrEqual(340);
      expect(deck.cardIds).toEqual(deckCardIds(deck.decklist));
      expect(deck.keyCardIds.length).toBeGreaterThanOrEqual(1);
      expect(deck.keyCardIds.length).toBeLessThanOrEqual(3);
      for (const id of deck.keyCardIds) expect(deck.cardIds).toContain(id);
      expect(deck.tags.length).toBeGreaterThan(0);
      for (const tag of deck.tags) expect(COMMUNITY_TAGS).toContain(tag);
    }
  });

  it("ship plain-text write-ups and matchup notes that cite real cards", () => {
    for (const deck of COMMUNITY_DECKS) {
      const description = deck.description!;
      expect(description.length, deck.id).toBeGreaterThanOrEqual(2);
      expect(description.length, deck.id).toBeLessThanOrEqual(4);
      for (const paragraph of description) {
        expect(paragraph.length).toBeGreaterThan(80);
        expect(paragraph).not.toMatch(/[*#`]/);
        expect(paragraph).not.toMatch(NUMERIC_WIN_RATE);
      }
      expect(new Set(cardNamesIn(description.join(" "))).size, deck.id).toBeGreaterThanOrEqual(5);
      const notes = Object.entries(deck.matchupNotes!);
      expect(notes.length, deck.id).toBeGreaterThanOrEqual(2);
      expect(notes.length, deck.id).toBeLessThanOrEqual(4);
      for (const [opponentId, note] of notes) {
        expect(getArchetype(opponentId), opponentId).toBeDefined();
        expect(opponentId).not.toBe(deck.archetypeId);
        expect(note.length).toBeGreaterThan(20);
        expect(note).not.toMatch(NUMERIC_WIN_RATE);
      }
    }
  });

  it("are sorted newest first", () => {
    const dates = COMMUNITY_DECKS.map((d) => d.createdAt);
    expect(dates).toEqual(dates.slice().sort().reverse());
  });
});

describe("matchup guides", () => {
  const charted = CHARTED_ARCHETYPES.map((a) => a.id);
  /** Intended edges: [favored, unfavored]. Every other charted pair should read as even. */
  const EDGES: Array<[string, string]> = [
    ["sand-gaara", "akatsuki-pain"],
    ["akatsuki-pain", "uzumaki-sage"],
    ["hyuga-gentle-fist", "sand-gaara"],
    ["hyuga-gentle-fist", "akatsuki-pain"],
    ["uchiha-avenger", "sand-gaara"],
    ["uchiha-avenger", "medical-ninja"],
    ["itachi-tsukuyomi", "uzumaki-sage"],
    ["uzumaki-sage", "uchiha-avenger"],
  ];
  const FAVORED = /^(favorable|one of your best|a slight edge for you)/i;
  const UNFAVORED = /^(unfavorable|an uphill|slightly unfavored|[\w ]+ (is favored|has a slight edge))/i;
  const EVEN = /^(even|an even|roughly even)/i;

  const checkGuide = (guide: MatchupGuide) => {
    expect(guide.summary.length).toBeGreaterThan(30);
    expect(guide.mulligan.length).toBeGreaterThan(10);
    expect(guide.keys.length).toBeGreaterThanOrEqual(2);
    expect(guide.keys.length).toBeLessThanOrEqual(3);
    for (const text of [guide.summary, guide.mulligan, ...guide.keys]) {
      expect(text.trim()).toBe(text);
      expect(text).not.toMatch(NUMERIC_WIN_RATE);
      expect(text).not.toMatch(/undefined|\(\)/);
    }
  };

  it("curate all 56 ordered pairs of charted archetypes", () => {
    expect(CURATED_GUIDES).toHaveLength(56);
    for (const a of charted) {
      for (const b of charted) {
        if (a === b) continue;
        const guide = getMatchupGuide(a, b)!;
        expect(guide, `${a} vs ${b}`).toMatchObject({ archetypeId: a, opponentId: b, source: "curated" });
        checkGuide(guide);
        for (const key of guide.keys) expect(cardNamesIn(key).length, key).toBeGreaterThan(0);
      }
    }
  });

  it("keep the intended matchup dynamics in both directions", () => {
    const edge = new Set(EDGES.map(([a, b]) => `${a}|${b}`));
    for (const [winner, loser] of EDGES) {
      expect(getMatchupGuide(winner, loser)!.summary).toMatch(FAVORED);
      expect(getMatchupGuide(loser, winner)!.summary).toMatch(UNFAVORED);
    }
    for (const a of charted) {
      for (const b of charted) {
        if (a === b || edge.has(`${a}|${b}`) || edge.has(`${b}|${a}`)) continue;
        expect(getMatchupGuide(a, b)!.summary, `${a} vs ${b}`).toMatch(EVEN);
      }
    }
  });

  it("generate a guide for every other pair, mirrors and rogue included", () => {
    for (const a of ARCHETYPES) {
      for (const b of ARCHETYPES) {
        const guide = getMatchupGuide(a.id, b.id)!;
        expect(guide, `${a.id} vs ${b.id}`).toMatchObject({ archetypeId: a.id, opponentId: b.id });
        const curated = a.id !== b.id && charted.includes(a.id) && charted.includes(b.id);
        expect(guide.source).toBe(curated ? "curated" : "generated");
        checkGuide(guide);
      }
    }
    expect(getMatchupGuide("taijutsu-lee", "sand-gaara")!.keys.join(" ")).toContain("Shukaku");
    expect(getMatchupGuide("nope", "sand-gaara")).toBeNull();
    expect(getMatchupGuide("sand-gaara", "nope")).toBeNull();
  });

  it("name a real card in every generated tip, mirrors included", () => {
    for (const a of ARCHETYPES) {
      for (const b of ARCHETYPES) {
        const guide = getMatchupGuide(a.id, b.id)!;
        if (guide.source !== "generated") continue;
        for (const key of guide.keys) expect(cardNamesIn(key).length, `${a.id} vs ${b.id}: ${key}`).toBeGreaterThan(0);
      }
    }
    expect(getMatchupGuide(ROGUE_ID, ROGUE_ID)!.keys.join(" ")).not.toMatch(/shares your weak spot/);
  });

  it("list the guides against every other charted archetype", () => {
    expect(getMatchupGuidesFor("sand-gaara").map((g) => g.opponentId)).toEqual(charted.filter((id) => id !== "sand-gaara"));
    expect(getMatchupGuidesFor("puppet-brigade")).toHaveLength(charted.length);
    expect(getMatchupGuidesFor("nope")).toEqual([]);
  });
});

describe("seed comments", () => {
  const cutoff = Date.parse(SEED_COMMENTS_BEFORE);

  const expectValidThread = (deck: DeckSummary, comments: DeckComment[]) => {
    const start = Date.parse(`${deck.createdAt}T00:00:00Z`);
    const seen = new Map<string, DeckComment>();
    let previous = start;
    comments.forEach((comment, index) => {
      expect(comment.id).toBe(`${deck.id}#c${index + 1}`);
      expect(comment.deckId).toBe(deck.id);
      expect(comment.body.length).toBeGreaterThan(10);
      expect(comment.author).not.toBe("@op");
      expect(comment.votes).toBeGreaterThanOrEqual(0);
      const time = Date.parse(comment.createdAt);
      expect(time).toBeGreaterThan(previous);
      expect(time).toBeLessThan(cutoff);
      if (comment.parentId !== null) {
        const parent = seen.get(comment.parentId);
        expect(parent, comment.id).toBeDefined();
        expect(time).toBeGreaterThan(Date.parse(parent!.createdAt));
      }
      seen.set(comment.id, comment);
      previous = time;
    });
  };

  const tournamentDeck = (id: string, placement: number, createdAt = "2026-09-12"): DeckSummary => ({
    id,
    name: "Six Paths of Pain",
    archetypeId: "akatsuki-pain",
    leaderId: "NT02-L02",
    source: "tournament",
    author: { handle: id.split("--")[1]!, name: "Aiko Testwood", country: "US" },
    createdAt,
    tournament: {
      id: id.split("--")[0]!,
      name: "Test Cup Regional Championship — Springfield",
      tier: "regional-championship",
      date: createdAt,
      placement,
      playerCount: 64,
      topCutSize: 8,
    },
    winRateSource: "event",
    votes: 40,
    keyCardIds: ["NT02-013", "NT02-015", "NT02-009"],
    cardIds: ["NT02-L02", "NT02-009", "NT02-013", "NT02-015"],
    tags: [],
  });

  it("give every community deck a curated thread with replies", () => {
    let replies = 0;
    for (const detail of COMMUNITY_DECKS) {
      const deck = toSummary(detail);
      const comments = getSeedComments(deck);
      expect(comments.length, deck.id).toBeGreaterThanOrEqual(2);
      expect(comments.length, deck.id).toBeLessThanOrEqual(6);
      expectValidThread(deck, comments);
      expect(getSeedComments(deck)).toEqual(comments);
      replies += comments.filter((c) => c.parentId !== null).length;
    }
    expect(replies).toBeGreaterThan(COMMUNITY_DECKS.length);
  });

  it("let community authors answer under their own handle", () => {
    const deck = toSummary(COMMUNITY_DECKS.find((d) => d.id === "community--myoboku-value-sage")!);
    const answers = getSeedComments(deck).filter((c) => c.author === deck.author.handle);
    expect(answers.length).toBeGreaterThan(0);
    for (const answer of answers) expect(answer.parentId).not.toBeNull();
  });

  it("generate deterministic threads for top 4 tournament decks", () => {
    const deck = tournamentDeck("test-cup--aiko-testwood", 1);
    const comments = getSeedComments(deck);
    expect(getSeedComments(deck)).toEqual(comments);
    const topLevel = comments.filter((c) => c.parentId === null);
    expect(topLevel.length).toBeGreaterThanOrEqual(1);
    expect(topLevel.length).toBeLessThanOrEqual(4);
    expectValidThread(deck, comments);
    const text = comments.map((c) => c.body).join(" ");
    expect(/Aiko|Test Cup|Pain|Regional Championship/.test(text)).toBe(true);
    for (const reply of comments.filter((c) => c.author === "aiko-testwood")) expect(reply.parentId).not.toBeNull();
  });

  it("generate valid threads across many decks, compressing late timelines", () => {
    const authors = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const date = i % 3 === 0 ? "2026-10-13" : "2026-08-01";
      const deck = tournamentDeck(`event-${i}--pilot-${i}`, (i % 4) + 1, date);
      const comments = getSeedComments(deck);
      expect(comments.length).toBeGreaterThan(0);
      expectValidThread(deck, comments);
      const text = comments.map((c) => c.body).join(" ");
      expect(cardNamesIn(text).length > 0 || /Aiko|Test Cup|Pain|Regional Championship/.test(text)).toBe(true);
      for (const c of comments) authors.add(c.author);
    }
    expect(authors.size).toBeGreaterThan(10);
  });

  it("give sound advice in generated threads: curves go up in cost and mulligan keeps are openers", () => {
    const byName = new Map(CARDS.map((card) => [card.name, card]));
    let curves = 0;
    let keeps = 0;
    for (const community of COMMUNITY_DECKS) {
      const archetype = getArchetype(community.archetypeId)!;
      for (let i = 0; i < 12; i++) {
        const slug = community.id.split("--")[1]!;
        const deck: DeckSummary = {
          ...tournamentDeck(`event-${i}--${slug}`, (i % 4) + 1),
          name: community.name,
          archetypeId: community.archetypeId,
          leaderId: community.leaderId,
          keyCardIds: pickKeyCardIds(community.decklist, community.archetypeId),
          cardIds: community.cardIds,
        };
        for (const { body } of getSeedComments(deck)) {
          const curve = body.match(/^(.+?) into (.+?) is such a clean sequence/);
          if (curve) {
            curves++;
            const [from, to] = [byName.get(curve[1]!)!, byName.get(curve[2]!)!];
            expect(deck.cardIds, body).toEqual(expect.arrayContaining([from.id, to.id]));
            expect(from.cost!, body).toBeLessThan(to.cost!);
          }
          const keep = body.match(/^Keep (.+?) or a cheap opener/);
          if (keep) {
            keeps++;
            const card = byName.get(keep[1]!)!;
            expect(deck.cardIds, body).toContain(card.id);
            expect(archetype.mulliganTargets.includes(card.id) || (card.cost ?? 0) <= 2, body).toBe(true);
          }
        }
      }
    }
    expect(curves).toBeGreaterThan(10);
    expect(keeps).toBeGreaterThan(10);
  });

  it("describe a runner-up in an event without a cut as a placing, not a final", () => {
    const finishes = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const base = tournamentDeck(`swiss-only-${i}--aiko-testwood`, 2);
      const deck = { ...base, tournament: { ...base.tournament!, topCutSize: 0 } };
      for (const { body } of getSeedComments(deck)) {
        const finish = body.match(/^Congrats on the (.+?) at /);
        if (finish) finishes.add(finish[1]!);
      }
    }
    expect([...finishes]).toEqual(["2nd-place finish"]);
  });

  it("skip lower finishes, imported events and decks dated at the cutoff", () => {
    expect(getSeedComments(tournamentDeck("test-cup--aiko-testwood", 5))).toEqual([]);
    expect(getSeedComments(tournamentDeck("local-my-event--aiko-testwood", 1))).toEqual([]);
    expect(getSeedComments(tournamentDeck("late-cup--aiko-testwood", 1, "2026-10-14"))).toEqual([]);
    const unknownCommunity = { ...toSummary(COMMUNITY_DECKS[0]!), id: communityDeckId("not-seeded") };
    expect(getSeedComments(unknownCommunity)).toEqual([]);
  });
});
