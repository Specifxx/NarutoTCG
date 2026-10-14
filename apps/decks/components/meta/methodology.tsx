import type { ReactNode } from "react";
import { DIVERGING_SATURATION } from "@/lib/colors";
import { CHARTED_ARCHETYPES } from "@/lib/data/archetypes";
import { EVENT_TIER_LABEL, EVENT_TIER_ORDER, formatNumber, formatPercent } from "@/lib/format";
import { placementPoints } from "@/lib/meta/aggregate";
import { TIER_CONFIG, TIER_WEIGHT } from "@/lib/meta/config";
import { DONUT_SLICES, MATRIX_MIN_GAMES, TREND_EVENTS, TREND_NEUTRAL, formatLift } from "./derive";

const BRACKETS: ReadonlyArray<readonly [placement: number, label: string]> = [
  [1, "Winner"],
  [2, "Runner-up"],
  [4, "Top 4"],
  [8, "Top 8"],
  [16, "Top 16"],
  [32, "Top 32"],
];

/** How deep events without a top cut pay points, read off the engine itself. */
const NO_CUT_DEPTH = Array.from({ length: 128 }, (_, i) => i + 1).filter(
  (p) => placementPoints(p, 0, "store-championship") > 0,
).length;

const points = (value: number) => formatNumber(Math.round(value * 10) / 10);

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    // min-w-0: the nowrap formulas scroll inside their block instead of widening the grid column.
    <div className="min-w-0 rounded-lg border border-shadow-700 bg-shadow-900 p-4">
      <h3 className="font-semibold text-white">{title}</h3>
      <div className="mt-2 space-y-2 text-sm text-ash-300">{children}</div>
    </div>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <code className="block relative overflow-x-auto rounded-md bg-shadow-800 px-3 py-2 font-mono text-xs whitespace-nowrap text-ash-100">
      {children}
    </code>
  );
}

