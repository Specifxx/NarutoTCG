import type { MatchRecord, Tournament } from "@naruto-tcg/types";
import { describe, expect, it } from "vitest";
import { templateTournament } from "./__fixtures__/files";
import { isPermutation, validateTournament } from "./validate";

const codes = (t: Tournament) => validateTournament(t).map((issue) => `${issue.severity}:${issue.code}`);

/** The template with one match replaced. */
function withMatch(index: number, patch: Partial<MatchRecord>): Tournament {
  const t = templateTournament();
  return { ...t, matches: t.matches.map((m, i) => (i === index ? { ...m, ...patch } : m)) };
}

const t0 = templateTournament();
const firstSwiss = t0.matches.findIndex((m) => m.stage === "swiss" && m.outcome === "p1");
const byeIndex = t0.matches.findIndex((m) => m.outcome === "bye");
const finalIndex = t0.matches.findIndex((m) => m.round === 5);

describe("validateTournament", () => {
  it("accepts the canonical template", () => {
    expect(validateTournament(templateTournament())).toEqual([]);
  });

  it("checks event fields", () => {
    const t = templateTournament();
    expect(codes({ ...t, id: "local--bad" })).toEqual(["error:invalid-id"]);
    expect(codes({ ...t, date: "2026-02-30" })).toEqual(["error:invalid-date"]);
    expect(codes({ ...t, name: " " })).toEqual(["error:missing-name"]);
    const invalid = { ...t, matches: [], tier: "worlds" as Tournament["tier"], bestOf: 2 as Tournament["bestOf"] };
    expect(codes(invalid)).toEqual(["error:invalid-tier", "error:invalid-best-of", "info:no-pairings"]);
  });

  it("checks player ids, archetypes and placements", () => {
    const t = templateTournament();
    const players = t.players.map((p, i) => (i === 1 ? { ...p, id: t.players[0]!.id } : p));
    expect(codes({ ...t, players })).toContain("error:duplicate-player-id");
    expect(codes({ ...t, players: t.players.map((p, i) => (i === 0 ? { ...p, id: "Kenji--Morrow" } : p)) })).toContain("error:invalid-id");
    expect(codes({ ...t, players: t.players.map((p, i) => (i === 0 ? { ...p, archetypeId: "pain" } : p)) })).toEqual(["error:unknown-archetype"]);
    const placements = validateTournament({ ...t, players: t.players.map((p, i) => (i === 7 ? { ...p, placement: 3 } : p)) });
    expect(placements.map((i) => i.code)).toEqual(["invalid-placements"]);
    expect(placements[0]!.message).toContain("repeated: 3; missing: 8");
    expect(codes({ ...t, players: [], matches: [] })).toEqual(["error:no-players", "info:no-pairings"]);
  });

  it("flags illegal decklists as warnings", () => {
    const t = templateTournament();
    const list = t.players[0]!.decklist!;
    const players = t.players.map((p, i) => (i === 0 ? { ...p, decklist: { ...list, cards: list.cards.slice(1) } } : p));
    const issues = validateTournament({ ...t, players });
    expect(issues.map((i) => i.code)).toEqual(["decklist-illegal"]);
    expect(issues[0]).toMatchObject({ severity: "warning", field: "players[0].decklist" });
    expect(issues[0]!.message).toContain("exactly 50 required");
    expect(codes({ ...t, date: "2026-06-01" })).toEqual(expect.arrayContaining(["warning:decklist-illegal"]));
  });

  it("checks match references, pairing uniqueness and byes", () => {
    expect(codes(withMatch(firstSwiss, { player2Id: "ghost" }))).toEqual(["error:unknown-player"]);
    expect(codes(withMatch(firstSwiss, { player2Id: t0.matches[firstSwiss]!.player1Id }))).toEqual(["error:self-pairing", "error:player-paired-twice"]);
    expect(codes(withMatch(firstSwiss + 1, { player1Id: t0.matches[firstSwiss]!.player1Id }))).toEqual(["error:player-paired-twice"]);
    expect(codes(withMatch(byeIndex, { outcome: "p1" }))).toEqual(["error:invalid-bye"]);
    expect(codes(withMatch(firstSwiss, { outcome: "bye", games: undefined }))).toEqual(["error:invalid-bye"]);
  });

  it("checks the top cut", () => {
    expect(codes(withMatch(finalIndex, { outcome: "draw", games: { p1: 1, p2: 1 } }))).toEqual(["error:top-cut-draw"]);
    const t = templateTournament();
    const partial = validateTournament({ ...t, matches: t.matches.filter((_, i) => i !== finalIndex) });
    expect(partial.map((i) => i.code)).toEqual(["partial-top-cut"]);
    expect(partial[0]!.message).toContain("needs 3 top cut matches but 2 were recorded");
    expect(codes({ ...t, topCutSize: 2 })).toEqual(["warning:top-cut-size-mismatch"]);
    expect(codes({ ...t, topCutSize: 16 })).toEqual(["warning:partial-top-cut", "warning:top-cut-too-large"]);
    expect(codes({ ...t, swissRounds: 4 })).toEqual(["warning:stage-order", "warning:stage-order"]);
  });

  it("checks the Swiss round count", () => {
    expect(codes({ ...templateTournament(), swissRounds: 2 })).toEqual(["warning:swiss-rounds-mismatch"]);
  });

  it("checks game scores against outcomes and the match format", () => {
    expect(codes(withMatch(firstSwiss, { games: { p1: 0, p2: 2 } }))).toEqual(["warning:games-mismatch"]);
    expect(codes(withMatch(firstSwiss, { games: { p1: 3, p2: 0 } }))).toEqual(["warning:games-exceed-best-of"]);
    expect(codes({ ...withMatch(firstSwiss, { games: { p1: 2, p2: 0 } }), bestOf: 1 })).toContain("warning:games-exceed-best-of");
    expect(codes(withMatch(firstSwiss, { intentionalDraw: true }))).toEqual(["warning:intentional-draw-outcome"]);
  });

  it("notes events without pairings", () => {
    const issues = validateTournament({ ...templateTournament(), matches: [], topCutSize: 0 });
    expect(issues).toEqual([
      {
        severity: "info",
        code: "no-pairings",
        message: "No pairings: matchup and win-rate stats will not include this event.",
        source: "tournament",
        field: "matches",
      },
    ]);
  });
});

describe("isPermutation", () => {
  it("accepts exactly 1..N", () => {
    expect(isPermutation([3, 1, 2])).toBe(true);
    expect(isPermutation([])).toBe(true);
    expect(isPermutation([1, 1, 2])).toBe(false);
    expect(isPermutation([0, 1, 2])).toBe(false);
    expect(isPermutation([1, 2, 4])).toBe(false);
  });
});
