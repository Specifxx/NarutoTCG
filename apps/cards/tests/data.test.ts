import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CardSet, NarutoCard } from "@naruto-tcg/types";
import { DECK_SIZE, MAX_COPIES, orderPrintingsByRelease, validateDataset } from "@/lib/schema";

// Paths can be overridden to validate staged data before it is merged, e.g.
// CARDS_JSON=/tmp/new-cards.json pnpm --filter @naruto-tcg/cards validate:data
const dataDir = resolve(__dirname, "../public/data");
const readJson = (envVar: string, file: string): unknown =>
  JSON.parse(readFileSync(process.env[envVar] ?? resolve(dataDir, file), "utf8"));

describe("public/data", () => {
  const result = validateDataset({
    cards: readJson("CARDS_JSON", "cards.json"),
    sets: readJson("SETS_JSON", "sets.json"),
    decks: readJson("DECKS_JSON", "decks.json"),
  });

  it("has no validation errors", () => {
    expect(result.errors).toEqual([]);
  });

  it("has no validation warnings", () => {
    expect(result.warnings).toEqual([]);
  });

  it("has at least one card per set", () => {
    const used = new Set(result.data.cards.flatMap((c) => c.printings.map((p) => p.setId)));
    expect(result.data.sets.filter((s) => !used.has(s.id)).map((s) => s.id)).toEqual([]);
  });

  it("only contains legal decks", () => {
    for (const deck of result.data.decks) {
      expect(deck.leaderId, `${deck.id} leader`).toBeDefined();
      expect(deck.cards.reduce((n, e) => n + e.quantity, 0), `${deck.id} size`).toBe(DECK_SIZE);
      expect(Math.max(...deck.cards.map((e) => e.quantity)), `${deck.id} copies`).toBeLessThanOrEqual(MAX_COPIES);
    }
  });
});