/** How every number on the meta page is computed; all constants are read from TIER_CONFIG. */
export function Methodology() {
  const { priorMatches, conversionPrior, minEntries, minShare, weights, scales, thresholds } = TIER_CONFIG;
  const scoreRows = [
    {
      label: "Adjusted win rate",
      weight: weights.winRate,
      from: formatPercent(scales.winRate[0], 0),
      to: formatPercent(scales.winRate[1], 0),
    },
    {
      label: "Conversion lift",
      weight: weights.conversion,
      from: formatLift(scales.conversionLift[0]),
      to: formatLift(scales.conversionLift[1]),
    },
    {
      label: "Meta share",
      weight: weights.presence,
      from: formatPercent(scales.metaShare[0], 0),
      to: formatPercent(scales.metaShare[1], 0),
    },
  ];

  return (
    <details id="methodology" open className="group scroll-mt-32">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 12 12" aria-hidden="true" className="h-3 w-3 shrink-0 text-ash-400 transition group-open:rotate-90">
          <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 id="methodology-title" className="text-xl font-bold text-white">
          Methodology
        </h2>
      </summary>
      <p className="mt-2 max-w-3xl text-sm text-ash-400">
        How the tier list, stats and matchups are computed. Every event on this site is fictional demo data generated for the
        Naruto TCG mock; none of it reflects real tournament results.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Block title="Win rate">
          <p>
            Only non-mirror matches count. Byes, intentional draws and mirror matches are excluded; a draw counts as half a win.
            Swiss and top-cut rounds both count.
          </p>
          <Formula>win rate = (wins + draws ÷ 2) ÷ games</Formula>
          <p>The range in brackets is the Wilson 95% score interval on that rate.</p>
        </Block>

        <Block title="Adjusted win rate">
          <p>
            A Bayesian shrink toward 50%: every archetype starts with {priorMatches} pseudo-games at an even record, so a hot
            streak over a handful of matches cannot top the list.
          </p>
          <Formula>
            adjusted = (wins + draws ÷ 2 + {priorMatches} × 0.5) ÷ (games + {priorMatches})
          </Formula>
        </Block>

        <Block title="Top-cut conversion and lift">
          <p>
            Conversion is top cuts ÷ entries. For the lift it is smoothed with {conversionPrior} pseudo-entries at the field-wide
            baseline (all top-cut slots ÷ all players), then divided by that baseline: {formatLift(1)} is average, {formatLift(2)}{" "}
            converts twice as often as the field.
          </p>
          <Formula>
            lift = ((top cuts + {conversionPrior} × baseline) ÷ (entries + {conversionPrior})) ÷ baseline
          </Formula>
        </Block>

        <Block title="Composite score (0–100)">
          <p>Each component is mapped linearly onto 0–100 (clamped), then weighted:</p>
          <table className="w-full text-xs">
            <caption className="sr-only">Score components, weights and scales</caption>
            <thead className="text-left text-ash-400">
              <tr>
                <th scope="col" className="py-1 pr-2 font-semibold">
                  Component
                </th>
                <th scope="col" className="py-1 pr-2 text-right font-semibold">
                  Weight
                </th>
                <th scope="col" className="py-1 pr-2 text-right font-semibold">
                  = 0
                </th>
                <th scope="col" className="py-1 text-right font-semibold">
                  = 100
                </th>
              </tr>
            </thead>
            <tbody>
              {scoreRows.map((row) => (
                <tr key={row.label} className="border-t border-shadow-700">
                  <th scope="row" className="py-1 pr-2 text-left font-normal text-ash-200">
                    {row.label}
                  </th>
                  <td className="py-1 pr-2 text-right tabular-nums">{formatPercent(row.weight, 0)}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{row.from}</td>
                  <td className="py-1 text-right tabular-nums">{row.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>

        <Block title="Tiers">
          <ul className="space-y-1">
            <li>
              <strong className="text-white">S</strong> score ≥ {thresholds.S}
            </li>
            <li>
              <strong className="text-white">A</strong> score ≥ {thresholds.A}
            </li>
            <li>
              <strong className="text-white">B</strong> score ≥ {thresholds.B}
            </li>
            <li>
              <strong className="text-white">C</strong> score below {thresholds.B}
            </li>
          </ul>
          <p>
            <strong className="text-white">Unranked:</strong> rogue lists, and any archetype with fewer than{" "}
            {formatNumber(minEntries)} entries or under {formatPercent(minShare)} of the field in the selected events.
          </p>
        </Block>

        <Block title="Placement points">
          <p>
            Paid to top-cut finishers (
            {NO_CUT_DEPTH > 0 ? `the top ${NO_CUT_DEPTH} at events without a cut` : "none without a cut"}), multiplied by the
            event tier.
          </p>
          <p className="tabular-nums">
            {BRACKETS.map(
              ([placement, label]) => `${label} ${points(placementPoints(placement, 32, "store-championship"))}`,
            ).join(" · ")}
          </p>
          <p className="tabular-nums">
            {EVENT_TIER_ORDER.map((tier) => `${EVENT_TIER_LABEL[tier]} ×${TIER_WEIGHT[tier]}`).join(" · ")}
          </p>
        </Block>

        <Block title="Trends, charts and matchups">
          <p>
            Trend compares meta share over the latest {TREND_EVENTS} events in the selection with the {TREND_EVENTS} before them;
            changes within ±{(TREND_NEUTRAL * 100).toFixed(1)} points read as steady.
          </p>
          <p>
            Charts give the {CHARTED_ARCHETYPES.length} charted archetypes fixed colors; the meta share donut keeps the{" "}
            {DONUT_SLICES} largest and folds the rest, uncharted archetypes and rogue into Other.
          </p>
          <p>
            Matchup cells with fewer than {MATRIX_MIN_GAMES} games are dimmed, hatched and marked “low”. Colors saturate at{" "}
            {formatPercent(0.5 - DIVERGING_SATURATION, 0)} and {formatPercent(0.5 + DIVERGING_SATURATION, 0)}.
          </p>
        </Block>
      </div>
    </details>
  );
}
