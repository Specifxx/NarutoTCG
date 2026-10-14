import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DECK_SIZE, MAX_COPIES, validateDataset } from "@/lib/schema";

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

  it("accepts a minimal card and fills defaults", () => {
    const { data, errors } = run({});
    expect(errors).toEqual([]);
    expect(data.cards[0]).toMatchObject({ traits: [], keywords: [], printings: [{ variant: "standard" }] });
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
