import { describe, expect, it } from "vitest";
import { CARDS } from "@/lib/data/cards";
import { cardLabel, createCardResolver, describeSuggestions, FUZZY_THRESHOLD, MAX_CARD_TEXT_LENGTH, parseCardId, resolveCard } from "./cards";

describe("parseCardId", () => {
  it.each([
    ["NT02-001", "NT02-001"],
    ["nt02 001", "NT02-001"],
    ["NT02001", "NT02-001"],
    ["nt2-1", "NT02-001"],
    ["NT02-L02", "NT02-L02"],
    ["nt02 l2", "NT02-L02"],
    ["NT04_010", "NT04-010"],
  ])("%s → %s", (input, expected) => {
    expect(parseCardId(input)).toBe(expected);
  });

  it("rejects text that is not shaped like an id", () => {
    expect(parseCardId("Konan")).toBeNull();
    expect(parseCardId("NT")).toBeNull();
  });
});

describe("resolveCard by id", () => {
  it.each(["NT02-009", "nt02 009", "NT02009", "Konan (NT02-009)", "Konan [nt02-009]", "Konan NT02-009", "(NT02-009)"])(
    "%s",
    (input) => {
      expect(resolveCard(input)).toEqual({ cardId: "NT02-009", confidence: 1, method: "id", suggestions: [] });
    },
  );

  it("resolves leader ids", () => {
    expect(resolveCard("NT02-L02").cardId).toBe("NT02-L02");
  });

  it("returns nothing for a well-formed but unknown id", () => {
    expect(resolveCard("NT02-999")).toMatchObject({ cardId: null, method: "none" });
  });

  it("falls back to the name when the embedded id is unknown", () => {
    expect(resolveCard("Konan (NT09-123)")).toMatchObject({ cardId: "NT02-009", method: "exact" });
  });

  it("resolves every card by its own id and its own name", () => {
    for (const card of CARDS) {
      expect(resolveCard(card.id).cardId).toBe(card.id);
      expect(resolveCard(card.name, { preferType: card.type })).toMatchObject({ cardId: card.id, method: "exact", confidence: 1 });
    }
  });
});

describe("resolveCard by name", () => {
  it("matches case, diacritics and punctuation insensitively", () => {
    expect(resolveCard("konan")).toMatchObject({ cardId: "NT02-009", method: "normalized", confidence: 1 });
    expect(resolveCard("Pain - Deva Path")).toMatchObject({ cardId: "NT02-L02", method: "normalized" });
    expect(resolveCard("fukasaku and shima")).toMatchObject({ cardId: "NT03-002", confidence: 1 });
  });

  it("accepts names without the subtitle", () => {
    expect(resolveCard("Pain")).toMatchObject({ cardId: "NT02-L02", method: "normalized", confidence: 0.95 });
    expect(resolveCard("Tsunade").cardId).toBe("NT01-L02");
  });

  it("accepts the part after a colon", () => {
    expect(resolveCard("Massive Rasengan").cardId).toBe("NT03-007");
    expect(resolveCard("Goemon").cardId).toBe("NT03-023");
  });

  it("prefers a non-Leader for names shared with a Leader", () => {
    const result = resolveCard("Sasuke Uchiha");
    expect(result.cardId).toBe("NT02-001");
    expect(result.confidence).toBe(0.85);
    expect(result.suggestions.map((s) => s.cardId)).toEqual(["NT02-L01"]);
  });

  it("prefers the requested type", () => {
    expect(resolveCard("Sasuke Uchiha", { preferType: "leader" }).cardId).toBe("NT02-L01");
    expect(resolveCard("Kankuro", { preferType: "leader" }).cardId).toBe("NT03-L05");
    expect(resolveCard("Kankuro").cardId).toBe("NT03-025");
  });

  it("keeps an exact full-name match over a Leader sharing it as a short name", () => {
    expect(resolveCard("Neji Hyuga")).toMatchObject({ cardId: "NT01-018", confidence: 1 });
    expect(resolveCard("Neji Hyuga", { preferType: "leader" }).cardId).toBe("NT04-L02");
  });

  it("flags a tie between cards of the same type as low confidence", () => {
    const result = resolveCard("Rock Lee");
    expect(["NT01-028", "NT01-029"]).toContain(result.cardId);
    expect(result.confidence).toBeLessThan(0.8);
    expect(result.suggestions.map((s) => s.cardId)).toContain(result.cardId === "NT01-028" ? "NT01-029" : "NT01-028");
  });
});

