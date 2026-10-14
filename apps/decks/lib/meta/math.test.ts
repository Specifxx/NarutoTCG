import { describe, expect, it } from "vitest";
import { clamp01, linearScale, safeDivide, wilsonInterval } from "./math";

describe("wilsonInterval", () => {
  it("matches known values", () => {
    const [lo, hi] = wilsonInterval(8, 10);
    expect(lo).toBeCloseTo(0.4902, 3);
    expect(hi).toBeCloseTo(0.9433, 3);
    const [lo2, hi2] = wilsonInterval(50, 100);
    expect(lo2).toBeCloseTo(0.4038, 3);
    expect(hi2).toBeCloseTo(0.5962, 3);
  });

  it("stays inside [0, 1] at the extremes and contains the point estimate", () => {
    const [lo0, hi0] = wilsonInterval(0, 10);
    expect(lo0).toBeCloseTo(0, 10);
    expect(hi0).toBeCloseTo(0.2775, 3);
    const [lo1, hi1] = wilsonInterval(10, 10);
    expect(lo1).toBeCloseTo(0.7225, 3);
    expect(hi1).toBeCloseTo(1, 10);
    const [lo, hi] = wilsonInterval(6.5, 10);
    expect(lo).toBeLessThan(0.65);
    expect(hi).toBeGreaterThan(0.65);
  });

  it("returns exact 0 and 1 endpoints at 0 and n successes", () => {
    for (let n = 1; n <= 60; n++) {
      expect(wilsonInterval(0, n)[0]).toBe(0);
      expect(wilsonInterval(n, n)[1]).toBe(1);
    }
  });

  it("accepts fractional successes and narrows with more games", () => {
    const small = wilsonInterval(3.5, 5);
    const large = wilsonInterval(70, 100);
    expect(large[1] - large[0]).toBeLessThan(small[1] - small[0]);
  });

  it("returns the uninformative interval without games", () => {
    expect(wilsonInterval(0, 0)).toEqual([0, 1]);
  });
});

describe("clamp01 / linearScale / safeDivide", () => {
  it("clamps and maps NaN to 0", () => {
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(1.4)).toBe(1);
    expect(clamp01(0.3)).toBe(0.3);
    expect(clamp01(Number.NaN)).toBe(0);
  });

  it("scales linearly and clamps", () => {
    expect(linearScale(0.5, [0.4, 0.6])).toBeCloseTo(0.5, 10);
    expect(linearScale(0.3, [0.4, 0.6])).toBe(0);
    expect(linearScale(0.9, [0.4, 0.6])).toBe(1);
    expect(linearScale(1.5, [0, 2])).toBeCloseTo(0.75, 10);
    expect(linearScale(5, [5, 5])).toBe(1);
    expect(linearScale(4, [5, 5])).toBe(0);
  });

  it("divides safely", () => {
    expect(safeDivide(3, 4)).toBe(0.75);
    expect(safeDivide(3, 0)).toBe(0);
  });
});