describe("validateDataset", () => {
  const set = { id: "T1", name: "Test Set", kind: "booster", releaseDate: "2026-01-01", totalCards: 5 };
  const card = {
    id: "T1-001",
    name: "Test Ninja",
    type: "character",
    element: "fire",
    cost: 2,
    power: 3000,
    effect: "",
    printings: [{ setId: "T1", number: "T1-001", rarity: "common" }],
  };
  const run = (overrides: { cards?: unknown; sets?: unknown; decks?: unknown }) =>
    validateDataset({ cards: [card], sets: [set], decks: [], ...overrides });

  const deck = (overrides: Record<string, unknown>) => ({
    id: "d1",
    name: "Deck",
    cards: [{ cardId: "T1-001", quantity: 1 }],
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a minimal card and fills defaults", () => {
    const { data, errors, warnings } = run({});
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(data.cards[0]).toMatchObject({ traits: [], keywords: [], printings: [{ variant: "standard" }] });
  });

  it("treats null required integers as missing instead of dropping the record", () => {
    const { data, errors } = run({
      sets: [set, { ...set, id: "T2", totalCards: null }],
      decks: [deck({ cards: [{ cardId: "T1-001", quantity: null }] })],
    });
    expect(errors).toContain("sets[T2].totalCards: is required");
    expect(errors).toContain("decks[d1].cards[0].quantity: is required");
    expect(data.sets.map((s) => s.id)).toEqual(["T1"]);
  });

  it("requires totalCards of at least 1", () => {
    const { errors } = run({ sets: [{ ...set, totalCards: 0 }] });
    expect(errors).toContain("sets[T1].totalCards: must be an integer between 1 and 10000");
  });

  it("rejects reveal dates more than a day in the future", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
    const reveal = (date: string) => ({ date, source: "X", url: "https://example.com" });
    const { data, errors } = run({
      cards: [
        { ...card, reveal: reveal("2026-10-14") },
        { ...card, id: "T1-002", printings: [{ setId: "T1", number: "T1-002", rarity: "common" }], reveal: reveal("2026-10-15") },
        { ...card, id: "T1-003", printings: [{ setId: "T1", number: "T1-003", rarity: "common" }], reveal: reveal("2026-10-16") },
        { ...card, id: "T1-004", printings: [{ setId: "T1", number: "T1-004", rarity: "common" }], reveal: reveal("2062-10-13") },
      ],
    });
    expect(errors).toEqual([
      'cards[T1-003].reveal.date: "2026-10-16" is in the future',
      'cards[T1-004].reveal.date: "2062-10-13" is in the future',
    ]);
    expect(data.cards.filter((c) => c.reveal).map((c) => c.id)).toEqual(["T1-001", "T1-002"]);
  });

  it("checks that deck dates are real calendar dates", () => {
    const { errors } = run({
      decks: [
        deck({ id: "d1", updatedAt: "2026-13-01" }),
        deck({ id: "d2", createdAt: "2026-02-30" }),
        deck({ id: "d3", createdAt: "2026-03-06T09:30:00Z", updatedAt: "2026-03-06T18:30:00.000+09:00" }),
      ],
    });
    expect(errors).toEqual([
      'decks[d1].updatedAt: "2026-13-01" must be a valid ISO date or datetime',
      'decks[d2].createdAt: "2026-02-30" must be a valid ISO date or datetime',
    ]);
  });

  it("rewrites keywords to glossary spelling and drops case variants", () => {
    const { data, errors, warnings } = run({
      cards: [
        { ...card, keywords: ["rush", "BLOCKER", "double  attack", "Brand New"] },
        {
          ...card,
          id: "T1-002",
          printings: [{ setId: "T1", number: "T1-002", rarity: "common" }],
          keywords: ["Rush", "rush"],
        },
      ],
    });
    expect(errors).toEqual([]);
    expect(data.cards[0]?.keywords).toEqual(["Rush", "Blocker", "Double Attack", "Brand New"]);
    expect(data.cards[1]?.keywords).toEqual(["Rush"]);
    expect(warnings).toEqual(['cards[T1-002].keywords: duplicate entry "rush"']);
  });

  it("strips invisible formatting characters from text", () => {
    const { data, errors } = run({
      cards: [
        {
          ...card,
          id: "\uFEFFT1-001",
          name: "Naruto Uzu\u00ADmaki",
          title: "\u202ESage\u202C",
          traits: ["Leaf\u200B Village"],
          effect: "[On\u200B Play] Draw 1.\n[Main] Gain 1 chakra.",
        },
        { ...card, id: "T1-002", name: "\u200B\u2060", printings: [{ setId: "T1", number: "T1-002", rarity: "common" }] },
      ],
    });
    expect(data.cards[0]).toMatchObject({
      id: "T1-001",
      name: "Naruto Uzumaki",
      title: "Sage",
      traits: ["Leaf Village"],
      effect: "[On Play] Draw 1.\n[Main] Gain 1 chakra.",
    });
    expect(errors).toEqual(["cards[T1-002].name: must be a non-empty string"]);
  });

  it("warns about unknown fields", () => {
    const { data, errors, warnings } = run({
      cards: [
        {
          ...card,
          imageURL: "https://example.com/a.png",
          printings: [{ setId: "T1", number: "T1-001", rarity: "common", image_url: "https://example.com/b.png" }],
          reveal: { date: "2026-01-01", source: "X", url: "https://example.com", sourceUrl: "https://example.com" },
        },
      ],
      sets: [{ ...set, size: 5 }],
      decks: [deck({ format: "standard", cards: [{ cardId: "T1-001", quantity: 1, qty: 1 }] })],
    });
    expect(errors).toEqual([]);
    expect(data.cards).toHaveLength(1);
    expect(warnings).toEqual(
      expect.arrayContaining([
        "sets[T1].size: unknown field (typo?)",
        "cards[T1-001].imageURL: unknown field (typo?)",
        "cards[T1-001].printings[0].image_url: unknown field (typo?)",
        "cards[T1-001].reveal.sourceUrl: unknown field (typo?)",
        "decks[d1].format: unknown field (typo?)",
        "decks[d1].cards[0].qty: unknown field (typo?)",
      ]),
    );
  });

  it("requires URL-safe collector numbers", () => {
    const { errors } = run({ cards: [{ ...card, printings: [{ setId: "T1", number: "T1/001", rarity: "common" }] }] });
    expect(errors).toEqual(['cards[T1-001].printings[0].number: "T1/001" may only contain letters, digits, "-" and "_"']);
  });

  it("lets a card's variants share its collector number but not another card", () => {
    const parallel = { setId: "T1", number: "T1-001", rarity: "parallel-rare", variant: "parallel" };
    const own = run({ cards: [{ ...card, printings: [...card.printings, parallel] }] });
    expect(own.errors).toEqual([]);

    const stolen = run({ cards: [card, { ...card, id: "T1-002", printings: [parallel] }] });
    expect(stolen.errors).toEqual(["cards[T1-002].printings: collector number T1:T1-001 already belongs to T1-001"]);
  });

  it("warns when the first printing is not the debut", () => {
    const promo = { id: "P1", name: "Promo", kind: "promo", releaseDate: "2026-06-01", totalCards: 5 };
    const sameDay = { ...set, id: "T2" };
    const promoPrinting = { setId: "P1", number: "P-001", rarity: "promo", variant: "promo" };
    const { errors, warnings } = run({
      sets: [set, sameDay, promo],
      cards: [
        { ...card, printings: [promoPrinting, ...card.printings] },
        // Same-day sets keep their listed order without a warning.
        { ...card, id: "T2-001", printings: [{ setId: "T2", number: "T2-001", rarity: "common" }, { setId: "T1", number: "T1-002", rarity: "common" }] },
      ],
    });
    expect(errors).toEqual([]);
    expect(warnings).toEqual([
      "cards[T1-001].printings: first entry should be the debut printing (T1 released 2026-01-01, before P1 on 2026-06-01)",
    ]);
  });

  it("rejects unknown enums, missing cost, and bad references", () => {
    const { errors } = run({
      cards: [
        { ...card, element: "yin" },
        { ...card, id: "T1-002", cost: undefined },
        { ...card, id: "T1-003", printings: [{ setId: "NOPE", number: "X", rarity: "common" }] },
      ],
    });
    expect(errors.some((e) => e.includes(".element"))).toBe(true);
    expect(errors.some((e) => e.includes("cards[T1-002].cost"))).toBe(true);
    expect(errors.some((e) => e.includes('unknown setId "NOPE"'))).toBe(true);
  });

  it("rejects duplicate ids and duplicate printings", () => {
    const { errors } = run({ cards: [card, card] });
    expect(errors.some((e) => e.includes("duplicate card id"))).toBe(true);
    expect(errors.some((e) => e.includes("is also listed on"))).toBe(true);
  });

  it("rejects leaders with a cost and invalid dates and URLs", () => {
    const { errors } = run({
      cards: [
        {
          ...card,
          type: "leader",
          cost: 3,
          imageUrl: "javascript:alert(1)",
          reveal: { date: "2026-02-30", source: "X", url: "ftp://x" },
        },
      ],
    });
    expect(errors.some((e) => e.includes("leaders must not have a cost"))).toBe(true);
    expect(errors.some((e) => e.includes(".imageUrl"))).toBe(true);
    expect(errors.some((e) => e.includes("reveal.date"))).toBe(true);
    expect(errors.some((e) => e.includes("reveal.url"))).toBe(true);
  });

  it("checks deck references", () => {
    const { errors } = run({
      decks: [
        {
          id: "d1",
          name: "Deck",
          leaderId: "T1-001",
          cards: [
            { cardId: "MISSING", quantity: 1 },
            { cardId: "T1-001", quantity: MAX_COPIES + 1 },
          ],
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ],
    });
    expect(errors.some((e) => e.includes("is not a leader"))).toBe(true);
    expect(errors.some((e) => e.includes('unknown card "MISSING"'))).toBe(true);
    expect(errors.some((e) => e.includes(".quantity"))).toBe(true);
  });
});

