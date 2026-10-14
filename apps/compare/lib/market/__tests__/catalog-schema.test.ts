import { describe, expect, it } from "vitest";
import { CatalogSchema, toCatalog } from "../catalog-schema";
import { describeZodError } from "../ingest-schema";
import { SEED_CARDS, SEED_SETS } from "../seed/catalog";

/** The demo catalog in import-file form: a living example of the format. */
const seedFile = {
  sets: SEED_SETS,
  cards: SEED_CARDS.map(({ set: _set, ...card }) => card),
};

describe("CatalogSchema", () => {
  it("accepts the demo catalog and round-trips it", () => {
    const parsed = CatalogSchema.parse(seedFile);
    expect(toCatalog(parsed)).toEqual({ sets: SEED_SETS, cards: SEED_CARDS });
  });

  it("explains what is wrong with a bad catalog", () => {
    const result = CatalogSchema.safeParse({
      sets: [{ code: "ntg09", name: "Lower", releasedOn: "2026-02-30" }],
      cards: [
        { ...seedFile.cards[0], id: "NTG01-001" },
        { ...seedFile.cards[1], setCode: "NTG77", imageUrl: "http://insecure.example/a.png" },
        { ...seedFile.cards[2], id: seedFile.cards[3]!.id },
        { ...seedFile.cards[3] },
      ],
    });
    expect(result.success).toBe(false);
    const messages = describeZodError(result.error!).join("\n");
    expect(messages).toContain("sets.0.code: use upper-case letters, digits and dashes");
    expect(messages).toContain("sets.0.releasedOn");
    expect(messages).toContain("cards.0.id: use lower-case letters, digits and dashes");
    expect(messages).toContain("cards.1.imageUrl");
    expect(messages).toContain(`cards.3.id: duplicate card ${seedFile.cards[3]!.id}`);
  });
});
