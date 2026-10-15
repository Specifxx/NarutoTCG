import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/colors";
import { getSeedAggregates } from "@/lib/data/meta";
import { MetaDashboardFallback } from "./meta-dashboard";
import { Methodology } from "./methodology";

describe("meta page server render", () => {
  const html = renderToString(<MetaDashboardFallback aggregates={getSeedAggregates()} />).replace(/<!-- -->/g, "");

  it("counts registrations as entries in the summary", () => {
    const summary = html.match(/<p aria-live="polite"[^>]*>(.*?)<\/p>/)![1]!;
    expect(summary).toMatch(/\d[\d,]* entries · /);
    expect(summary).not.toMatch(/players/);
  });

  it("gives every matrix cell label at least 4.5:1, n= labels included", () => {
    const cells = [...html.matchAll(/background-color:(#[0-9a-f]{6});color:(#[0-9a-f]{6})/g)];
    expect(cells.length).toBeGreaterThan(20);
    for (const [, fill, ink] of cells) expect(contrastRatio(fill!, ink!)).toBeGreaterThanOrEqual(4.5);
    expect(html).not.toContain("opacity-80");
  });

  it("names the verdict thresholds in the matrix legend and offers a table view", () => {
    expect(html).toContain("Unfavored ≤47%");
    expect(html).toContain("Favored ≥53%");
    expect(html).toContain("full color at ≤35% and ≥65%");
    expect(html).toContain('aria-label="Matchups view"');
    expect(html).not.toContain("Hover a cell for");
  });

  it("explains the bands and the raw vs smoothed multiple in the methodology", () => {
    const methodology = renderToString(<Methodology />).replace(/<!-- -->/g, "");
    expect(methodology).toContain("Favored at 53% or more and Unfavored at 47% or less");
    expect(methodology).toContain("raw multiple");
    expect(methodology).not.toContain("scroll-mt");
  });
});
