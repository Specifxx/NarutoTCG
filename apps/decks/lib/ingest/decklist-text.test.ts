import type { Decklist } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { CARD_INDEX } from "@/lib/data/cards";
import { templateDecklist } from "./__fixtures__/lists";
import { buildDecklist, parseDecklistText, parseQuantity, parseSection } from "./decklist-text";

const PAIN: Decklist = {
  leaderId: "NT02-L02",
  cards: [
    { cardId: "NT02-009", quantity: 4 },
    { cardId: "NT02-014", quantity: 3 },
    { cardId: "NT02-016", quantity: 2 },
  ],
};

const codes = (text: string) => parseDecklistText(text).issues.map((issue) => issue.code);

describe("parseDecklistText formats", () => {
  it.each([
    ["quantity first", "Leader: Pain — Deva Path\n4 Konan\n3 Almighty Push\n2 Invasion of Konoha"],
    ["x quantities", "Leader: Pain\n4x Konan\n3 x Almighty Push\n2× Invasion of Konoha"],
    ["quantity last", "Leader - Pain — Deva Path\nKonan x4\nAlmighty Push x 3\nInvasion of Konoha (2)"],
    ["ids", "Leader: NT02-L02\n4 NT02-009\n3 nt02 014\n2 NT02016"],
    ["names with ids", "1 Pain — Deva Path (NT02-L02)\n4 Konan (NT02-009)\n3 Almighty Push (NT02-014)\n2 Invasion of Konoha (NT02-016)"],
    ["leader as a card", "1 Pain — Deva Path\n4 Konan\n3 Almighty Push\n2 Invasion of Konoha"],
    [
      "sections and comments",
      "// Pain, 3rd place\n# exported list\nLeader (1)\n1 Pain\nMain Deck: 9 cards\nCharacters (4)\n4 Konan\n\nJutsu:\n3 Almighty Push\nMissions\n2 Invasion of Konoha\nTotal: 9\n9 cards",
    ],
    ["semicolons", "Leader: Pain — Deva Path; 4 Konan; 3 Almighty Push; 2 Invasion of Konoha"],
    ["pipes", "1 Pain — Deva Path | 4x Konan | 3x Almighty Push | 2x Invasion of Konoha"],
    ["windows line endings", "Leader: Pain\r\n4 Konan\r\n3 Almighty Push\r\n2 Invasion of Konoha\r\n"],
  ])("%s", (_, text) => {
    expect(parseDecklistText(text)).toEqual({ decklist: PAIN, issues: [] });
  });

  it("merges duplicate entries and sorts by card id", () => {
    const { decklist, issues } = parseDecklistText("Leader: Pain\n2 Invasion of Konoha\n2 Konan\n2x NT02-009\n3 Almighty Push");
    expect(issues).toEqual([]);
    expect(decklist).toEqual(PAIN);
  });

  it("round-trips a full template list", () => {
    const list = templateDecklist("uzumaki-sage");
    const text = [`Leader: ${CARD_INDEX.get(list.leaderId)!.name}`, ...list.cards.map((e) => `${e.quantity} ${CARD_INDEX.get(e.cardId)!.name}`)].join("\n");
    const parsed = parseDecklistText(text);
    expect(parsed.issues).toEqual([]);
    expect(parsed.decklist).toEqual({ ...list, cards: [...list.cards].sort((a, b) => (a.cardId < b.cardId ? -1 : 1)) });
  });

  it("uses section headers to pick between cards sharing a name", () => {
    const { decklist, issues } = parseDecklistText("Leader\n1 Sasuke Uchiha\nCharacters\n4 Sasuke Uchiha");
    expect(issues).toEqual([]);
    expect(decklist).toEqual({ leaderId: "NT02-L01", cards: [{ cardId: "NT02-001", quantity: 4 }] });
  });

  it.each(["Leader: 1 Pain — Deva Path", "Leader: 1x Pain — Deva Path", "Leader: Pain — Deva Path x1", "Leader: Pain — Deva Path (1)"])(
    "reads a quantity on the Leader line: %s",
    (leaderLine) => {
      expect(parseDecklistText(`${leaderLine}\n4 Konan\n3 Almighty Push\n2 Invasion of Konoha`)).toEqual({ decklist: PAIN, issues: [] });
    },
  );

  it("ignores trailing // comments", () => {
    const text = "Leader: Pain // deva path\n4 Konan // core\n3 Almighty Push\n2 Invasion of Konoha  // tech";
    expect(parseDecklistText(text)).toEqual({ decklist: PAIN, issues: [] });
  });

  it("returns nothing for empty text", () => {
    expect(parseDecklistText("  \n// nothing here\n")).toEqual({ decklist: null, issues: [] });
  });
});

