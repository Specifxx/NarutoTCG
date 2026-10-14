"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cx } from "@naruto-tcg/ui";
import { ChevronDownIcon } from "@/components/directory/icons";
import { PriceChange } from "@/components/market/PriceChange";
import { CHANGE_WINDOWS } from "@/lib/market/constants";
import { formatDay, formatPct, formatShortDay, formatSignedUsd, formatUsd } from "@/lib/market/format";
import type { ChangeWindow, IsoDay, PriceChange as Change, PricePoint } from "@/lib/market/types";
import {
  dayTicks,
  latestMarket,
  rangeChange,
  rangePoints,
  SERIES,
  seriesWithData,
  valueDomain,
  valueTicks,
  type RangeChange,
  type Series,
  type SeriesKey,
} from "./history";
import { TableIcon } from "./icons";
import { SectionHeader } from "./SectionHeader";

/** Theme tokens as literals: recharts writes them into SVG attributes. */
const SURFACE = "#0d0d14"; // shadow-900
const GRID = "#1f1f2e"; // shadow-700
const CURSOR = "#4a4a63"; // shadow-500
const TICK = "#8d8da3"; // ash-400

const DEFAULT_RANGE: ChangeWindow = "30d";
/** Below this plot width ("Oct 14" labels would collide) the x axis gets fewer ticks. */
const NARROW_PLOT_PX = 520;
const RANGE_LABEL: Record<ChangeWindow, { short: string; long: string }> = {
  "7d": { short: "7D", long: "7 days" },
  "30d": { short: "30D", long: "30 days" },
  "90d": { short: "90D", long: "90 days" },
};

const label = "text-[11px] font-semibold tracking-wider text-ash-400 uppercase";
const wholeUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
function RangeToggle({ range, onChange }: { range: ChangeWindow; onChange: (range: ChangeWindow) => void }) {
  return (
    <div
      role="group"
      aria-label="Price history range"
      className="inline-flex shrink-0 rounded-lg border border-shadow-700 bg-shadow-900 p-1"
    >
      {CHANGE_WINDOWS.map((window) => {
        const active = window === range;
        return (
          <button
            key={window}
            type="button"
            aria-pressed={active}
            title={`Last ${RANGE_LABEL[window].long}`}
            onClick={() => onChange(window)}
            className={cx(
              "flex h-8 min-w-12 items-center justify-center rounded-md px-3 text-sm font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 pointer-coarse:h-10",
              active ? "bg-chakra-500 text-shadow-950" : "text-ash-400 hover:bg-shadow-800 hover:text-ash-200",
            )}
          >
            {RANGE_LABEL[window].short}
          </button>
        );
      })}
    </div>
  );
}

function LegendToggle({
  series,
  state,
  onToggle,
}: {
  series: Series;
  state: "on" | "off" | "locked" | "empty";
  onToggle: () => void;
}) {
  const on = state === "on" || state === "locked";
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-disabled={state === "locked" || undefined}
      disabled={state === "empty"}
      title={state === "locked" ? "At least one series stays visible" : undefined}
      onClick={state === "locked" ? undefined : onToggle}
      className={cx(
        "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 pointer-coarse:h-10",
        on && "border-shadow-500 bg-shadow-800 text-ash-200",
        state === "on" && "hover:border-ash-400",
        state === "locked" && "cursor-default",
        state === "off" && "border-shadow-700 text-ash-400 hover:border-shadow-500 hover:text-ash-200",
        state === "empty" && "cursor-not-allowed border-dashed border-shadow-700 text-ash-400",
      )}
    >
      <span
        aria-hidden
        className={cx("h-0.5 w-3.5 rounded-full", !on && "opacity-40")}
        style={{ backgroundColor: series.color }}
      />
      <span className={cx(state === "off" && "line-through decoration-ash-400/60")}>{series.name}</span>
      {state === "empty" && <span className="font-normal">no data</span>}
    </button>
  );
}

