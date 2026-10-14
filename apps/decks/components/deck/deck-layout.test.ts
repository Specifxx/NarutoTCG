import type { Decklist } from "@naruto-tcg/types";
import { afterEach, describe, expect, it } from "vitest";
import { getCard } from "@/lib/data/cards";
import { groupDecklist } from "@/lib/decks/deck-utils";
import { getDeckCatalog } from "@/lib/decks/repository";
import { groupDecklistForDisplay } from "./deck-layout";

const originalCompare = String.prototype.localeCompare;

/** Makes calls without an explicit locale collate like a Czech browser ("ch" sorts after "h"). */
function useCzechDefaultLocale() {
  String.prototype.localeCompare = function (this: string, that: string, locales?: string | string[], options?: Intl.CollatorOptions) {
    return originalCompare.call(this, that, locales ?? "cs", options);
  };
}

afterEach(() => {
  String.prototype.localeCompare = originalCompare;
});

// Two cost-4 Characters whose order flips under Czech collation.
const HIASHI = "NT01-019";
const CHOJI = "NT01-038";
const list: Decklist = { leaderId: "NT01-L01", cards: [{ cardId: HIASHI, quantity: 2 }, { cardId: CHOJI, quantity: 3 }] };

describe("groupDecklistForDisplay", () => {
  it("uses the fixture it relies on", () => {
    expect(getCard(HIASHI)).toMatchObject({ name: "Hiashi Hyuga", cost: 4, type: "character" });
    expect(getCard(CHOJI)).toMatchObject({ name: "Choji Akimichi", cost: 4, type: "character" });
  });

  it("orders same-cost cards by English name whatever the runtime's default locale", () => {
    useCzechDefaultLocale();
    const [characters] = groupDecklistForDisplay(list).sections;
    expect(characters!.entries.map((entry) => entry.card.id)).toEqual([CHOJI, HIASHI]);
  });

  it("matches the shared grouping on an English runtime: same sections, counts and unknown ids", () => {
    for (const deck of getDeckCatalog().slice(0, 20)) {
      const shared = groupDecklist(deck.decklist);
      const display = groupDecklistForDisplay(deck.decklist);
      expect(display.leader).toBe(shared.leader);
      expect(display.unknownCardIds).toEqual(shared.unknownCardIds);
      expect(display.sections).toEqual(shared.sections);
    }
  });
});