describe("resolveCard fuzzy", () => {
  it.each([
    ["Konnan", "NT02-009"],
    ["Planetary Devastaton", "NT02-015"],
    ["Gamabuntaa", "NT03-003"],
    ["Almighty Pussh", "NT02-014"],
    ["Kakashi Hatake — Copy Ninjaa", "NT01-L01"],
  ])("%s → %s", (input, cardId) => {
    const result = resolveCard(input);
    expect(result.cardId).toBe(cardId);
    expect(result.method).toBe("fuzzy");
    expect(result.confidence).toBeGreaterThanOrEqual(FUZZY_THRESHOLD);
    expect(result.confidence).toBeLessThan(1);
  });

  it("only suggests below the threshold", () => {
    const result = resolveCard("Kona");
    expect(result).toMatchObject({ cardId: null, method: "none", confidence: 0 });
    expect(result.suggestions[0]?.cardId).toBe("NT02-009");
  });

  it("suggests cards whose names contain every word", () => {
    const result = resolveCard("Sasuke");
    expect(result.cardId).toBeNull();
    expect(result.suggestions.map((s) => s.cardId).sort()).toEqual(["NT02-001", "NT02-L01"]);
  });

  it("returns no suggestions for nonsense", () => {
    expect(resolveCard("Xyzzy Qwop")).toEqual({ cardId: null, confidence: 0, method: "none", suggestions: [] });
    expect(resolveCard("   ").method).toBe("none");
  });
});

describe("labels", () => {
  it("formats cards and suggestions", () => {
    expect(cardLabel("NT02-009")).toBe("Konan (NT02-009)");
    expect(cardLabel("NT09-001")).toBe("NT09-001");
    expect(describeSuggestions([])).toBe("");
    expect(
      describeSuggestions([
        { cardId: "NT02-009", name: "Konan", score: 0.8 },
        { cardId: "NT02-010", name: "Asura Path", score: 0.6 },
        { cardId: "NT02-011", name: "Preta Path", score: 0.5 },
      ]),
    ).toBe("Konan (NT02-009), Asura Path (NT02-010) or Preta Path (NT02-011)");
  });
});

/** Milliseconds `fn` takes. */
function elapsed(fn: () => unknown): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

describe("pathological input", () => {
  // These took seconds to minutes when the id pattern let whitespace be split between quantifiers.
  it.each([
    ["nt1 + 10,000 spaces + x", `nt1${" ".repeat(10_000)}x`],
    ["nt12 + 100,000 spaces + x", `nt12${" ".repeat(100_000)}x`],
    ["nt1 + 2,000 tabs + x", `nt1${"\t".repeat(2_000)}x`],
    ["a + 40,000 spaces + b", `a${" ".repeat(40_000)}b`],
    ["a + 40,000 spaces + (b", `a${" ".repeat(40_000)}(b`],
    ["nt11 + 40,000 spaces + x", `nt11${" ".repeat(40_000)}x`],
    ["5 KB of id-like text", "NT02 - ".repeat(700)],
  ])("resolves %s quickly to nothing", (_, input) => {
    let result: ReturnType<typeof resolveCard> | undefined;
    expect(elapsed(() => (result = resolveCard(input)))).toBeLessThan(50);
    expect(result!.cardId).toBeNull();
    expect(elapsed(() => parseCardId(input))).toBeLessThan(50);
  });

  it("still reads ids and names once their whitespace is collapsed", () => {
    expect(resolveCard("  Konan   (NT02-009)  ").cardId).toBe("NT02-009");
    expect(resolveCard("Konan    [nt02  -  009]").cardId).toBe("NT02-009");
    expect(parseCardId("NT02 - L 2")).toBe("NT02-L02");
    expect(parseCardId("nt02.001")).toBe("NT02-001");
    expect(parseCardId(`NT02-001${" ".repeat(30)}`)).toBe("NT02-001");
    expect(parseCardId(`NT02${" ".repeat(30)}001`)).toBeNull();
  });

  it("ignores text longer than any card name", () => {
    expect(resolveCard(`Konan ${"x".repeat(MAX_CARD_TEXT_LENGTH)}`).cardId).toBeNull();
    expect(resolveCard(`Konan (NT02-009) ${"x".repeat(MAX_CARD_TEXT_LENGTH)}`).cardId).toBeNull();
  });
});

describe("createCardResolver", () => {
  it("resolves like resolveCard, once per text", () => {
    const resolve = createCardResolver();
    expect(resolve("Konnan")).toEqual(resolveCard("Konnan"));
    expect(resolve("Konnan")).toBe(resolve("Konnan"));
    expect(resolve("Sasuke Uchiha", "leader").cardId).toBe("NT02-L01");
    expect(resolve.exhausted).toBe(false);
  });

  it("stops typo matching past its limit, still matching names and ids exactly", () => {
    const resolve = createCardResolver(1);
    expect(resolve("Konnan").cardId).toBe("NT02-009");
    expect(resolve("Gamabuntaa").cardId).toBeNull();
    expect(resolve.exhausted).toBe(true);
    expect(resolve("Konan").cardId).toBe("NT02-009");
    expect(resolve("NT02-014").cardId).toBe("NT02-014");
  });

  it("keeps thousands of different unknown names fast", () => {
    const resolve = createCardResolver();
    const time = elapsed(() => {
      for (let i = 0; i < 5_000; i++) resolve(`Mystery Ninja Card ${i}`);
    });
    expect(time).toBeLessThan(1_000);
  });
});
