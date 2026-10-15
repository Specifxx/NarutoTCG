import { describe, expect, it } from "vitest";
import { MAX_CELL_LENGTH, parseCsv } from "./csv";

const BOM = String.fromCharCode(0xfeff);

describe("parseCsv", () => {
  it.each([
    [",", "Placement,Player,Deck\n1,Kenji Morrow,Sage Naruto\n2,Priya Castellane,Uchiha Avenger\n"],
    [";", "Placement;Player;Deck\n1;Kenji Morrow;Sage Naruto\n2;Priya Castellane;Uchiha Avenger\n"],
    ["\t", "Placement\tPlayer\tDeck\n1\tKenji Morrow\tSage Naruto\n2\tPriya Castellane\tUchiha Avenger\n"],
  ])("detects the %j delimiter", (delimiter, text) => {
    const table = parseCsv(text);
    expect(table.delimiter).toBe(delimiter);
    expect(table.headers).toEqual(["Placement", "Player", "Deck"]);
    expect(table.rows).toEqual([
      { Placement: "1", Player: "Kenji Morrow", Deck: "Sage Naruto" },
      { Placement: "2", Player: "Priya Castellane", Deck: "Uchiha Avenger" },
    ]);
    expect(table.issues).toEqual([]);
  });

  it("strips a BOM, trims headers and values and skips blank lines", () => {
    const table = parseCsv(`${BOM} Rank ; Name \r\n\r\n 1 ;  Zoë Marchetti \r\n ; \r\n2;Bram Ohlsson\r\n\r\n`);
    expect(table.headers).toEqual(["Rank", "Name"]);
    expect(table.rows).toEqual([
      { Rank: "1", Name: "Zoë Marchetti" },
      { Rank: "2", Name: "Bram Ohlsson" },
    ]);
  });

  it("keeps quoted delimiters, quotes and line breaks inside cells", () => {
    const table = parseCsv('Player,Decklist\nKenji Morrow,"Leader: Pain; 4 Konan, 4 Asura Path"\n"Odette ""Odie"" Nwosu","line one\nline two"\n');
    expect(table.delimiter).toBe(",");
    expect(table.rows).toEqual([
      { Player: "Kenji Morrow", Decklist: "Leader: Pain; 4 Konan, 4 Asura Path" },
      { Player: 'Odette "Odie" Nwosu', Decklist: "line one\nline two" },
    ]);
  });

  it("does not mistake pipe-separated decklist cells for a delimiter", () => {
    const table = parseCsv('Player,Decklist\nKenji Morrow,"1 Pain | 4 Konan | 4 Asura Path"\nBram Ohlsson,"1 Itachi | 4 Zetsu"\n');
    expect(table.delimiter).toBe(",");
    expect(table.rows[1]).toEqual({ Player: "Bram Ohlsson", Decklist: "1 Itachi | 4 Zetsu" });
  });

  it("keeps ragged rows with a warning naming the data row", () => {
    const table = parseCsv("Round,Player 1,Player 2,Result\n1,Kenji Morrow,Bram Ohlsson,2-1\n1,Zoë Marchetti\n1,A,B,2-0,extra\n");
    expect(table.rows[1]).toEqual({ Round: "1", "Player 1": "Zoë Marchetti", "Player 2": "", Result: "" });
    expect(table.rows[2]).toEqual({ Round: "1", "Player 1": "A", "Player 2": "B", Result: "2-0" });
    expect(table.issues.map((i) => [i.code, i.row])).toEqual([
      ["csv-row-shape", 2],
      ["csv-row-shape", 3],
    ]);
  });

  it("reads a single-column file without a delimiter warning", () => {
    const table = parseCsv("Player\nKenji Morrow\nBram Ohlsson\n");
    expect(table.rows).toEqual([{ Player: "Kenji Morrow" }, { Player: "Bram Ohlsson" }]);
    expect(table.issues).toEqual([]);
  });

  it("drops headerless trailing columns", () => {
    const table = parseCsv("Player,Deck,\nKenji Morrow,Sage Naruto,\n");
    expect(table.headers).toEqual(["Player", "Deck"]);
    expect(table.rows).toEqual([{ Player: "Kenji Morrow", Deck: "Sage Naruto" }]);
    expect(parseCsv("Player,,,\nKenji Morrow,,,\n").headers).toEqual(["Player"]);
  });

  it("numbers repeated headers with a warning", () => {
    const table = parseCsv("Round,Player,Points,Player,Points\n1,Kenji Morrow,3,Bram Ohlsson,0\n");
    expect(table.headers).toEqual(["Round", "Player", "Points", "Player (2)", "Points (2)"]);
    expect(table.rows).toEqual([{ Round: "1", Player: "Kenji Morrow", Points: "3", "Player (2)": "Bram Ohlsson", "Points (2)": "0" }]);
    expect(table.issues).toEqual([expect.objectContaining({ severity: "warning", code: "duplicate-column" })]);
    expect(table.issues[0]!.message).toContain('"Player", "Points"');
  });

  it("warns about empty files", () => {
    expect(parseCsv("").issues.map((i) => i.code)).toEqual(["empty-file"]);
    expect(parseCsv("Player,Deck\n").issues.map((i) => i.code)).toEqual(["empty-file"]);
  });

  it.each(["__proto__", "constructor", "toString", "isPrototypeOf", "hasOwnProperty", "valueOf"])(
    "reads a %s column as an ordinary string column, short rows included",
    (header) => {
      const table = parseCsv(`Player,${header}\nAlice,foo\nBob\n`);
      expect(table.headers).toEqual(["Player", header]);
      expect(table.rows.map((row) => Object.hasOwn(row, header))).toEqual([true, true]);
      expect(table.rows.map((row) => row[header])).toEqual(["foo", ""]);
      expect(table.rows.every((row) => Object.getPrototypeOf(row) === Object.prototype)).toBe(true);
    },
  );

  it("empties cells longer than the limit with an error, listing a few", () => {
    const long = "x".repeat(MAX_CELL_LENGTH + 1);
    const table = parseCsv(`Player,Deck\nAlice,${long}\nBob,Pain\n`);
    expect(table.rows).toEqual([
      { Player: "Alice", Deck: "" },
      { Player: "Bob", Deck: "Pain" },
    ]);
    expect(table.issues).toEqual([expect.objectContaining({ severity: "error", code: "cell-too-long", row: 1, field: "Deck" })]);
    expect(parseCsv(`Player,Deck\nAlice,${"x".repeat(MAX_CELL_LENGTH)}\n`).issues).toEqual([]);

    const many = parseCsv(`Player\n${Array.from({ length: 8 }, () => long).join("\n")}\n`);
    expect(many.issues.map((i) => i.code)).toEqual(Array(6).fill("cell-too-long"));
    expect(many.issues.at(-1)!.message).toMatch(/^3 more cells/);
  });

  it("removes control characters from headers and cells with a warning, keeping line breaks", () => {
    const table = parseCsv('Pla\u001byer,Deck\n"Ken\u001b[2Jji\u202e","line\none"\n');
    expect(table.headers).toEqual(["Player", "Deck"]);
    expect(table.rows).toEqual([{ Player: "Ken[2Jji", Deck: "line\none" }]);
    expect(table.issues.map((i) => [i.severity, i.code])).toEqual([["warning", "control-characters-removed"]]);
  });
});