describe("orderPrintingsByRelease", () => {
  const sets: CardSet[] = [
    { id: "ST01", name: "Starter 1", shortName: "ST01", kind: "starter", releaseDate: "2026-03-06", totalCards: 16 },
    { id: "ST02", name: "Starter 2", shortName: "ST02", kind: "starter", releaseDate: "2026-03-06", totalCards: 16 },
    { id: "PR01", name: "Promo 1", shortName: "PR01", kind: "promo", releaseDate: "2026-05-15", totalCards: 12 },
  ];
  const card: NarutoCard = {
    id: "ST01-002",
    name: "Test Ninja",
    type: "character",
    element: "fire",
    cost: 2,
    power: 3000,
    traits: [],
    keywords: [],
    effect: "",
    printings: [
      { setId: "PR01", number: "P-007", rarity: "promo", variant: "promo" },
      { setId: "GONE", number: "G-001", rarity: "common", variant: "standard" },
      { setId: "ST02", number: "ST02-002", rarity: "common", variant: "standard" },
      { setId: "ST01", number: "ST01-002", rarity: "common", variant: "standard" },
      { setId: "ST01", number: "ST01-002", rarity: "parallel-rare", variant: "parallel" },
    ],
  };
  const order = (c: NarutoCard | undefined) => c?.printings.map((p) => `${p.setId}:${p.variant}`);

  it("puts the earliest set first, keeps listed order for ties and unknown sets last", () => {
    const [sorted] = orderPrintingsByRelease([card], sets);
    expect(order(sorted)).toEqual(["ST02:standard", "ST01:standard", "ST01:parallel", "PR01:promo", "GONE:standard"]);
  });

  it("does not mutate its input", () => {
    orderPrintingsByRelease([card], sets);
    expect(order(card)).toEqual(["PR01:promo", "GONE:standard", "ST02:standard", "ST01:standard", "ST01:parallel"]);
  });
});

