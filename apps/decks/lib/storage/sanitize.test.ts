import type { Tournament, TournamentPlayer } from "@naruto-tcg/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { buildTournamentDecks, toSummary } from "@/lib/decks/catalog";
import { readTemplate, templateMeta, templateTournament } from "@/lib/ingest/__fixtures__/files";
import { ingestCsv, ingestJson } from "@/lib/ingest/pipeline";
import { importsStore } from "./imports";
import { sanitizeTournament } from "./sanitize";

const NOW = "2026-10-01T12:00:00.000Z";
const seed = SEED_TOURNAMENTS[0]!;
const [first, second, third, ...rest] = seed.players as [TournamentPlayer, TournamentPlayer, TournamentPlayer, ...TournamentPlayer[]];
const maxPlacement = (players: readonly TournamentPlayer[]) => Math.max(...players.map((p) => p.placement));

/** A seed event re-keyed as a local import, with `overrides` of any shape: stored data is untrusted. */
const stored = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  ...seed,
  id: "local-copy",
  source: "import",
  ...overrides,
});
const sanitized = (raw: unknown): Tournament => {
  const tournament = sanitizeTournament(raw);
  expect(tournament).not.toBeNull();
  return tournament!;
};

/** Wizard output, as saved by the import wizard. */
function wizardOutput(meta = templateMeta()): Tournament {
  const result = ingestCsv({
    meta,
    standings: { text: readTemplate("standings-template.csv") },
    pairings: { text: readTemplate("pairings-template.csv") },
    decklists: { text: readTemplate("decklists-template.csv") },
    now: NOW,
  });
  expect(result.tournament).not.toBeNull();
  return result.tournament!;
}

describe("sanitizeTournament: complete records", () => {
  it("returns every seed event as the same object", () => {
    for (const t of SEED_TOURNAMENTS) expect(sanitizeTournament(t)).toBe(t);
  });

  it("returns wizard output as the same object, also after a round trip through storage", () => {
    const outputs = [
      wizardOutput(),
      // The organizer is optional in the wizard.
      wizardOutput({ ...templateMeta(), organizer: "" }),
      ingestJson(JSON.stringify(seed), { now: NOW }).tournament!,
      { ...templateTournament(), source: "import" as const, importedAt: NOW },
    ];
    for (const t of outputs) {
      expect(sanitizeTournament(t)).toBe(t);
      const parsed: unknown = JSON.parse(JSON.stringify(t));
      expect(sanitizeTournament(parsed)).toBe(parsed);
    }
  });

  it("keeps a well-formed import as the same object, whatever its optional fields and date text", () => {
    const fine = [
      stored(),
      stored({ notes: "Fine", importedAt: "2026-09-13T10:00:00Z", location: { online: true } }),
      stored({ location: {}, notes: undefined, swissRounds: 0, topCutSize: 0, bestOf: 1, format: "", organizer: "" }),
      // Dates are kept as stored; pages that need a real date (the meta) check it themselves.
      stored({ date: "Oct 30, 2026" }),
      stored({ date: "" }),
      stored({ players: [], matches: [] }),
    ];
    for (const t of fine) expect(sanitizeTournament(t)).toBe(t);
  });
});

describe("sanitizeTournament: rejected records", () => {
  it("is null for anything that is not a record with a non-empty string id", () => {
    const rejected = [null, undefined, 42, "local-copy", [], [stored()], {}, stored({ id: "" }), stored({ id: 4 }), stored({ id: undefined })];
    for (const raw of rejected) expect(sanitizeTournament(raw)).toBeNull();
  });
});

