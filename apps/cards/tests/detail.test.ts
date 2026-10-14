import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { effectKeywords } from "@/components/detail/effect-keywords";
import { parseEffectText } from "@/components/detail/effect-text";
import { cardSearchHref } from "@/components/detail/links";
import { validateDataset } from "@/lib/schema";
import { buildSearchIndex, filtersFromSearchParams, matchQuery, normalize } from "@/lib/search";

const dataDir = resolve(__dirname, "../public/data");
const readJson = (file: string): unknown => JSON.parse(readFileSync(resolve(dataDir, file), "utf8"));

describe("cardSearchHref", () => {
  it("quotes multi-word terms so they search as one phrase", () => {
    expect(cardSearchHref("Team 10")).toBe("/cards?q=%22Team%2010%22");
    expect(cardSearchHref("Naruto Uzumaki")).toBe("/cards?q=%22Naruto%20Uzumaki%22");
    expect(cardSearchHref('  Leaf "Village" ')).toBe("/cards?q=%22Leaf%20Village%22");
  });

  it("leaves single words unquoted", () => {
    expect(cardSearchHref("Rush")).toBe("/cards?q=Rush");
    expect(cardSearchHref("  Akatsuki ")).toBe("/cards?q=Akatsuki");
    expect(cardSearchHref("")).toBe("/cards");
  });

  it("only finds cards that carry the linked trait or quote it", () => {
    const { data } = validateDataset({
      cards: readJson("cards.json"),
      sets: readJson("sets.json"),
      decks: readJson("decks.json"),
    });
    const index = buildSearchIndex(data.cards, data.sets);
    const traits = [...new Set(data.cards.flatMap((card) => card.traits))].filter((trait) => /\s/.test(trait));
    expect(traits).toContain("Team 10");

    for (const trait of traits) {
      const href = cardSearchHref(trait);
      const { query } = filtersFromSearchParams(new URL(href, "https://cards.test").searchParams);
      const ids = matchQuery(index, query).matches.map(({ entry }) => entry.card.id);
      const tagged = data.cards.filter((card) => card.traits.includes(trait)).map((card) => card.id);
      // Every tagged card is found, and every extra hit names the phrase somewhere in its text.
      expect(ids, trait).toEqual(expect.arrayContaining(tagged));
      for (const card of data.cards.filter((c) => ids.includes(c.id) && !tagged.includes(c.id))) {
        const text = normalize([card.name, card.title ?? "", card.effect, card.flavor ?? ""].join(" "));
        expect(text, `${trait} → ${card.id}`).toContain(normalize(trait));
      }
    }
  });
});

describe("effectKeywords", () => {
  const keywordsOf = (text: string, own: readonly string[] = []) =>
    effectKeywords(parseEffectText(text, { keywords: own }));

  it("marks keywords that follow gain/gains in the same sentence as granted", () => {
    expect(keywordsOf("[Main] Up to 1 of your characters gains [Rush] until the end of your turn.")).toEqual([
      { label: "Rush", granted: true },
    ]);
    expect(
      keywordsOf("[When Attacking] This character gains +2000 power and [Double Attack] during this battle."),
    ).toEqual([{ label: "Double Attack", granted: true }]);
    expect(
      keywordsOf("Trash this Mission: Up to 2 of your {Leaf Village} characters gain [Blocker] until the end of turn."),
    ).toEqual([{ label: "Blocker", granted: true }]);
  });

  it("marks keywords the effect only mentions or forbids as referenced", () => {
    // NR01-039 Minato: the effect stops Blocker, it does not grant it.
    expect(
      keywordsOf(
        "[On Play] K.O. up to 1 of your opponent's characters with a cost of 5 or less. [When Attacking] Your opponent can't activate [Blocker] during this battle.",
      ),
    ).toEqual([{ label: "Blocker", granted: false }]);
    expect(keywordsOf("If you control 2 or more {Sand Village} characters with [Blocker], draw 2 cards.")).toEqual([
      { label: "Blocker", granted: false },
    ]);
    expect(keywordsOf("Your opponent's characters can't gain [Rush] this turn.")).toEqual([
      { label: "Rush", granted: false },
    ]);
  });

  it("does not carry gain across a sentence break or timing tag", () => {
    expect(keywordsOf("This character gains +1000 power. Characters with [Blocker] can't attack.")).toEqual([
      { label: "Blocker", granted: false },
    ]);
    expect(keywordsOf("[On Play] This character gains +1000 power [When Attacking] Negate [Blocker].")).toEqual([
      { label: "Blocker", granted: false },
    ]);
  });

  it("lists each keyword once, granted if any mention grants it", () => {
    expect(
      keywordsOf("If you control a character with [Blocker], draw 1 card.\nThen, this character gains [Blocker]."),
    ).toEqual([{ label: "Blocker", granted: true }]);
    expect(keywordsOf("[Rush] This character gains [Double Attack].", ["Rush"])).toEqual([
      { label: "Rush", granted: false },
      { label: "Double Attack", granted: true },
    ]);
  });

  it("returns nothing for vanilla or keyword-free text", () => {
    expect(effectKeywords([])).toEqual([]);
    expect(keywordsOf("[On Play] Draw 1 card.")).toEqual([]);
  });

  it("matches the dataset: only effects that grant a keyword are labelled granted", () => {
    const { data } = validateDataset({
      cards: readJson("cards.json"),
      sets: readJson("sets.json"),
      decks: readJson("decks.json"),
    });
    const referencedOnly = data.cards.flatMap((card) =>
      effectKeywords(parseEffectText(card.effect, { keywords: card.keywords }))
        .filter(({ label, granted }) => !granted && !card.keywords.includes(label))
        .map(({ label }) => `${card.id} ${label}`),
    );
    expect(referencedOnly).toEqual(expect.arrayContaining(["NR01-039 Blocker", "NR02-014 Blocker", "ST02-016 Blocker"]));
    for (const grant of ["NR01-013 Double Attack", "NR01-037 Blocker", "NR02-003 Rush", "NR03-017 Resilient"]) {
      expect(referencedOnly).not.toContain(grant);
    }
  });
});
