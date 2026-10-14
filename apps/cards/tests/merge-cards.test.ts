import { describe, expect, it } from "vitest";
import { mergeCards } from "../scripts/merge-cards.mjs";

const sets = [
  { id: "ST01", releaseDate: "2026-03-06" },
  { id: "PR01", releaseDate: "2026-05-15" },
  { id: "NR03", releaseDate: "2026-11-20" },
];
const sasuke = {
  id: "ST01-002",
  name: "Sasuke Uchiha",
  effect: "[On Play] K.O. up to 1 of your opponent's characters with 3000 power or less.",
  traits: ["Leaf Village"],
  printings: [{ setId: "ST01", number: "ST01-002", rarity: "super-rare", variant: "standard" }],
};

describe("mergeCards", () => {
  it("appends new cards in canonical set order", () => {
    const incoming = [{ id: "NR03-030", name: "Deidara", printings: [{ setId: "NR03", number: "NR03-030", rarity: "rare" }] }];
    const { cards, added } = mergeCards([sasuke], incoming, sets);
    expect(added).toEqual(["NR03-030"]);
    expect(cards.map((c) => c.id)).toEqual(["ST01-002", "NR03-030"]);
    expect(cards[1]?.printings).toEqual([{ variant: "standard", setId: "NR03", number: "NR03-030", rarity: "rare" }]);
  });

  it("unions printings and never wipes data with empty scraped values", () => {
    const incoming = {
      cards: [
        {
          id: "ST01-002",
          effect: "",
          traits: [],
          imageUrl: "https://cdn.example/sasuke.png",
          printings: [{ setId: "PR01", number: "P-007", rarity: "promo", variant: "promo" }],
        },
      ],
    };
    const { cards, updated } = mergeCards([sasuke], incoming, sets);
    expect(updated).toEqual(["ST01-002"]);
    const merged = cards[0];
    expect(merged?.effect).toBe(sasuke.effect);
    expect(merged?.traits).toEqual(["Leaf Village"]);
    expect(merged?.imageUrl).toBe("https://cdn.example/sasuke.png");
    expect(merged?.printings).toHaveLength(2);
  });

  it("updates a matching printing and keeps the earliest reveal", () => {
    const existing = [{ ...sasuke, reveal: { date: "2026-02-01", source: "A", url: "https://a.example" } }];
    const incoming = [
      {
        id: "ST01-002",
        reveal: { date: "2026-02-10", source: "B", url: "https://b.example" },
        printings: [{ setId: "ST01", number: "ST01-002", variant: "standard", imageUrl: "https://cdn.example/st01.png" }],
      },
    ];
    const merged = mergeCards(existing, incoming, sets).cards[0];
    expect(merged?.reveal).toMatchObject({ source: "A" });
    expect(merged?.printings).toEqual([{ ...sasuke.printings[0], imageUrl: "https://cdn.example/st01.png" }]);
  });

  it("reports unchanged records and rejects records without an id", () => {
    expect(mergeCards([sasuke], [{ id: "ST01-002", name: "Sasuke Uchiha" }], sets).unchanged).toEqual(["ST01-002"]);
    expect(() => mergeCards([sasuke], [{ name: "No id" }], sets)).toThrow(/no string "id"/);
    expect(() => mergeCards([sasuke], "nope", sets)).toThrow(/JSON array/);
  });
});
