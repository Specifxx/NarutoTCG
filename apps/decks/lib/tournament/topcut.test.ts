import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/random";
import { bracketSeedOrder, runTopCut, type TopCutResolver } from "./topcut";

const seedsOf = (size: number) => Array.from({ length: size }, (_, i) => `s${i + 1}`);
const seedNumber = (id: string) => Number(id.slice(1));

describe("bracketSeedOrder", () => {
  it("matches the standard 4, 8 and 16 brackets", () => {
    expect(bracketSeedOrder(2)).toEqual([[1, 2]]);
    expect(bracketSeedOrder(4)).toEqual([
      [1, 4],
      [2, 3],
    ]);
    expect(bracketSeedOrder(8)).toEqual([
      [1, 8],
      [4, 5],
      [2, 7],
      [3, 6],
    ]);
    expect(bracketSeedOrder(16)).toEqual([
      [1, 16],
      [8, 9],
      [4, 13],
      [5, 12],
      [2, 15],
      [7, 10],
      [3, 14],
      [6, 11],
    ]);
  });

  for (const size of [4, 8, 16, 32]) {
    it(`size ${size}: every seed once, pairs sum to ${size + 1}, top seeds spread across sections`, () => {
      const pairs = bracketSeedOrder(size);
      expect(pairs).toHaveLength(size / 2);
      const slots = pairs.flat();
      expect(slots.slice().sort((a, b) => a - b)).toEqual(Array.from({ length: size }, (_, i) => i + 1));
      for (const [a, b] of pairs) expect(a + b).toBe(size + 1);
      // The top k seeds land in k different sections of size/k slots (k = 2, 4, …).
      for (let k = 2; k <= size / 2; k *= 2) {
        const sections = new Set(slots.flatMap((seed, slot) => (seed <= k ? [Math.floor(slot / (size / k))] : [])));
        expect(sections.size).toBe(k);
      }
    });
  }

  it("rejects sizes that are not powers of two", () => {
    for (const size of [0, 1, 3, 6, 12]) expect(() => bracketSeedOrder(size)).toThrow();
  });
});

describe("runTopCut", () => {
  const favourite: TopCutResolver = () => ({ outcome: "p1", games: { p1: 2, p2: 0 } });

  it("plays a full bracket with the better seed always as player1", () => {
    const matches = runTopCut({ seeds: seedsOf(8), swissRounds: 7, resolve: favourite });
    expect(matches).toHaveLength(7);
    expect(matches.map((x) => x.round)).toEqual([8, 8, 8, 8, 9, 9, 10]);
    expect(matches.map((x) => x.table)).toEqual([1, 2, 3, 4, 1, 2, 1]);
    expect(matches.every((x) => x.stage === "top-cut" && x.outcome === "p1")).toBe(true);
    expect(matches.slice(0, 4).map((x) => [x.player1Id, x.player2Id])).toEqual([
      ["s1", "s8"],
      ["s4", "s5"],
      ["s2", "s7"],
      ["s3", "s6"],
    ]);
    expect(matches.at(-1)).toMatchObject({ player1Id: "s1", player2Id: "s2", games: { p1: 2, p2: 0 } });
  });

  it("keeps the better seed as player1 after upsets", () => {
    const underdog: TopCutResolver = () => ({ outcome: "p2" });
    const matches = runTopCut({ seeds: seedsOf(8), swissRounds: 5, resolve: underdog });
    for (const match of matches) expect(seedNumber(match.player1Id)).toBeLessThan(seedNumber(match.player2Id!));
    expect(matches.at(-1)).toMatchObject({ round: 8, player1Id: "s7", player2Id: "s8", outcome: "p2" });
    expect(matches.at(-1)!.games).toBeUndefined();
  });

  for (const size of [4, 8, 16, 32]) {
    it(`size ${size}: seeds 1 and 2 can only meet in the final`, () => {
      const finalRound = 3 + Math.log2(size);
      let meetings = 0;
      for (let s = 0; s < 50; s++) {
        const rng = createRng(`topcut-${size}-${s}`);
        const matches = runTopCut({
          seeds: seedsOf(size),
          swissRounds: 3,
          resolve: (p1, p2) => ({ outcome: (p1 === "s1" || p1 === "s2") && rng() < 0.9 ? "p1" : rng() < 0.5 ? "p1" : "p2" }),
        });
        expect(matches).toHaveLength(size - 1);
        expect(matches.every((x) => x.outcome === "p1" || x.outcome === "p2")).toBe(true);
        const meeting = matches.find((x) => x.player1Id === "s1" && x.player2Id === "s2");
        if (meeting) {
          meetings++;
          expect(meeting.round).toBe(finalRound);
        }
      }
      expect(meetings).toBeGreaterThan(0);
    });
  }
});
