import { describe, expect, it } from "vitest";
import { addDays, emptyPoint } from "@/lib/market/analytics";
import type { PricePoint } from "@/lib/market/types";
import { dayTicks, latestMarket, rangeChange, rangePoints, seriesWithData, valueDomain, valueTicks } from "./history";

const END = "2026-10-14";

/** 90 daily points ending at END; `priced(i)` decides whether day i (0 = oldest) has prices. */
function history(priced: (i: number) => boolean = () => true): PricePoint[] {
  return Array.from({ length: 90 }, (_, i) => {
    const date = addDays(END, i - 89);
    if (!priced(i)) return emptyPoint(date);
    return { date, market: 10 + i, tcgplayer: 10 + i, ebay: i % 2 ? null : 11 + i, cardmarket: null };
  });
}

describe("rangePoints", () => {
  it("includes the window's base day so the line spans the full change interval", () => {
    const points = rangePoints(history(), "7d");
    expect(points).toHaveLength(8);
    expect(points[0]?.date).toBe(addDays(END, -7));
    expect(points.at(-1)?.date).toBe(END);
    expect(rangePoints(history(), "30d")).toHaveLength(31);
  });

  it("caps at the available history", () => {
    expect(rangePoints(history(), "90d")).toHaveLength(90);
  });

  it("drops leading days without any price (before release)", () => {
    const points = rangePoints(
      history((i) => i >= 49),
      "90d",
    );
    expect(points).toHaveLength(41);
    expect(points[0]?.market).toBe(59);
  });

  it("is empty when the range has no prices", () => {
    expect(
      rangePoints(
        history(() => false),
        "30d",
      ),
    ).toEqual([]);
    expect(rangePoints([], "7d")).toEqual([]);
  });
});

describe("rangeChange", () => {
  const canonical = { from: 1, to: 2, abs: 1, pct: 100 };

  it("prefers the repository's change so the chart agrees with the stat tiles", () => {
    expect(rangeChange(rangePoints(history(), "7d"), canonical)).toEqual({ change: canonical, since: null });
  });

  it("falls back to first-to-last market price inside the range, flagged with its start day", () => {
    const points = rangePoints(
      history((i) => i >= 49),
      "90d",
    );
    const { change, since } = rangeChange(points, null);
    expect(since).toBe(addDays(END, -40));
    expect(change).toMatchObject({ from: 59, to: 99, abs: 40 });
    expect(change?.pct).toBeCloseTo((40 / 59) * 100, 10);
  });

  it("is null with fewer than two market prices", () => {
    const one = rangePoints(
      history((i) => i === 89),
      "7d",
    );
    expect(rangeChange(one, null)).toEqual({ change: null, since: null });
  });
});

describe("dayTicks", () => {
  it("returns at most maxTicks evenly spaced days ending on the latest", () => {
    for (const maxTicks of [4, 6]) {
      for (const window of ["7d", "30d", "90d"] as const) {
        const points = rangePoints(history(), window);
        const ticks = dayTicks(points, maxTicks);
        expect(ticks.length).toBeLessThanOrEqual(maxTicks);
        expect(ticks.at(-1)).toBe(END);
        const index = (day: string | undefined) => points.findIndex((p) => p.date === day);
        const gaps = ticks.slice(1).map((t, i) => index(t) - index(ticks[i]));
        expect(new Set(gaps).size).toBeLessThanOrEqual(1);
      }
    }
  });

  it("handles empty and single-point ranges", () => {
    expect(dayTicks([], 6)).toEqual([]);
    expect(dayTicks([emptyPoint(END)], 6)).toEqual([END]);
  });
});

describe("valueDomain", () => {
  it("pads the visible series' extent by 5% each side", () => {
    const points = rangePoints(history(), "7d");
    const [lo, hi] = valueDomain(points, ["market", "tcgplayer"]) ?? [];
    // Days 82..89 hold 92..99: a span of 7, so 0.35 of padding.
    expect(lo).toBeCloseTo(91.65, 10);
    expect(hi).toBeCloseTo(99.35, 10);
  });

  it("ignores hidden series and never goes below zero", () => {
    const points = rangePoints(history(), "7d");
    expect(valueDomain(points, ["cardmarket"])).toBeNull();
    const flat = [{ ...emptyPoint(END), market: 0.2 }];
    expect(valueDomain(flat, ["market"])).toEqual([0.19, 0.21000000000000002]);
    expect(
      valueDomain(
        [
          { ...emptyPoint(END), market: 0.01 },
          { ...emptyPoint(END), market: 1 },
        ],
        ["market"],
      )?.[0],
    ).toBe(0);
  });
});

describe("valueTicks", () => {
  it("picks round steps inside the domain", () => {
    expect(valueTicks([370.71, 1012.1])).toEqual([400, 600, 800, 1000]);
    expect(valueTicks([362.9, 457.59])).toEqual([380, 400, 420, 440]);
    expect(valueTicks([0.126, 0.214])).toEqual([0.14, 0.16, 0.18, 0.2]);
  });

  it("keeps at least three ticks where a coarser step would leave two", () => {
    expect(valueTicks([362.36, 465.1])).toEqual([380, 400, 420, 440, 460]);
  });

  it("never steps finer than a cent", () => {
    expect(valueTicks([0.19, 0.21])).toEqual([0.19, 0.2, 0.21]);
  });
});

describe("series helpers", () => {
  it("lists only series with at least one price in range", () => {
    expect([...seriesWithData(rangePoints(history(), "7d"))]).toEqual(["market", "tcgplayer", "ebay"]);
  });

  it("finds the latest market price", () => {
    expect(latestMarket(history())).toEqual({ date: END, price: 99 });
    expect(latestMarket(history(() => false))).toBeNull();
  });
});
