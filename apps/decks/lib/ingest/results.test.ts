import { describe, expect, it } from "vitest";
import { isByeToken, parseMatchResult, parseRecord, parseRoundLabel, parseStage } from "./results";

describe("parseMatchResult", () => {
  it.each([
    ["2-1", { outcome: "p1", games: { p1: 2, p2: 1 } }],
    ["2-0", { outcome: "p1", games: { p1: 2, p2: 0 } }],
    ["1-2", { outcome: "p2", games: { p1: 1, p2: 2 } }],
    ["0-2", { outcome: "p2", games: { p1: 0, p2: 2 } }],
    ["1-1", { outcome: "draw", games: { p1: 1, p2: 1 } }],
    ["1-1-1", { outcome: "draw", games: { p1: 1, p2: 1 } }],
    ["2-0-1", { outcome: "p1", games: { p1: 2, p2: 0 } }],
    ["2–1", { outcome: "p1", games: { p1: 2, p2: 1 } }],
    ["2:1", { outcome: "p1", games: { p1: 2, p2: 1 } }],
    ["1-0", { outcome: "p1" }],
    ["0-1", { outcome: "p2" }],
    ["W", { outcome: "p1" }],
    ["l", { outcome: "p2" }],
    ["D", { outcome: "draw" }],
    ["win", { outcome: "p1" }],
    ["Loss", { outcome: "p2" }],
    ["draw", { outcome: "draw" }],
    ["Tie", { outcome: "draw" }],
    ["ID", { outcome: "draw", intentionalDraw: true }],
    ["I.D.", { outcome: "draw", intentionalDraw: true }],
    ["Intentional Draw", { outcome: "draw", intentionalDraw: true }],
    ["ID 0-0", { outcome: "draw", intentionalDraw: true }],
    ["BYE", { outcome: "bye" }],
    ["P1", { outcome: "p1" }],
    ["p2 wins", { outcome: "p2" }],
    ["Player 1", { outcome: "p1" }],
    ["W 2-1", { outcome: "p1", games: { p1: 2, p2: 1 } }],
    ["2-1 (W)", { outcome: "p1", games: { p1: 2, p2: 1 } }],
    ["L 2-1", { outcome: "p2", games: { p1: 1, p2: 2 } }],
    ["2-1 time", { outcome: "p1", games: { p1: 2, p2: 1 } }],
  ])("%s", (raw, expected) => {
    expect(parseMatchResult(raw)).toEqual(expected);
  });

  const names = { player1Name: "Kenji Morrow", player2Name: "Zoë Marchetti" };

  it("reads a winner name when the result is empty", () => {
    expect(parseMatchResult("", { ...names, winnerName: "Kenji Morrow" })).toEqual({ outcome: "p1" });
    expect(parseMatchResult(undefined, { ...names, winnerName: "zoe marchetti" })).toEqual({ outcome: "p2" });
    expect(parseMatchResult(null, { ...names, winnerName: "Draw" })).toEqual({ outcome: "draw" });
  });

  it("reads a player name in the result column", () => {
    expect(parseMatchResult("Zoë Marchetti", names)).toEqual({ outcome: "p2" });
  });

  it("reads a score that contradicts the winner as written from the winner's side", () => {
    expect(parseMatchResult("2-1", { ...names, winnerName: "Zoë Marchetti" })).toEqual({ outcome: "p2", games: { p1: 1, p2: 2 } });
    expect(parseMatchResult("2-1", { ...names, winnerName: "Kenji Morrow" })).toEqual({ outcome: "p1", games: { p1: 2, p2: 1 } });
  });

  it("returns null for unreadable results", () => {
    expect(parseMatchResult("")).toBeNull();
    expect(parseMatchResult("forfeit")).toBeNull();
    expect(parseMatchResult("", { ...names, winnerName: "Someone Else" })).toBeNull();
  });
});

describe("parseRecord", () => {
  it.each([
    ["5-1-1", { wins: 5, losses: 1, draws: 1 }],
    ["5/1/1", { wins: 5, losses: 1, draws: 1 }],
    ["5-1", { wins: 5, losses: 1, draws: 0 }],
    [" 4 - 2 ", { wins: 4, losses: 2, draws: 0 }],
    ["6-2-0 (18 pts)", { wins: 6, losses: 2, draws: 0 }],
    ["five-one", null],
    ["", null],
    [undefined, null],
  ])("%s", (raw, expected) => {
    expect(parseRecord(raw)).toEqual(expected);
  });
});

describe("parseRoundLabel", () => {
  it.each([
    ["3", { round: 3 }],
    ["R3", { round: 3 }],
    ["Round 3", { round: 3 }],
    ["rd. 12", { round: 12 }],
    ["Top 8", { cutSize: 8 }],
    ["T4", { cutSize: 4 }],
    ["Round of 16", { cutSize: 16 }],
    ["Quarterfinals", { cutSize: 8 }],
    ["Semi-finals", { cutSize: 4 }],
    ["Finals", { cutSize: 2 }],
    ["Grand Final", { cutSize: 2 }],
    ["0", null],
    ["Top 6", null],
    ["lunch", null],
  ])("%s", (raw, expected) => {
    expect(parseRoundLabel(raw)).toEqual(expected);
  });
});

describe("parseStage", () => {
  it.each([
    ["Swiss", "swiss"],
    ["swiss rounds", "swiss"],
    ["Top Cut", "top-cut"],
    ["top-cut", "top-cut"],
    ["Playoffs", "top-cut"],
    ["Single Elimination", "top-cut"],
    ["T8", "top-cut"],
    ["Finals", "top-cut"],
    ["", null],
    ["Day 2", null],
  ])("%s → %s", (raw, expected) => {
    expect(parseStage(raw)).toBe(expected);
  });
});

describe("isByeToken", () => {
  it("recognizes empty opponents and bye markers", () => {
    for (const token of ["", "  ", "BYE", "(bye)", "-", "—", "N/A", "none"]) expect(isByeToken(token)).toBe(true);
    for (const token of ["Kenji Morrow", "Byers"]) expect(isByeToken(token)).toBe(false);
    expect(isByeToken(null)).toBe(true);
  });
});
