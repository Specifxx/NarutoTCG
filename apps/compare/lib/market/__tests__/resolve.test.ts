import { describe, expect, it } from "vitest";
import { resolveCardRef } from "../resolve";
import type { MarketCard } from "../types";

const base = { set: "Set One", setCode: "NTG01", type: "character", character: "Naruto Uzumaki" } as const;
const CARDS: MarketCard[] = [
  { ...base, id: "ntg01-001", name: "Naruto Uzumaki", number: "001", rarity: "rare", finish: "non-foil" },
  { ...base, id: "ntg01-001-f", name: "Naruto Uzumaki", number: "001", rarity: "rare", finish: "foil" },
  { ...base, id: "ntg01-001-p", name: "Naruto Uzumaki", number: "001", rarity: "parallel", finish: "foil" },
  { ...base, id: "ntg01-015-f", name: "Kunai", character: "Kunai", number: "015", rarity: "common", finish: "foil" },
  { ...base, id: "ntg01-020", name: "Sakura Haruno", character: "Sakura Haruno", number: "020", rarity: "super-rare", finish: "non-foil" },
];

describe("resolveCardRef", () => {
  it("never files a parallel price under the base printing", () => {
    // Only one non-parallel foil exists for #015: a parallel claim must not land on it.
    expect(resolveCardRef(CARDS, { setCode: "NTG01", number: "015", finish: "foil", rarity: "parallel" })).toEqual({
      status: "not-found",
    });
    expect(resolveCardRef(CARDS, { setCode: "NTG01", number: "001", finish: "non-foil", rarity: "parallel" })).toEqual({
      status: "not-found",
    });
    expect(resolveCardRef(CARDS, { setCode: "NTG01", number: "001", finish: "foil", rarity: "parallel" })).toEqual({
      status: "matched",
      cardId: "ntg01-001-p",
    });
  });

  it("never files a regular price under a parallel or promo printing", () => {
    expect(resolveCardRef(CARDS, { setCode: "NTG01", number: "001", finish: "foil", rarity: "rare" })).toEqual({
      status: "matched",
      cardId: "ntg01-001-f",
    });
    expect(resolveCardRef(CARDS, { setCode: "NTG01", number: "001", finish: "foil", rarity: "promo" })).toEqual({
      status: "not-found",
    });
  });

  it("tolerates a misread base rarity", () => {
    expect(resolveCardRef(CARDS, { setCode: "NTG01", number: "020", rarity: "secret-rare" })).toEqual({
      status: "matched",
      cardId: "ntg01-020",
    });
  });

  it("reports ambiguity instead of guessing", () => {
    expect(resolveCardRef(CARDS, { setCode: "NTG01", number: "001", finish: "foil" })).toEqual({
      status: "ambiguous",
      candidates: ["ntg01-001-f", "ntg01-001-p"],
    });
  });
});
