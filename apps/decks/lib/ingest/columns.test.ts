import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { autoMapColumns, cell, COLUMN_FIELDS, CSV_KINDS, describeFields, detectCsvKind, missingRequiredFields, requiredFields } from "./columns";
import { parseCsv } from "./csv";

const templateHeaders = (file: string) =>
  parseCsv(readFileSync(fileURLToPath(new URL(`../../public/templates/${file}`, import.meta.url)), "utf8")).headers;

describe("autoMapColumns", () => {
  it("maps the template headers", () => {
    expect(autoMapColumns("standings", templateHeaders("standings-template.csv"))).toEqual({
      placement: "Placement",
      player: "Player",
      playerId: "Player ID",
      country: "Country",
      archetype: "Deck",
      record: "Record",
      wins: null,
      losses: null,
      draws: null,
      points: "Points",
      dropped: "Dropped",
      decklist: null,
    });
    expect(autoMapColumns("pairings", templateHeaders("pairings-template.csv"))).toEqual({
      round: "Round",
      table: "Table",
      player1: "Player 1",
      player2: "Player 2",
      result: "Result",
      winner: null,
      stage: "Stage",
    });
    expect(autoMapColumns("decklists", templateHeaders("decklists-template.csv"))).toEqual({
      player: "Player",
      quantity: "Quantity",
      card: "Card",
      cardId: "Card ID",
      section: "Section",
    });
  });

  it("matches synonyms regardless of case and punctuation", () => {
    const standings = autoMapColumns("standings", ["RANK", "name", "Handle", "deck archetype", "W-L-D", "W", "L", "T", "PTS", "drop", "Deck List"]);
    expect(standings).toMatchObject({
      placement: "RANK",
      player: "name",
      playerId: "Handle",
      archetype: "deck archetype",
      record: "W-L-D",
      wins: "W",
      losses: "L",
      draws: "T",
      points: "PTS",
      dropped: "drop",
      decklist: "Deck List",
    });
    expect(autoMapColumns("standings", ["#", "Competitor"])).toMatchObject({ placement: "#", player: "Competitor" });
    expect(autoMapColumns("pairings", ["Rd", "Tbl #", "P1", "Opponent", "Score", "Won By", "Phase"])).toEqual({
      round: "Rd",
      table: "Tbl #",
      player1: "P1",
      player2: "Opponent",
      result: "Score",
      winner: "Won By",
      stage: "Phase",
    });
    expect(autoMapColumns("decklists", ["Pilot", "QTY", "Card Name", "Code", "Type"])).toEqual({
      player: "Pilot",
      quantity: "QTY",
      card: "Card Name",
      cardId: "Code",
      section: "Type",
    });
  });

  it("falls back to headers that contain a synonym", () => {
    expect(autoMapColumns("pairings", ["Round Number", "Player 1 Name", "Player 2 Name", "Match Result (P1)"])).toMatchObject({
      round: "Round Number",
      player1: "Player 1 Name",
      player2: "Player 2 Name",
      result: "Match Result (P1)",
    });
    expect(autoMapColumns("standings", ["Final Standing", "Player Full Name", "Decklist URL"])).toMatchObject({
      placement: "Final Standing",
      player: "Player Full Name",
      decklist: "Decklist URL",
    });
  });

  it("maps each header to one field, the closest match first", () => {
    expect(autoMapColumns("decklists", ["Player", "Name", "Qty"])).toMatchObject({ player: "Player", card: "Name", quantity: "Qty" });
    expect(autoMapColumns("standings", ["Player ID", "Player"])).toMatchObject({ playerId: "Player ID", player: "Player" });
    const mapping = autoMapColumns("standings", ["Deck"]);
    expect(mapping).toMatchObject({ archetype: "Deck", decklist: null });
  });

  it("returns every field, unmapped as null", () => {
    for (const kind of CSV_KINDS) {
      const mapping = autoMapColumns(kind, []);
      expect(Object.keys(mapping)).toEqual(COLUMN_FIELDS[kind].map((f) => f.key));
      expect(Object.values(mapping).every((header) => header === null)).toBe(true);
    }
  });
});

describe("required fields", () => {
  it("lists required groups per kind", () => {
    expect(requiredFields("standings")).toEqual([["player"]]);
    expect(requiredFields("pairings")).toEqual([["round"], ["player1"], ["result", "winner"]]);
    expect(requiredFields("decklists")).toEqual([["player"], ["quantity"], ["card", "cardId"]]);
  });

  it("reports unsatisfied groups", () => {
    expect(missingRequiredFields("pairings", autoMapColumns("pairings", ["Round", "Player 1", "Player 2", "Winner"]))).toEqual([]);
    expect(missingRequiredFields("pairings", autoMapColumns("pairings", ["Round", "Player 1", "Player 2"]))).toEqual([["result", "winner"]]);
    expect(missingRequiredFields("decklists", autoMapColumns("decklists", ["Player", "Card ID"]))).toEqual([["quantity"]]);
    expect(describeFields("pairings", ["result", "winner"])).toBe("Result or Winner");
  });
});

describe("detectCsvKind", () => {
  it("recognizes each template", () => {
    expect(detectCsvKind(templateHeaders("standings-template.csv"))).toEqual({ kind: "standings", confidence: 1 });
    expect(detectCsvKind(templateHeaders("pairings-template.csv"))).toEqual({ kind: "pairings", confidence: 1 });
    expect(detectCsvKind(templateHeaders("decklists-template.csv"))).toEqual({ kind: "decklists", confidence: 1 });
  });

  it("recognizes common exports", () => {
    expect(detectCsvKind(["Rank", "Name", "Deck", "Points"]).kind).toBe("standings");
    expect(detectCsvKind(["Rd", "P1", "P2", "Score"]).kind).toBe("pairings");
    expect(detectCsvKind(["Pilot", "Qty", "Code"]).kind).toBe("decklists");
  });

  it("has low confidence for unrelated files", () => {
    expect(detectCsvKind(["Price", "Condition", "Seller"]).confidence).toBeLessThan(0.5);
    expect(detectCsvKind([]).confidence).toBe(0);
  });
});

describe("cell", () => {
  it("reads a mapped, trimmed value", () => {
    const mapping = { player: "Name", archetype: null };
    expect(cell({ Name: "  Kenji Morrow " }, mapping, "player")).toBe("Kenji Morrow");
    expect(cell({ Name: "Kenji Morrow" }, mapping, "archetype")).toBe("");
    expect(cell({}, mapping, "player")).toBe("");
  });

  it("reads only the row's own string values, never Object members", () => {
    const mapping = { player: "Name", section: "isPrototypeOf", archetype: "toString", country: "__proto__" };
    expect(cell({ Name: "Kenji" }, mapping, "section")).toBe("");
    expect(cell({ Name: "Kenji" }, mapping, "archetype")).toBe("");
    expect(cell({ Name: "Kenji" }, mapping, "country")).toBe("");
    expect(cell({ Name: "Kenji" }, mapping, "constructor")).toBe("");
    expect(cell(parseCsv("Name,isPrototypeOf\nKenji,Leader\n").rows[0]!, mapping, "section")).toBe("Leader");
  });
});