describe("sanitizeTournament: event fields", () => {
  it("fills fields a stored import can lack", () => {
    const fixed = sanitized(
      stored({ tier: "mystery", location: undefined, organizer: 4, format: "", swissRounds: -1, topCutSize: "8", bestOf: 5, source: "x" }),
    );
    expect(fixed).toMatchObject({
      id: "local-copy",
      name: seed.name,
      tier: "store-championship",
      location: {},
      organizer: "Unknown organizer",
      format: "Unknown format",
      swissRounds: 0,
      topCutSize: 0,
      bestOf: 3,
      source: "import",
    });
    expect(fixed.players).toHaveLength(seed.players.length);
    expect(fixed.matches).toHaveLength(seed.matches.length);
  });

  it("reads a missing or unknown tier as a store championship and keeps known ones", () => {
    for (const tier of [undefined, "galactic", "worlds", "mega-event", 3]) expect(sanitized(stored({ tier })).tier).toBe("store-championship");
    expect(sanitized(stored({ tier: "regional-championship", name: undefined })).tier).toBe("regional-championship");
  });

  it("names an event without a name after its id", () => {
    for (const name of [undefined, "", " ", 7]) expect(sanitized(stored({ name })).name).toBe("local-copy");
  });

  it("makes cut sizes and rounds non-negative integers", () => {
    for (const topCutSize of [undefined, -3, "8", Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(sanitized(stored({ topCutSize })).topCutSize).toBe(0);
    }
    expect(sanitized(stored({ swissRounds: "7" })).swissRounds).toBe(0);
    expect(sanitized(stored({ swissRounds: 6.5 }))).toMatchObject({ swissRounds: 6, topCutSize: seed.topCutSize });
  });

  it("defaults a missing format and organizer, and source to import unless seed", () => {
    expect(sanitized(stored({ format: undefined, organizer: null }))).toMatchObject({ format: "Unknown format", organizer: "Unknown organizer" });
    expect(sanitized(stored({ source: undefined })).source).toBe("import");
    expect(sanitized(stored({ source: "seed", bestOf: "3" }))).toMatchObject({ source: "seed", bestOf: 3 });
    expect(sanitized(stored({ bestOf: 1, tier: null })).bestOf).toBe(1);
  });

  it("keeps string dates as stored and replaces anything else with an empty string", () => {
    expect(sanitized(stored({ date: "2026-10-12T18:00:00Z", tier: null })).date).toBe("2026-10-12T18:00:00Z");
    expect(sanitized(stored({ date: "10/12/2026", tier: null })).date).toBe("10/12/2026");
    for (const date of [undefined, null, 20261012]) expect(sanitized(stored({ date })).date).toBe("");
  });

  it("reads missing player and match lists as empty", () => {
    const raw = stored({ players: undefined, matches: "nope" });
    const fixed = sanitized(raw);
    expect(fixed).not.toBe(raw);
    expect(fixed.players).toEqual([]);
    expect(fixed.matches).toEqual([]);
  });

  it("drops non-text notes and import times and keeps only the readable parts of a location", () => {
    const fixed = sanitized(stored({ notes: { text: "not a string" }, importedAt: 42, location: { city: "Testville", venue: { name: "Hall" }, online: "yes" } }));
    expect(fixed).not.toHaveProperty("notes");
    expect(fixed).not.toHaveProperty("importedAt");
    expect(fixed.location).toEqual({ city: "Testville" });
    expect(sanitized(stored({ location: "Online", notes: "Kept" }))).toMatchObject({ location: {}, notes: "Kept" });
  });
});

describe("sanitizeTournament: players", () => {
  it("drops unreadable players and duplicate ids, keeps well-formed ones as they are and repairs the rest", () => {
    const fixed = sanitized(
      stored({
        players: [
          null,
          "nope",
          { name: "No Id", archetypeId: "rogue", placement: 9 },
          { id: "", name: "Empty id" },
          first,
          { ...second, decklist: { leaderId: "NT02-L02", cards: [null, { cardId: "NT02-009", quantity: 4 }, { cardId: "", quantity: 2 }, { cardId: "NT01-001", quantity: 0 }] } },
          { ...third, decklist: { cards: "nope" } },
          { id: "zed", placement: "first" },
          { ...first, name: "Duplicate", placement: 999 },
          ...rest,
        ],
      }),
    );
    expect(fixed.players.map((p) => p.id)).toEqual([first.id, second.id, third.id, "zed", ...rest.map((p) => p.id)]);
    expect(fixed.players[0]).toBe(first);
    expect(fixed.players[0]!.decklist).toBe(first.decklist);
    expect(fixed.players[1]!.decklist).toEqual({ leaderId: "NT02-L02", cards: [{ cardId: "NT02-009", quantity: 4 }] });
    expect(fixed.players[2]).not.toHaveProperty("decklist");
    expect(fixed.players[2]).toMatchObject({ id: third.id, name: third.name, placement: third.placement });
    // The dropped duplicate's placement does not count: zed ranks right after the last known placement.
    expect(fixed.players[3]).toEqual({ id: "zed", name: "zed", archetypeId: "rogue", placement: maxPlacement(seed.players) + 1 });
    expect(fixed.players.slice(4).every((p, i) => p === rest[i])).toBe(true);
  });

  it("ranks players without a valid placement after the known ones, in list order", () => {
    const players = [{ ...first, placement: undefined }, ...rest, { ...second, placement: 0 }, { ...third, placement: "3" }];
    const fixed = sanitized(stored({ players }));
    const max = maxPlacement(rest);
    expect(fixed.players[0]!.placement).toBe(max + 1);
    expect(fixed.players.at(-2)!.placement).toBe(max + 2);
    expect(fixed.players.at(-1)!.placement).toBe(max + 3);
  });

  it("maps missing and unknown archetypes to rogue and keeps rogue and known ones", () => {
    const [fourth, ...others] = rest;
    const players = [{ ...first, archetypeId: "made-up" }, { ...second, archetypeId: undefined }, { ...third, archetypeId: "kaguya" }, { ...fourth!, archetypeId: "rogue" }, ...others];
    const fixed = sanitized(stored({ players }));
    expect(fixed.players.slice(0, 4).map((p) => p.archetypeId)).toEqual(["rogue", "rogue", "rogue", "rogue"]);
    expect(fixed.players[3]).toBe(players[3]);
    expect(fixed.players.slice(4).every((p, i) => p === others[i])).toBe(true);
  });

  it("names players after their id and drops unreadable countries and flags", () => {
    const players = [{ ...first, name: "", country: 7, dropped: "no", archetypeId: "not-an-archetype", placement: undefined }, ...rest];
    const fixed = sanitized(stored({ players }));
    expect(fixed.players[0]).toEqual({
      id: first.id,
      name: first.id,
      archetypeId: "rogue",
      placement: maxPlacement(rest) + 1,
      decklist: first.decklist,
    });
    expect(sanitized(stored({ players: [{ ...first, name: undefined, dropped: true }] })).players[0]).toMatchObject({ name: first.id, dropped: true });
  });

  it("drops decklists without a leader or a card list and filters broken card rows", () => {
    const withList = (decklist: unknown) => sanitized(stored({ players: [{ ...first, decklist }, ...rest] })).players[0]!;
    const cards = [...first.decklist!.cards, { cardId: "", quantity: 2 }, { cardId: "NT01-001", quantity: 0 }, { cardId: "NT01-001", quantity: 1.5 }, null];
    expect(withList({ ...first.decklist, cards }).decklist).toEqual(first.decklist);
    for (const broken of [{ cards: first.decklist!.cards }, { leaderId: 3, cards: [] }, { leaderId: "NT02-L01" }, "not a list", null]) {
      expect(withList(broken)).not.toHaveProperty("decklist");
    }
  });

  it("drops card rows holding more copies than a whole main deck, as stored before imports were bounded", () => {
    const withList = (decklist: unknown) => sanitized(stored({ players: [{ ...first, decklist }, ...rest] })).players[0]!;
    const absurd = [...first.decklist!.cards, { cardId: "NT01-001", quantity: 1_000_000_000 }, { cardId: "NT01-002", quantity: 51 }];
    expect(withList({ ...first.decklist, cards: absurd }).decklist).toEqual(first.decklist);
    // A whole main deck of one card is the most an entry can hold, and it is kept.
    const full = { leaderId: first.decklist!.leaderId, cards: [{ cardId: "NT01-001", quantity: 50 }] };
    expect(withList(full).decklist).toEqual(full);
  });
});

describe("sanitizeTournament: matches", () => {
  it("drops unreadable matches, turns missing opponents into byes and repairs the rest", () => {
    const [a, b, c] = [first.id, second.id, third.id];
    const fixed = sanitized(
      stored({
        matches: [
          ...seed.matches,
          null,
          "nope",
          { round: 1, stage: "swiss", player1Id: "", player2Id: b, outcome: "p1" },
          { round: 0, stage: "swiss", player1Id: a, player2Id: b, outcome: "p1" },
          { player1Id: a, player2Id: b, outcome: "draw" },
          { round: 2, stage: "swiss", player1Id: a, player2Id: b, outcome: "won" },
          { round: 2, stage: "swiss", player1Id: a, player2Id: b },
          { round: 2, stage: "swiss", player1Id: a, outcome: "weird" },
          { round: 2, stage: "elimination", table: "9", player1Id: a, player2Id: b, outcome: "p2", games: { p1: "x" } },
          { round: 3, stage: "swiss", player1Id: a, outcome: "p1" },
          { round: 3, stage: "swiss", player1Id: b, player2Id: null, outcome: "p1" },
          { round: 3, stage: "swiss", player1Id: c, player2Id: a, outcome: "bye" },
          { round: 4, stage: "top-cut", table: 1, player1Id: a, player2Id: b, outcome: "draw", games: { p1: 1, p2: 1 }, intentionalDraw: "yes" },
        ],
      }),
    );
    expect(fixed.matches.slice(0, seed.matches.length).every((m, i) => m === seed.matches[i])).toBe(true);
    expect(fixed.matches.slice(seed.matches.length)).toEqual([
      { round: 2, stage: "swiss", player1Id: a, player2Id: b, outcome: "p2" },
      { round: 3, stage: "swiss", player1Id: a, player2Id: null, outcome: "bye" },
      { round: 3, stage: "swiss", player1Id: b, player2Id: null, outcome: "bye" },
      { round: 3, stage: "swiss", player1Id: c, player2Id: null, outcome: "bye" },
      { round: 4, stage: "top-cut", table: 1, player1Id: a, player2Id: b, outcome: "draw", games: { p1: 1, p2: 1 } },
    ]);
  });
});

describe("sanitizeTournament: identity and purity", () => {
  const broken = () =>
    stored({
      tier: "x",
      name: " ",
      notes: 3,
      location: { city: 1 },
      players: [null, { ...first, archetypeId: "made-up" }, ...rest, { id: "late" }],
      matches: [null, ...seed.matches, { round: 9, stage: "swiss", player1Id: first.id, outcome: "p1" }],
    });

  it("never mutates its input and returns a repaired record as a new object", () => {
    const raw = broken();
    const before = structuredClone(raw);
    const fixed = sanitized(raw);
    expect(fixed).not.toBe(raw);
    // Deep: the seed players and matches the record shares are untouched too.
    expect(raw).toEqual(before);
  });

  it("returns a sanitized record unchanged, also after a round trip through storage", () => {
    const fixed = sanitized(broken());
    expect(sanitizeTournament(fixed)).toBe(fixed);
    const parsed: unknown = JSON.parse(JSON.stringify(fixed));
    expect(sanitizeTournament(parsed)).toBe(parsed);
  });

  it("produces records the deck builder can always read", () => {
    const fixed = sanitized(stored({ tier: undefined, topCutSize: undefined, name: undefined, players: [null, ...seed.players, { id: "x", decklist: { leaderId: "NT01-L01", cards: [null] } }] }));
    const decks = buildTournamentDecks([fixed]).map(toSummary);
    expect(decks.length).toBe(seed.players.filter((p) => p.decklist).length + 1);
    for (const deck of decks) {
      expect(deck.tournament).toMatchObject({ tier: "store-championship", topCutSize: 0, name: "local-copy" });
      expect(Number.isFinite(deck.tournament!.placement)).toBe(true);
    }
  });
});

describe("importsStore", () => {
  const installStorage = (value: unknown) => {
    const data = new Map([["ntcg.decks.imports.v1", JSON.stringify(value)]]);
    vi.stubGlobal("window", {
      localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, v: string) => void data.set(key, v) },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  };

  afterEach(() => vi.unstubAllGlobals());

  it("sanitizes stored records once, in stored order, skipping the unreadable ones", () => {
    installStorage([stored(), null, { id: "" }, "junk", stored({ id: "local-2", tier: "x", players: [null, ...seed.players] })]);
    const imports = importsStore.get();
    expect(imports.map((t) => t.id)).toEqual(["local-copy", "local-2"]);
    expect(imports[1]).toMatchObject({ tier: "store-championship" });
    expect(imports[1]!.players).toHaveLength(seed.players.length);
    expect(importsStore.get()).toBe(imports);
  });

  it("reads anything but a list as no imports", () => {
    installStorage({ id: "local-copy" });
    expect(importsStore.get()).toEqual([]);
  });

  it("skips a record the sanitizer throws on and keeps the others", async () => {
    vi.resetModules();
    vi.doMock("./sanitize", () => ({
      sanitizeTournament: (raw: { id?: unknown }) => {
        if (raw.id === "local-boom") throw new Error("boom");
        return raw;
      },
    }));
    try {
      const { importsStore: store } = await import("./imports");
      installStorage([{ id: "local-boom" }, { id: "local-fine" }]);
      expect(store.get().map((t) => t.id)).toEqual(["local-fine"]);
    } finally {
      vi.doUnmock("./sanitize");
      vi.resetModules();
    }
  });
});
