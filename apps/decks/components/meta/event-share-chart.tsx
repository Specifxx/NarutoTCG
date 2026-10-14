"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  BarStack,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { ChartFrame } from "@/components/charts/chart-frame";
import { CHART, chartSeriesIds, seriesColor, seriesLabel } from "@/components/charts/chart-theme";
import { ChartTooltipCard } from "@/components/charts/chart-tooltip";
import { DataTable, THead, Td, Th, Tr } from "@/components/ui/table";
import { formatDate, formatNumber, formatPercent, formatShortDate } from "@/lib/format";
import type { MetaShareRow } from "@/lib/meta/types";
import { AXIS_TICK, HOVER_CURSOR, percentTick } from "./chart-common";
import { compactEventTick } from "./derive";

/** Plot plus the angled event-label band. */
const HEIGHT = 320;
const X_AXIS_BAND = 72;

interface Series {
  id: string;
  label: string;
  color: string;
}

function EventTooltip({ active, payload, series }: TooltipContentProps & { series: Series[] }) {
  const row = payload?.[0]?.payload as MetaShareRow | undefined;
  if (!active || !row) return null;
  return (
    <ChartTooltipCard
      title={row.label}
      rows={[...series].reverse().map((s) => ({
        key: s.id,
        label: s.label,
        value: formatPercent(row.shares[s.id] ?? 0),
        color: s.color,
      }))}
      footer={`${formatDate(row.date)} · ${formatNumber(row.playerCount)} players`}
    />
  );
}

/**
 * 100% stacked columns of archetype share per event, oldest to newest. Stacks follow the fixed
 * chart series order, so a filter never reorders or repaints a series.
 */
export function EventShareChart({ rows }: { rows: MetaShareRow[] }) {
  const series = useMemo<Series[]>(
    () =>
      chartSeriesIds()
        .filter((id) => rows.some((row) => (row.shares[id] ?? 0) > 0))
        .map((id) => ({ id, label: seriesLabel(id), color: seriesColor(id) })),
    [rows],
  );
  const labels = useMemo(() => new Map(rows.map((row) => [row.tournamentId, row.label])), [rows]);

  return (
    <ChartFrame
      title="Archetype representation by event"
      description="Each column is one event's field (100%), oldest to newest. The legend lists the stack bottom to top."
      legend={series.map((s) => ({ id: s.id, label: s.label, color: s.color }))}
      table={
        <DataTable>
          <caption className="sr-only">Archetype share of each event's field</caption>
          <THead>
            <tr>
              <Th className="sticky left-0 z-10 bg-shadow-800">Event</Th>
              <Th>Date</Th>
              <Th numeric>Players</Th>
              {series.map((s) => (
                <Th key={s.id} numeric>
                  {s.label}
                </Th>
              ))}
            </tr>
          </THead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.tournamentId}>
                <th scope="row" className="sticky left-0 z-10 bg-shadow-900 px-3 py-2.5 text-left font-medium text-ash-100">
                  {row.label}
                </th>
                <Td className="whitespace-nowrap text-ash-400">{formatShortDate(row.date)}</Td>
                <Td numeric>{formatNumber(row.playerCount)}</Td>
                {series.map((s) => (
                  <Td key={s.id} numeric>
                    {formatPercent(row.shares[s.id] ?? 0)}
                  </Td>
                ))}
              </Tr>
            ))}
          </tbody>
        </DataTable>
      }
    >
      {/* Clips the 640px pre-measure render so it never widens the page on narrow screens. */}
      <div className="relative overflow-hidden">
        <ResponsiveContainer width="100%" height={HEIGHT} initialDimension={{ width: 640, height: HEIGHT }}>
          <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={CHART.grid} strokeWidth={1} />
            <XAxis
              dataKey="tournamentId"
              tickFormatter={(id: string) => compactEventTick(labels.get(id) ?? id)}
              interval={0}
              angle={-40}
              textAnchor="end"
              height={X_AXIS_BAND}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: CHART.axis }}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              allowDataOverflow
              tickFormatter={percentTick}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              content={(props) => <EventTooltip {...props} series={series} />}
              cursor={HOVER_CURSOR}
              isAnimationActive={false}
            />
            <BarStack radius={[CHART.radius, CHART.radius, 0, 0]}>
              {series.map((s) => (
                <Bar
                  key={s.id}
                  dataKey={(row: MetaShareRow) => row.shares[s.id] ?? 0}
                  name={s.label}
                  fill={s.color}
                  stroke={CHART.surface}
                  strokeWidth={CHART.gap}
                  maxBarSize={CHART.maxBarSize}
                  isAnimationActive={false}
                />
              ))}
            </BarStack>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
