import { describe, expect, it } from "vitest";
import { CHART } from "@/components/charts/chart-theme";
import { blendHex } from "@/components/meta/derive";
import { winRateChipColors } from "@/components/deck/matchup-verdict";
import {
  DIVERGING_SATURATION,
  DIVERGING_STEPS,
  VERDICT_MARGIN,
  contrastRatio,
  divergingFill,
  divergingStep,
  divergingStepFill,
  inkOn,
  winRateTone,
} from "./colors";

/** WCAG AA for normal-size text (cell and chip labels are 10–14px). */
const AA = 4.5;

const EVEN_GRAY = divergingStepFill(0);
const STEPS = Array.from({ length: DIVERGING_STEPS * 2 + 1 }, (_, i) => i - DIVERGING_STEPS);
/** The /meta matrix dims low-sample cells by 0.55 toward the surface; the deck page's chips by 0.5. */
const LOW_SAMPLE_BLENDS = [0.55, 0.5];

describe("contrastRatio", () => {
  it("matches the WCAG formula", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#3977c2", "#07070b")).toBeCloseTo(4.397, 2);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
    expect(contrastRatio("nope", "#ffffff")).toBeNaN();
  });
});

describe("inkOn", () => {
  it("picks whichever ink contrasts more", () => {
    expect(inkOn("#000000")).toBe("#ececf3");
    expect(inkOn("#ffffff")).toBe("#07070b");
    // Between the old fixed threshold (L = 0.22) and the crossover (L ≈ 0.166): dark ink wins now.
    expect(inkOn("#c35e5d")).toBe("#07070b");
  });

  it("falls back to the light ink for anything that is not a hex color", () => {
    expect(inkOn("red")).toBe("#ececf3");
  });
});

describe("divergingFill contrast", () => {
  it.each(STEPS)("step %i reaches 4.5:1 with its ink", (step) => {
    const fill = divergingStepFill(step);
    expect(contrastRatio(fill, inkOn(fill))).toBeGreaterThanOrEqual(AA);
  });

  it.each(STEPS)("step %i stays at 4.5:1 when dimmed for a low sample", (step) => {
    for (const amount of LOW_SAMPLE_BLENDS) {
      const fill = blendHex(divergingStepFill(step), amount, CHART.surface);
      expect(contrastRatio(fill, inkOn(fill))).toBeGreaterThanOrEqual(AA);
    }
  });

  it("covers every fill a win rate can produce, chips included", () => {
    for (let i = 0; i <= 1000; i++) {
      const winRate = i / 1000;
      const fill = divergingFill(winRate);
      expect(contrastRatio(fill, inkOn(fill))).toBeGreaterThanOrEqual(AA);
      for (const lowSample of [false, true]) {
        const chip = winRateChipColors(winRate, lowSample);
        expect(contrastRatio(chip.background, chip.color)).toBeGreaterThanOrEqual(AA);
      }
    }
  });

  it("keeps each arm's steps distinct and ordered from gray outwards", () => {
    const fills = STEPS.map(divergingStepFill);
    expect(new Set(fills).size).toBe(fills.length);
    const luminanceRank = (step: number) => contrastRatio(divergingStepFill(step), "#000000");
    for (let s = 1; s < DIVERGING_STEPS; s++) {
      expect(luminanceRank(s + 1)).toBeGreaterThan(luminanceRank(s));
      expect(luminanceRank(-(s + 1))).toBeGreaterThan(luminanceRank(-s));
    }
  });
});

describe("divergingFill bands agree with the verdict", () => {
  it("is gray exactly when the verdict is Even (or there is no data)", () => {
    for (let i = 0; i <= 10000; i++) {
      const winRate = i / 10000;
      const tone = winRateTone(winRate);
      const fill = divergingFill(winRate);
      if (tone === "even") expect(fill).toBe(EVEN_GRAY);
      else expect(fill).not.toBe(EVEN_GRAY);
      expect(Math.sign(divergingStep(winRate))).toBe(tone === "favored" ? 1 : tone === "unfavored" ? -1 : 0);
    }
    expect(divergingFill(null)).toBe(EVEN_GRAY);
    expect(divergingFill(Number.NaN)).toBe(EVEN_GRAY);
  });

  it("starts tinting at the 53% / 47% thresholds", () => {
    expect(winRateTone(0.53)).toBe("favored");
    expect(winRateTone(0.47)).toBe("unfavored");
    expect(divergingStep(0.53)).toBe(1);
    expect(divergingStep(0.47)).toBe(-1);
    expect(divergingStep(0.5299)).toBe(0);
    expect(divergingStep(0.4701)).toBe(0);
    expect(divergingFill(0.5301)).toBe(divergingStepFill(1));
    expect(divergingFill(0.4699)).toBe(divergingStepFill(-1));
  });

  it("adds one step every 3 points and saturates at ±15", () => {
    expect(VERDICT_MARGIN * DIVERGING_STEPS).toBe(DIVERGING_SATURATION);
    expect([0.53, 0.56, 0.59, 0.62, 0.65, 0.9].map(divergingStep)).toEqual([1, 2, 3, 4, 5, 5]);
    expect([0.47, 0.44, 0.41, 0.38, 0.35, 0.1].map(divergingStep)).toEqual([-1, -2, -3, -4, -5, -5]);
    // Win rates built by float arithmetic land in the bin they name.
    for (let i = 1; i <= DIVERGING_STEPS; i++) {
      expect(divergingStep(0.5 + i * VERDICT_MARGIN)).toBe(i);
      expect(divergingStep(0.5 - DIVERGING_SATURATION + (DIVERGING_STEPS - i) * VERDICT_MARGIN)).toBe(-i);
    }
  });
});