describe("lib/data loading", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock("server-only");
    vi.doUnmock("../public/data/cards.json");
    vi.doUnmock("../public/data/sets.json");
    vi.doUnmock("../public/data/decks.json");
    vi.resetModules();
  });

  it("logs warnings without failing and serves the debut printing first", async () => {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    vi.doMock("../public/data/sets.json", () => ({
      default: [
        { id: "T1", name: "Test Set", kind: "booster", releaseDate: "2026-01-01", totalCards: 5 },
        { id: "P1", name: "Promo", kind: "promo", releaseDate: "2026-06-01", totalCards: 5 },
      ],
    }));
    vi.doMock("../public/data/cards.json", () => ({
      default: [
        {
          id: "T1-001",
          name: "Test Ninja",
          type: "character",
          element: "fire",
          cost: 2,
          power: 3000,
          printings: [
            { setId: "P1", number: "P-001", rarity: "promo", variant: "promo" },
            { setId: "T1", number: "T1-001", rarity: "common" },
          ],
        },
      ],
    }));
    vi.doMock("../public/data/decks.json", () => ({ default: [] }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { getCard, getSetEntries } = await import("@/lib/data");

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain(
      "cards[T1-001].printings: first entry should be the debut printing (T1 released 2026-01-01, before P1 on 2026-06-01)",
    );
    expect(getCard("T1-001")?.printings.map((p) => p.setId)).toEqual(["T1", "P1"]);
    expect(getSetEntries("P1").map((e) => e.card.id)).toEqual(["T1-001"]);
  });
});