function ChartTooltip({
  active,
  label: date,
  byDate,
  series,
}: {
  active: boolean;
  label: string | number | undefined;
  byDate: Map<IsoDay, PricePoint>;
  series: Series[];
}) {
  const point = typeof date === "string" ? byDate.get(date) : undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border border-shadow-700 bg-shadow-800 px-3 py-2.5 text-xs shadow-lg shadow-black/50">
      <p className="mb-2 font-medium text-ash-400">{formatDay(point.date)}</p>
      <ul className="grid grid-cols-[auto_auto_1fr] items-center gap-x-2 gap-y-1.5">
        {series.map((s) => (
          <li key={s.key} className="col-span-3 grid grid-cols-subgrid items-center">
            <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-right font-semibold text-ash-200 tabular-nums">{formatUsd(point[s.key])}</span>
            <span className="text-ash-400">{s.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function changeSummary(range: ChangeWindow, { change, since }: RangeChange): string {
  const span = since ? `since ${formatDay(since)}` : `over the last ${RANGE_LABEL[range].long}`;
  if (!change) return `Not enough market history to measure a change ${span}.`;
  return `Market price ${span}: ${formatPct(change.pct)} (${formatSignedUsd(change.abs)}), from ${formatUsd(change.from)} to ${formatUsd(change.to)}.`;
}

function DataTable({ points, cardName, range }: { points: PricePoint[]; cardName: string; range: ChangeWindow }) {
  const rows = [...points].reverse();
  return (
    <details className="group mt-4 border-t border-shadow-700 pt-2">
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md text-sm font-medium text-ash-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 [&::-webkit-details-marker]:hidden">
        <TableIcon className="size-4 text-ash-400" />
        View data table
        <ChevronDownIcon className="size-4 text-ash-400 transition-transform group-open:rotate-180" />
      </summary>
      <div
        role="region"
        aria-label={`Price history data, last ${RANGE_LABEL[range].long}`}
        tabIndex={0}
        className="mt-2 max-h-80 overflow-auto rounded-lg border border-shadow-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
      >
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Daily prices for {cardName} in US dollars, last {RANGE_LABEL[range].long}, newest first
          </caption>
          <thead className="sticky top-0 bg-shadow-800">
            <tr>
              <th scope="col" className={cx(label, "px-3 py-2 text-left")}>
                Date
              </th>
              {SERIES.map((s) => (
                <th key={s.key} scope="col" className={cx(label, "px-3 py-2 text-right whitespace-nowrap")}>
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-shadow-700/70">
            {rows.map((point) => (
              <tr key={point.date}>
                <th
                  scope="row"
                  className="px-3 py-1.5 text-left font-normal whitespace-nowrap text-ash-400 tabular-nums"
                >
                  {formatDay(point.date)}
                </th>
                {SERIES.map((s) => (
                  <td
                    key={s.key}
                    className={cx(
                      "px-3 py-1.5 text-right whitespace-nowrap tabular-nums",
                      s.key === "market" ? "font-medium text-white" : "text-ash-200",
                    )}
                  >
                    {formatUsd(point[s.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/**
 * Daily market and per-vendor prices with 7D / 30D / 90D ranges, toggleable series,
 * a crosshair tooltip, and a data-table twin. Ranges slice client-side.
 */
export function PriceHistoryChart({
  history,
  changes,
  cardName,
}: {
  history: PricePoint[];
  changes: Record<ChangeWindow, Change | null>;
  cardName: string;
}) {
  const [range, setRange] = useState<ChangeWindow>(DEFAULT_RANGE);
  const [hidden, setHidden] = useState<ReadonlySet<SeriesKey>>(() => new Set());
  const [narrow, setNarrow] = useState(false);

  const points = useMemo(() => rangePoints(history, range), [history, range]);
  const byDate = useMemo(() => new Map(points.map((p) => [p.date, p])), [points]);
  const ticks = useMemo(() => dayTicks(points, narrow ? 4 : 6), [points, narrow]);
  const available = useMemo(() => seriesWithData(points), [points]);

  const withData = SERIES.filter((s) => available.has(s.key));
  const chosen = withData.filter((s) => !hidden.has(s.key));
  // A range switch can leave only hidden series with data; never plot nothing.
  const visible = chosen.length > 0 ? chosen : withData.slice(0, 1);
  const visibleKeys = new Set(visible.map((s) => s.key));
  const domain = valueDomain(points, [...visibleKeys]);
  const yTicks = domain ? valueTicks(domain) : undefined;
  // Round ticks lose nothing without cents, and "$1,000" leaves the plot more room than "$1,000.00".
  const formatTick = yTicks?.every(Number.isInteger) ? (v: number) => wholeUsd.format(v) : (v: number) => formatUsd(v);

  const latest = latestMarket(history);
  const summary = rangeChange(points, changes[range]);

  const toggle = (key: SeriesKey) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const legendState = (s: Series): "on" | "off" | "locked" | "empty" => {
    if (!available.has(s.key)) return "empty";
    if (!visibleKeys.has(s.key)) return "off";
    return visible.length === 1 ? "locked" : "on";
  };

  if (history.length === 0 || !latest) {
    return (
      <section aria-labelledby="history-heading" className="mt-12">
        <SectionHeader id="history-heading" title="Price history" />
        <div className="rounded-xl border border-dashed border-shadow-700 bg-shadow-900 px-6 py-14 text-center">
          <p className="font-medium text-ash-200">No price history yet</p>
          <p className="mt-1 text-sm text-ash-400">Daily prices appear here once a marketplace has quoted this card.</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="history-heading" className="mt-12">
      <SectionHeader
        id="history-heading"
        title="Price history"
        description="Daily prices in USD. Market is the median across vendors."
        action={<RangeToggle range={range} onChange={setRange} />}
      />
      <div className="rounded-xl border border-shadow-700 bg-shadow-900 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <dt className={label}>Market price</dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight text-white">{formatUsd(latest.price)}</dd>
            </div>
            <div>
              <dt className={label}>
                {summary.since ? `Since ${formatShortDay(summary.since)}` : `${RANGE_LABEL[range].short} change`}
              </dt>
              <dd className="mt-1.5 text-base font-semibold">
                <PriceChange change={summary.change} showAbs />
              </dd>
            </div>
          </dl>
          <div role="group" aria-label="Chart series" className="flex flex-wrap gap-1.5">
            {SERIES.map((s) => (
              <LegendToggle key={s.key} series={s} state={legendState(s)} onToggle={() => toggle(s.key)} />
            ))}
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {changeSummary(range, summary)}
        </p>

        <div className="mt-5 h-72 min-w-0 sm:h-80 [&_.recharts-cartesian-axis-tick-value]:tabular-nums [&_.recharts-surface:focus]:outline-none [&_.recharts-wrapper:has(.recharts-surface:focus-visible)]:rounded-md [&_.recharts-wrapper:has(.recharts-surface:focus-visible)]:ring-2 [&_.recharts-wrapper:has(.recharts-surface:focus-visible)]:ring-chakra-400">
          {points.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" onResize={(width) => setNarrow(width < NARROW_PLOT_PX)}>
              <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="date"
                  ticks={ticks}
                  interval="preserveEnd"
                  minTickGap={12}
                  tickFormatter={(day: IsoDay) => formatShortDay(day)}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  tick={{ fill: TICK, fontSize: 12 }}
                  padding={{ left: 8, right: 8 }}
                />
                <YAxis
                  domain={domain ?? ["auto", "auto"]}
                  ticks={yTicks}
                  tickFormatter={formatTick}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={6}
                  tick={{ fill: TICK, fontSize: 12 }}
                  width="auto"
                />
                <Tooltip
                  cursor={{ stroke: CURSOR, strokeWidth: 1 }}
                  isAnimationActive={false}
                  wrapperStyle={{ outline: "none", zIndex: 10 }}
                  content={({ active, label: date }) => (
                    <ChartTooltip active={active} label={date} byDate={byDate} series={visible} />
                  )}
                />
                {[...visible].reverse().map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={s.strokeWidth}
                    dot={false}
                    activeDot={{ r: 4, fill: s.color, stroke: SURFACE, strokeWidth: 2 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-shadow-700 text-sm text-ash-400">
              No prices in the last {RANGE_LABEL[range].long}
            </div>
          )}
        </div>

        {points.length > 0 && <DataTable points={points} cardName={cardName} range={range} />}
      </div>
    </section>
  );
}
