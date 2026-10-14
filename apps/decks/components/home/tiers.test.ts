import { describe, expect, it } from "vitest";
import { getSeedSnapshot } from "@/lib/data/meta";
import { groupByTier } from "@/lib/meta/stats";
import { stat } from "./home-fixtures";
import { tierHighlights, trendDirection, TREND_NEUTRAL } from "./tiers";

describe("trendDirection", () => {
  it("treats changes within the neutral band as flat", () => {
    expect(trendDirection(0)).toBe("flat");
    expect(trendDirection(TREND_NEUTRAL)).toBe("flat");
    expect(trendDirection(-TREND_NEUTRAL)).toBe("flat");
    expect(trendDirection(0.02)).toBe("up");
    expect(trendDirection(-0.02)).toBe("down");
    expect(trendDirection(0.02, 0.05)).toBe("flat");
  });
});

describe("tierHighlights", () => {
  const tiers = groupByTier([
    stat("s1", "S", { adjustedWinRate: 0.56 }),
    stat("s2", "S"),
    stat("a1", "A", { metaShare: 0.2 }),
    stat("b1", "B"),
    stat("rogue", "unranked"),
  ]);
  const trends = {
    s1: { recentShare: 0.15, previousShare: 0.1, delta: 0.05 },
    a1: { recentShare: 0.1, previousShare: 0.102, delta: -0.002 },
  };

  it("lists S then A archetypes in score order with their trend", () => {
    const rows = tierHighlights(tiers, trends);
    expect(rows.map((r) => r.archetypeId)).toEqual(["s1", "s2", "a1"]);
    expect(rows[0]).toMatchObject({ tier: "S", adjustedWinRate: 0.56, trend: { delta: 0.05, direction: "up" } });
    expect(rows[1]!.trend).toBeNull();
    expect(rows[2]).toMatchObject({ metaShare: 0.2, trend: { direction: "flat" } });
  });

  it("can include other tiers and ignores inherited keys", () => {
    expect(tierHighlights(tiers, {}, ["B"]).map((r) => r.archetypeId)).toEqual(["b1"]);
    const proto = groupByTier([stat("constructor", "S")]);
    expect(tierHighlights(proto, {})[0]!.trend).toBeNull();
  });

  it("covers every S and A archetype of the seed snapshot", () => {
    const snapshot = getSeedSnapshot();
    const rows = tierHighlights(snapshot.tiers, snapshot.trends);
    expect(rows.length).toBe(snapshot.tiers.S.length + snapshot.tiers.A.length);
    expect(rows.every((r) => r.tier === "S" || r.tier === "A")).toBe(true);
  });
});
