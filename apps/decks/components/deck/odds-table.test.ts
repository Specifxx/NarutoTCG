import { describe, expect, it } from "vitest";
import type { ProbabilityRow } from "@/lib/probability/conditions";
import { DEFAULT_ODDS_SORT, sortOddsRows, toggleOddsSort, turnKey } from "./odds-table";

const row = (cardId: string, copies: number, pOpening: number, pByTurn: number[]): ProbabilityRow => ({ cardId, copies, pOpening, pByTurn });

const ROWS = [
  row("b", 2, 0.2, [0.25, 0.3, 0.35, 0.4, 0.45]),
  row("a", 4, 0.35, [0.4, 0.45, 0.5, 0.55, 0.6]),
  row("c", 4, 0.35, [0.4, 0.45, 0.5, 0.55, 0.6]),
  row("d", 1, 0.1, [0.12, 0.14, 0.9, 0.18, 0.2]),
];
const names: Record<string, string> = { a: "Zabuza", b: "Akamaru", c: "Chidori", d: "Haku" };
const nameOf = (id: string) => names[id] ?? id;
const ids = (rows: ProbabilityRow[]) => rows.map((r) => r.cardId);

describe("sortOddsRows", () => {
  it("sorts numbers with name tie-breaks", () => {
    expect(ids(sortOddsRows(ROWS, DEFAULT_ODDS_SORT, nameOf))).toEqual(["c", "a", "b", "d"]);
    expect(ids(sortOddsRows(ROWS, { key: "opening", direction: "ascending" }, nameOf))).toEqual(["d", "b", "c", "a"]);
    expect(ids(sortOddsRows(ROWS, { key: "copies", direction: "descending" }, nameOf))).toEqual(["c", "a", "b", "d"]);
  });

  it("sorts by a turn column", () => {
    expect(ids(sortOddsRows(ROWS, { key: turnKey(3), direction: "descending" }, nameOf))[0]).toBe("d");
  });

  it("sorts names alphabetically", () => {
    expect(ids(sortOddsRows(ROWS, { key: "card", direction: "ascending" }, nameOf))).toEqual(["b", "c", "d", "a"]);
    expect(ids(sortOddsRows(ROWS, { key: "card", direction: "descending" }, nameOf))).toEqual(["a", "d", "c", "b"]);
  });

  it("does not mutate its input", () => {
    const copy = [...ROWS];
    sortOddsRows(ROWS, { key: "card", direction: "ascending" }, nameOf);
    expect(ROWS).toEqual(copy);
  });
});

describe("toggleOddsSort", () => {
  it("flips the active column and starts new columns in their natural direction", () => {
    expect(toggleOddsSort(DEFAULT_ODDS_SORT, "opening")).toEqual({ key: "opening", direction: "ascending" });
    expect(toggleOddsSort(DEFAULT_ODDS_SORT, "card")).toEqual({ key: "card", direction: "ascending" });
    expect(toggleOddsSort(DEFAULT_ODDS_SORT, "t2")).toEqual({ key: "t2", direction: "descending" });
  });

  it("maps turns to column keys", () => {
    expect(turnKey(1)).toBe("t1");
    expect(turnKey(5)).toBe("t5");
  });
});