describe("parseDecklistText issues", () => {
  it("reports unknown cards with suggestions and keeps the rest", () => {
    const { decklist, issues } = parseDecklistText("Leader: Pain\n4 Konan\n2 Kona\n3 Mystery Scroll");
    expect(decklist).toEqual({ leaderId: "NT02-L02", cards: [{ cardId: "NT02-009", quantity: 4 }] });
    expect(issues.map((i) => [i.severity, i.code])).toEqual([
      ["error", "unknown-card"],
      ["error", "unknown-card"],
    ]);
    expect(issues[0]!.suggestion).toContain("Konan (NT02-009)");
    expect(issues[1]!.message).toContain('"Mystery Scroll"');
  });

  it("warns about typo corrections, naming the card used", () => {
    const { decklist, issues } = parseDecklistText("Leader: Pain\n4 Konnan");
    expect(decklist!.cards).toEqual([{ cardId: "NT02-009", quantity: 4 }]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "warning", code: "card-fuzzy-match" });
    expect(issues[0]!.message).toContain("Konan (NT02-009)");
  });

  it("warns about ambiguous names", () => {
    expect(codes("Leader: Rock Lee — Splendid Taijutsu\n4 Rock Lee")).toEqual(["card-ambiguous"]);
  });

  it("requires exactly one Leader", () => {
    const missing = parseDecklistText("4 Konan\n4 Asura Path");
    expect(missing.decklist).toBeNull();
    expect(missing.issues.map((i) => i.code)).toEqual(["missing-leader"]);
    expect(codes("Leader: Pain\n1 Itachi Uchiha — Akatsuki\n4 Konan")).toEqual(["multiple-leaders"]);
    expect(codes("Leader: Konan\n1 Pain\n4 Asura Path")).toEqual(["not-a-leader"]);
    expect(codes("2 Pain\n4 Konan")).toEqual(["leader-quantity"]);
    expect(codes("Leader: 2x Pain\n4 Konan")).toEqual(["leader-quantity"]);
  });

  it("handles missing and invalid quantities", () => {
    const { decklist, issues } = parseDecklistText("Pain — Deva Path\nKonan\n0 Asura Path");
    expect(decklist).toEqual({ leaderId: "NT02-L02", cards: [{ cardId: "NT02-009", quantity: 1 }] });
    expect(issues.map((i) => i.code)).toEqual(["missing-quantity", "invalid-quantity"]);
  });

  it("attaches the context to every issue", () => {
    const { issues } = parseDecklistText("4 Konnan", { source: "standings", row: 7, field: "decklist", owner: "Kenji Morrow" });
    expect(issues).toHaveLength(2);
    for (const issue of issues) {
      expect(issue).toMatchObject({ source: "standings", row: 7, field: "decklist" });
      expect(issue.message.startsWith("Kenji Morrow: ")).toBe(true);
    }
  });
});

describe("buildDecklist", () => {
  it("uses per-line rows and sections from long-format rows", () => {
    const { decklist, issues } = buildDecklist(
      [
        { quantity: 1, card: "Sasuke Uchiha", section: "leader", leader: true, row: 2 },
        { quantity: 4, card: "Sasuke Uchiha", section: "character", row: 3 },
        { quantity: 4, card: "Chidory", section: "jutsu", row: 4 },
        { quantity: 1, card: "Konan", section: "leader", leader: true, row: 5 },
      ],
      { source: "decklists" },
    );
    expect(decklist).toEqual({ leaderId: "NT02-L01", cards: [{ cardId: "NT02-001", quantity: 4 }, { cardId: "NT02-006", quantity: 4 }] });
    expect(issues.map((i) => [i.code, i.row])).toEqual([
      ["card-fuzzy-match", 4],
      ["not-a-leader", 5],
    ]);
  });
});

describe("parseSection / parseQuantity", () => {
  it.each([
    ["Characters (24)", "character"],
    ["Jutsu:", "jutsu"],
    ["MISSIONS - 6", "mission"],
    ["Leader", "leader"],
    ["Main Deck (50)", "main"],
    ["Konan", null],
    ["constructor", null],
  ])("parseSection(%s) → %s", (input, expected) => {
    expect(parseSection(input)).toBe(expected);
  });

  it("reads quantities", () => {
    expect(parseQuantity("4")).toBe(4);
    expect(parseQuantity(" x3 ")).toBe(3);
    expect(parseQuantity("2x")).toBe(2);
    expect(parseQuantity("")).toBeNull();
    expect(parseQuantity(undefined)).toBeNull();
    expect(parseQuantity("four")).toBeNaN();
  });
});
