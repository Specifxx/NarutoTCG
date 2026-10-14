import { appUrl } from "@naruto-tcg/ui";
import { describe, expect, it } from "vitest";
import { getCard } from "@/lib/data/cards";
import { decodeDecklist } from "@/lib/decks/deck-utils";
import { cardLabel, typeLine, villageStyle } from "./card-style";
import { deckFileName, deckShareCode, priceCheckHref, simulatorHref } from "./deck-export";

describe("deck export helpers", () => {
  const list = { leaderId: "NT02-L01", cards: [{ cardId: "NT02-006", quantity: 4 }, { cardId: "NT01-040", quantity: 2 }] };

  it("builds a decodable share code, or null for unencodable ids", () => {
    const code = deckShareCode(list)!;
    expect(code).toBe("NT02-L01.NT01-040x2.NT02-006x4");
    expect(decodeDecklist(code)).toEqual({ leaderId: "NT02-L01", cards: [{ cardId: "NT01-040", quantity: 2 }, { cardId: "NT02-006", quantity: 4 }] });
    expect(deckShareCode({ leaderId: "bad id!", cards: [] })).toBeNull();
  });

  it("links the simulator and price checker with the code", () => {
    expect(simulatorHref("NT02-L01.NT01-040x2")).toBe(`${appUrl("simulator")}/?deck=NT02-L01.NT01-040x2`);
    expect(priceCheckHref("NT02-L01.NT01-040x2")).toBe(`${appUrl("compare")}/?deck=NT02-L01.NT01-040x2`);
  });

  it("names the download after the deck and author", () => {
    expect(deckFileName({ name: "Uchiha Avenger", author: { name: "Joaquín Ferrand" } })).toBe("uchiha-avenger-by-joaquin-ferrand.txt");
    expect(deckFileName({ name: "—", author: { name: "" } })).toBe("by.txt");
    expect(deckFileName({ name: "", author: { name: "日本" } })).toBe("by.txt");
    expect(deckFileName({ name: "x".repeat(200), author: { name: "y" } }).length).toBeLessThanOrEqual(84);
  });
});

describe("card style helpers", () => {
  it("formats type lines and accessible labels", () => {
    const chidori = getCard("NT02-006")!;
    expect(typeLine(chidori)).toBe("Jutsu — Ninjutsu · Lightning · Uchiha");
    expect(typeLine({ type: "mission", traits: [] })).toBe("Mission");
    expect(cardLabel(chidori, 4)).toBe("Chidori, 2-cost Jutsu, 4 copies");
    const leader = getCard("NT02-L01")!;
    expect(cardLabel(leader, 1)).toBe(`${leader.name}, Leader, 5000 power, 1 copy`);
  });

  it("falls back to a neutral village style", () => {
    expect(villageStyle("Leaf").accent).not.toBe(villageStyle(undefined).accent);
    expect(villageStyle("Nowhere")).toEqual(villageStyle("Neutral"));
  });
});
