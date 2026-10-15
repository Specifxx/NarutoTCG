"use client";

import { cx } from "@naruto-tcg/ui";
import { useMemo, useState, type CSSProperties } from "react";
import { CHART } from "@/components/charts/chart-theme";
import { ArchetypeDot, EmptyState } from "@/components/ui/badges";
import { Section } from "@/components/ui/page-header";
import { THead, Td, Th, Tr } from "@/components/ui/table";
import { DIVERGING_SATURATION, DIVERGING_STEPS, VERDICT_MARGIN, divergingFill, divergingStepFill, inkOn } from "@/lib/colors";
import { getArchetype } from "@/lib/data/archetypes";
import { formatPercent } from "@/lib/format";
import { buildMatchupMatrix, topArchetypeIds } from "@/lib/meta/matchups";
import type { MatchupCell, MetaAggregate } from "@/lib/meta/types";
import { DEFAULT_MATRIX_SIZE, MATRIX_SIZES, blendHex, formatIntervalPercent, formatWLD, matchupCellTitle } from "./derive";

/** Low-sample cells: the fill pulled halfway to the surface, under a 45° hatch. */
const LOW_SAMPLE_DIM = 0.55;
const HATCH = "repeating-linear-gradient(135deg, rgba(255,255,255,0.16) 0 1.5px, transparent 1.5px 6px)";

const names = (id: string) => {
  const archetype = getArchetype(id);
  return { name: archetype?.name ?? id, short: archetype?.shortName ?? id };
};

function cellStyle(cell: MatchupCell): CSSProperties {
  if (cell.mirror) return {};
  const base = divergingFill(cell.winRate);
  const fill = cell.lowSample ? blendHex(base, LOW_SAMPLE_DIM, CHART.surface) : base;
  return { backgroundColor: fill, color: inkOn(fill), backgroundImage: cell.lowSample ? HATCH : undefined };
}

function MatrixCell({
  cell,
  rowName,
  columnName,
  minGames,
}: {
  cell: MatchupCell;
  rowName: string;
  columnName: string;
  minGames: number;
}) {
  const title = matchupCellTitle(cell, rowName, columnName, minGames);
  return (
    <td
      title={title}
      style={cellStyle(cell)}
      className={cx(
        "h-12 min-w-[4.5rem] rounded-[3px] px-1.5 text-center align-middle",
        cell.mirror && "bg-shadow-800 text-ash-500",
      )}
    >
      {cell.mirror ? (
        <>
          <span aria-hidden="true" className="block text-sm font-bold">
            —
          </span>
          <span className="block text-[10px]">mirror</span>
        </>
      ) : (
        <>
          <span className="block text-sm font-bold tabular-nums">
            {cell.winRate === null ? "—" : formatPercent(cell.winRate)}
          </span>
          <span className={cx("block text-[10px] tabular-nums", cell.lowSample && "italic")}>
            n={cell.games}
            {cell.lowSample && " · low"}
          </span>
        </>
      )}
      <span className="sr-only">
        {cell.mirror
          ? ` ${cell.games} mirror matches`
          : cell.winRate === null
            ? ""
            : ` record ${formatWLD(cell.record)}${cell.interval ? `, 95% interval ${formatPercent(cell.interval[0], 0)} to ${formatPercent(cell.interval[1], 0)}` : ""}`}
      </span>
    </td>
  );
}

function DivergingLegend({ minGames }: { minGames: number }) {
  // One swatch per bin: the five unfavored steps, the Even gray, the five favored steps.
  const steps = Array.from({ length: DIVERGING_STEPS * 2 + 1 }, (_, i) => i - DIVERGING_STEPS);
  const pct = (value: number) => formatPercent(value, 0);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-ash-300">
      <div className="flex flex-col gap-1">
        <div className="flex gap-0.5" aria-hidden="true">
          {steps.map((step) => (
            <span key={step} className="h-3 w-5 rounded-[2px]" style={{ backgroundColor: divergingStepFill(step) }} />
          ))}
        </div>
        <div className="flex justify-between gap-4 text-ash-300">
          <span>← Unfavored ≤{pct(0.5 - VERDICT_MARGIN)}</span>
          <span>Even</span>
          <span>Favored ≥{pct(0.5 + VERDICT_MARGIN)} →</span>
        </div>
        <p className="text-ash-400">
          A step every {Math.round(VERDICT_MARGIN * 100)} points; full color at ≤{pct(0.5 - DIVERGING_SATURATION)} and ≥
          {pct(0.5 + DIVERGING_SATURATION)}.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-4 w-6 rounded-[2px]"
          style={{ backgroundColor: blendHex(divergingFill(0.56), LOW_SAMPLE_DIM, CHART.surface), backgroundImage: HATCH }}
        />
        <span>Low sample (“low”): fewer than {minGames} games</span>
      </div>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="flex h-4 w-6 items-center justify-center rounded-[2px] bg-shadow-800 text-ash-500">
          —
        </span>
        <span>Mirror match (not scored)</span>
      </div>
    </div>
  );
}

