import { describe, expect, it } from "vitest";
import { divergingFill, inkOn } from "@/lib/colors";
import { formatInterval, matchupNumbers, matchupVerdict, winRateChipColors } from "./matchup-verdict";

const entry = (winRate: number | null, games: number, lowSample = false) => ({
  winRate,
  games,
  lowSample,
  record: { wins: 0, losses: 0, draws: 0 },
});

describe("matchupVerdict", () => {
  it("reads the win rate as Favored / Even / Unfavored", () => {
    expect(matchupVerdict(entry(0.6, 30))).toEqual({ tone: "favored", label: "Favored", lowSample: false });
    expect(matchupVerdict(entry(0.5, 30))).toEqual({ tone: "even", label: "Even", lowSample: false });
    expect(matchupVerdict(entry(0.4, 30))).toEqual({ tone: "unfavored", label: "Unfavored", lowSample: false });
  });

  it("flags low samples but keeps the verdict", () => {
    expect(matchupVerdict(entry(0.75, 4, true))).toEqual({ tone: "favored", label: "Favored", lowSample: true });
  });

  it("says No data without games, never low sample", () => {
    expect(matchupVerdict(entry(null, 0, true))).toEqual({ tone: "none", label: "No data", lowSample: false });
  });
});

describe("matchupNumbers", () => {
  it("prints the win rate, games and record", () => {
    expect(matchupNumbers({ winRate: 15 / 24, games: 24, record: { wins: 15, losses: 9, draws: 0 } })).toBe("62.5% over 24 games (15-9)");
    expect(matchupNumbers({ winRate: 0.5, games: 1, record: { wins: 0, losses: 0, draws: 1 } })).toBe("50.0% over 1 game (0-0-1)");
    expect(matchupNumbers({ winRate: null, games: 0, record: { wins: 0, losses: 0, draws: 0 } })).toBe("No games recorded");
  });

  it("formats the interval", () => {
    expect(formatInterval([0.481, 0.744])).toBe("48–74%");
    expect(formatInterval(null)).toBeNull();
  });
});

describe("winRateChipColors", () => {
  it("uses the diverging fill with readable ink", () => {
    const { background, color } = winRateChipColors(0.7, false);
    expect(background).toBe(divergingFill(0.7));
    expect(color).toBe(inkOn(divergingFill(0.7)));
  });

  it("dims low-sample chips toward the surface", () => {
    const full = winRateChipColors(0.7, false).background;
    const dim = winRateChipColors(0.7, true).background;
    expect(dim).not.toBe(full);
    expect(dim).toMatch(/^#[0-9a-f]{6}$/);
    const brightness = (hex: string) => [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0);
    expect(brightness(dim)).toBeLessThan(brightness(full));
  });
});
