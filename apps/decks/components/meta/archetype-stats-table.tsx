"use client";

import { cx } from "@naruto-tcg/ui";
import { useMemo, useState, type ReactNode } from "react";
import { ArchetypeBadge, TierBadge } from "@/components/ui/badges";
import { DataTable, THead, Td, Th, Tr } from "@/components/ui/table";
import { formatNumber, formatPercent } from "@/lib/format";
import type { ArchetypeStats } from "@/lib/meta/types";
import { formatLift, formatWinRateInterval, formatWLD } from "./derive";
import { DEFAULT_STATS_SORT, nextSort, sortStats, type StatsSort, type StatsSortKey } from "./stats-sort";

interface Column {
  key: StatsSortKey;
  label: string;
  /** Header hint. */
  hint: string;
  numeric?: boolean;
  render: (row: ArchetypeStats) => ReactNode;
}

const COLUMNS: Column[] = [
  {
    key: "archetype",
    label: "Archetype",
    hint: "Archetype name",
    render: (r) => <ArchetypeBadge archetypeId={r.archetypeId} href />,
  },
  { key: "tier", label: "Tier", hint: "Tier from the composite score", render: (r) => <TierBadge tier={r.tier} size="sm" /> },
  {
    key: "entries",
    label: "Entries",
    hint: "Players registered on the archetype",
    numeric: true,
    render: (r) => formatNumber(r.entries),
  },
  { key: "share", label: "Share", hint: "Share of all players", numeric: true, render: (r) => formatPercent(r.metaShare) },
  {
    key: "record",
    label: "W-L-D",
    hint: "Non-mirror match record (byes, intentional draws and mirrors excluded); sorts by games played",
    numeric: true,
    render: (r) => formatWLD(r.record),
  },
  {
    key: "winRate",
    label: "Win rate (95% CI)",
    hint: "Non-mirror win rate, draws count half, with its Wilson 95% interval",
    numeric: true,
    render: (r) => formatWinRateInterval(r.winRate, r.winRateInterval),
  },
  {
    key: "adjusted",
    label: "Adj. WR",
    hint: "Win rate shrunk toward 50% for small samples",
    numeric: true,
    render: (r) => formatPercent(r.adjustedWinRate),
  },
  { key: "topCut", label: "Top cuts", hint: "Players that made a top cut", numeric: true, render: (r) => formatNumber(r.topCut) },
  {
    key: "conversion",
    label: "Conv.",
    hint: "Top cuts ÷ entries",
    numeric: true,
    render: (r) => formatPercent(r.conversionRate),
  },
  {
    key: "lift",
    label: "Lift",
    hint: "Smoothed conversion ÷ the field-wide conversion (1.0× = average)",
    numeric: true,
    render: (r) => formatLift(r.conversionLift),
  },
  { key: "eventWins", label: "Wins", hint: "Events won", numeric: true, render: (r) => formatNumber(r.eventWins) },
  {
    key: "points",
    label: "Points",
    hint: "Placement points weighted by event tier",
    numeric: true,
    render: (r) => formatNumber(Math.round(r.points)),
  },
  {
    key: "score",
    label: "Score",
    hint: "Composite 0–100 score used for tiering",
    numeric: true,
    render: (r) => r.score.toFixed(1),
  },
];

function SortIcon({ direction }: { direction: "asc" | "desc" | null }) {
  return (
    <svg
      viewBox="0 0 10 12"
      aria-hidden="true"
      className={cx("h-3 w-2.5 shrink-0", direction ? "text-chakra-400" : "text-ash-500")}
    >
      <path d="M5 1 8.5 5h-7Z" fill="currentColor" opacity={direction === "desc" ? 0.3 : 1} />
      <path d="M5 11 1.5 7h7Z" fill="currentColor" opacity={direction === "asc" ? 0.3 : 1} />
    </svg>
  );
}

/** Sortable per-archetype stats; header buttons toggle the sort and expose it through aria-sort. */
export function ArchetypeStatsTable({ stats }: { stats: ArchetypeStats[] }) {
  const [sort, setSort] = useState<StatsSort>(DEFAULT_STATS_SORT);
  const rows = useMemo(() => sortStats(stats, sort), [stats, sort]);
  const active = COLUMNS.find((c) => c.key === sort.key)!;

  return (
    <DataTable>
      <caption className="sr-only">
        Archetype statistics, sorted by {active.label} ({sort.direction === "asc" ? "ascending" : "descending"})
      </caption>
      <THead>
        <tr>
          {COLUMNS.map((column, i) => {
            const direction = sort.key === column.key ? sort.direction : null;
            return (
              <Th
                key={column.key}
                numeric={column.numeric}
                aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none"}
                className={cx(i === 0 && "sticky left-0 z-10 bg-shadow-800")}
              >
                <button
                  type="button"
                  title={column.hint}
                  onClick={() => setSort((current) => nextSort(current, column.key))}
                  className={cx(
                    "inline-flex items-center gap-1 rounded-sm font-semibold uppercase tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
                    direction ? "text-white" : "hover:text-white",
                  )}
                >
                  {column.label}
                  <SortIcon direction={direction} />
                </button>
              </Th>
            );
          })}
        </tr>
      </THead>
      <tbody>
        {rows.map((row) => (
          <Tr key={row.archetypeId}>
            {COLUMNS.map((column, i) =>
              i === 0 ? (
                <th key={column.key} scope="row" className="sticky left-0 z-10 bg-shadow-900 px-3 py-2.5 text-left font-normal">
                  {column.render(row)}
                </th>
              ) : (
                <Td
                  key={column.key}
                  numeric={column.numeric}
                  className={cx(column.key === "score" && "font-semibold text-white")}
                >
                  {column.render(row)}
                </Td>
              ),
            )}
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}