/** Every pairing as a row: the matrix's table twin, with the record and interval in plain view. */
function MatchupTable({ cells, ids }: { cells: MatchupCell[][]; ids: string[] }) {
  return (
    <div
      role="region"
      aria-label={`Matchup table, top ${ids.length} archetypes (scrolls)`}
      tabIndex={0}
      className="relative max-h-[32rem] w-full overflow-auto rounded-lg border border-shadow-700 outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
    >
      <table className="w-full min-w-max border-collapse text-sm">
        <caption className="sr-only">Every matchup between the top {ids.length} archetypes: record, games and 95% interval</caption>
        <THead className="sticky top-0 z-10">
          <tr>
            <Th>Deck</Th>
            <Th>Opponent</Th>
            <Th numeric>Win rate</Th>
            <Th numeric>W-L-D</Th>
            <Th numeric>Games</Th>
            <Th numeric>95% interval</Th>
            <Th>Note</Th>
          </tr>
        </THead>
        <tbody>
          {cells.flatMap((row) =>
            row.map((cell) => (
              <Tr key={`${cell.archetypeId}:${cell.opponentId}`}>
                <th scope="row" className="px-3 py-2 text-left font-medium whitespace-nowrap text-ash-100">
                  <span className="flex items-center gap-2">
                    <ArchetypeDot archetypeId={cell.archetypeId} />
                    {names(cell.archetypeId).name}
                  </span>
                </th>
                <Td className="whitespace-nowrap text-ash-200">{names(cell.opponentId).name}</Td>
                <Td numeric className="font-semibold text-white">
                  {cell.winRate === null ? "—" : formatPercent(cell.winRate)}
                </Td>
                <Td numeric>{cell.mirror || cell.games === 0 ? "—" : formatWLD(cell.record)}</Td>
                <Td numeric>{cell.games}</Td>
                <Td numeric>{cell.interval && !cell.mirror ? formatIntervalPercent(cell.interval) : "—"}</Td>
                <Td className="whitespace-nowrap text-ash-300">
                  {cell.mirror ? "Mirror (not scored)" : cell.games === 0 ? "No games yet" : cell.lowSample ? "Low sample" : ""}
                </Td>
              </Tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

type MatrixView = "grid" | "table";

const SEGMENT =
  "rounded px-2.5 py-1 font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-chakra-400";
const segment = (pressed: boolean) => cx(SEGMENT, pressed ? "bg-shadow-700 text-white" : "text-ash-400 hover:text-white");

/**
 * Head-to-head heatmap of the most-played archetypes. Rows are the deck, columns the
 * opponent; the first column stays pinned while the grid scrolls sideways.
 */
export function MatchupMatrix({ meta, minGames }: { meta: MetaAggregate; minGames: number }) {
  const [size, setSize] = useState<number>(DEFAULT_MATRIX_SIZE);
  const [view, setView] = useState<MatrixView>("grid");
  const matrix = useMemo(() => buildMatchupMatrix(meta, topArchetypeIds(meta, size), { minGames }), [meta, size, minGames]);
  const ids = matrix.archetypeIds;

  return (
    <Section
      id="matchups"
      title="Matchups"
      description="Row deck's non-mirror win rate against the column deck (draws count half). Switch to Table for every pairing's record and 95% interval, or hover a cell."
      actions={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <div role="group" aria-label="Matrix size" className="flex items-center gap-2">
            <span className="text-ash-400">Top</span>
            <div className="flex rounded-md border border-shadow-600 p-0.5">
              {MATRIX_SIZES.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={size === n}
                  aria-label={`Top ${n} archetypes`}
                  onClick={() => setSize(n)}
                  className={cx(segment(size === n), "tabular-nums")}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className="text-ash-400">archetypes</span>
          </div>
          <div role="group" aria-label="Matchups view" className="flex rounded-md border border-shadow-600 p-0.5">
            {(["grid", "table"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => setView(option)}
                className={cx(segment(view === option), "capitalize")}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {ids.length < 2 ? (
        <EmptyState title="Not enough archetypes for a matchup grid">Widen the filters to include more events.</EmptyState>
      ) : view === "table" ? (
        <MatchupTable cells={matrix.cells} ids={ids} />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Focusable so keyboard users can scroll the grid sideways; it holds no other focus target. */}
          <div
            role="region"
            aria-label={`Matchup matrix, top ${ids.length} archetypes (scrolls sideways)`}
            tabIndex={0}
            className="w-full relative overflow-x-auto rounded-lg border border-shadow-700 bg-shadow-900 outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
          >
            <table className="border-separate border-spacing-0.5 p-1 text-xs">
              <caption className="sr-only">
                Matchup win rates for the top {ids.length} archetypes: rows are the deck, columns the opponent
              </caption>
              <thead>
                <tr>
                  <td className="sticky left-0 z-10 bg-shadow-900 shadow-[2px_0_0_0_var(--color-shadow-900)] px-2 py-1.5 text-[10px] uppercase tracking-wide text-ash-500">
                    Deck ↓ · Opp. →
                  </td>
                  {ids.map((id) => (
                    <th
                      key={id}
                      scope="col"
                      title={names(id).name}
                      className="min-w-[4.5rem] px-1 py-1.5 align-bottom font-medium text-ash-200"
                    >
                      <span className="flex flex-col items-center gap-1 text-center">
                        <ArchetypeDot archetypeId={id} />
                        <span className="leading-tight">{names(id).short}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.cells.map((row, r) => (
                  <tr key={ids[r]}>
                    <th
                      scope="row"
                      title={names(ids[r]!).name}
                      className="sticky left-0 z-10 bg-shadow-900 shadow-[2px_0_0_0_var(--color-shadow-900)] py-1 pr-3 pl-2 text-left font-medium whitespace-nowrap text-ash-100"
                    >
                      <span className="flex items-center gap-2">
                        <ArchetypeDot archetypeId={ids[r]!} />
                        {names(ids[r]!).short}
                      </span>
                    </th>
                    {row.map((cell) => (
                      <MatrixCell
                        key={cell.opponentId}
                        cell={cell}
                        rowName={names(cell.archetypeId).name}
                        columnName={names(cell.opponentId).name}
                        minGames={matrix.minGames}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DivergingLegend minGames={matrix.minGames} />
        </div>
      )}
    </Section>
  );
}
