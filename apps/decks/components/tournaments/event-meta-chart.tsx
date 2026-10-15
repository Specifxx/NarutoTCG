"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { ChartFrame } from "@/components/charts/chart-frame";
import { CHART, chartSeriesIds, seriesColor, seriesLabel } from "@/components/charts/chart-theme";
import { ChartTooltipCard } from "@/components/charts/chart-tooltip";
import type { LegendItem } from "@/components/charts/legend";
import { DataTable, Td, Th, THead, Tr } from "@/components/ui/table";
import { formatNumber, formatPercent } from "@/lib/format";
import type { SeriesBreakdownRow } from "./event";

/** Height per bar row and the band reserved for the value axis. */
const ROW_HEIGHT = 34;
const AXIS_BAND = 30;

function BreakdownTooltip({ active, payload, topCutSize }: TooltipContentProps & { topCutSize: number }) {
  const row = payload?.[0]?.payload as SeriesBreakdownRow | undefined;
  if (!active || !row) return null;
  return (
    <ChartTooltipCard
      title={row.label}
      rows={[
        { key: "entries", label: row.entries === 1 ? "entry" : "entries", value: formatNumber(row.entries), color: seriesColor(row.seriesId) },
        { key: "share", label: "of the field", value: formatPercent(row.share) },
        ...(row.conversion !== null
          ? [{ key: "cut", label: `in the Top ${topCutSize} (${formatPercent(row.conversion, 0)} converted)`, value: formatNumber(row.topCut) }]
          : []),
      ]}
    />
  );
}

function BreakdownTable({ rows, topCutSize }: { rows: SeriesBreakdownRow[]; topCutSize: number }) {
  const hasCut = topCutSize > 0;
  return (
    <DataTable>
      <caption className="sr-only">Entries, field share{hasCut ? ", top cut count and conversion" : ""} per archetype</caption>
      <THead>
        <tr>
          <Th>Archetype</Th>
          <Th numeric>Entries</Th>
          <Th numeric>Share</Th>
          {hasCut && <Th numeric>Top {topCutSize}</Th>}
          {hasCut && <Th numeric>Conversion</Th>}
        </tr>
      </THead>
      <tbody>
        {rows.map((row) => (
          <Tr key={row.seriesId}>
            <Td>
              <span className="flex items-center gap-2 text-ash-100">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: seriesColor(row.seriesId) }} />
                {row.label}
              </span>
            </Td>
            <Td numeric className="font-semibold text-white">
              {formatNumber(row.entries)}
            </Td>
            <Td numeric>{formatPercent(row.share)}</Td>
            {hasCut && <Td numeric>{formatNumber(row.topCut)}</Td>}
            {hasCut && <Td numeric>{formatPercent(row.conversion, 0)}</Td>}
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}

/** Horizontal bars of entries per chart series for one event, with a table twin. */
export function EventMetaChart({ rows, topCutSize, playerCount }: { rows: SeriesBreakdownRow[]; topCutSize: number; playerCount: number }) {
  const height = rows.length * ROW_HEIGHT + AXIS_BAND;
  const present = new Set(rows.map((r) => r.seriesId));
  const legend: LegendItem[] = chartSeriesIds()
    .filter((id) => present.has(id))
    .map((id) => ({ id, label: seriesLabel(id), color: seriesColor(id), shape: "rect" }));

  return (
    <ChartFrame
      title="Entries by archetype"
      description={`${formatNumber(playerCount)} players. Archetypes without a chart color and rogue lists are grouped as Other.`}
      legend={legend}
      table={<BreakdownTable rows={rows} topCutSize={topCutSize} />}
    >
      <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 640, height }}>
        <BarChart
          data={rows}
          accessibilityLayer={false}
          role="img"
          aria-label="Event meta bar chart. Switch to the Table view for exact values."
          layout="vertical"
          margin={{ top: 0, right: 36, bottom: 0, left: 0 }}
          barCategoryGap="22%"
        >
          <CartesianGrid horizontal={false} stroke={CHART.grid} strokeWidth={1} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: CHART.tick, fontSize: CHART.fontSize }}
            tickLine={false}
            axisLine={{ stroke: CHART.axis }}
            height={AXIS_BAND}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={96}
            tick={{ fill: CHART.tick, fontSize: CHART.fontSize }}
            tickLine={false}
            axisLine={{ stroke: CHART.axis }}
          />
          <Tooltip
            cursor={{ fill: CHART.grid, fillOpacity: 0.6 }}
            content={(props) => <BreakdownTooltip {...props} topCutSize={topCutSize} />}
          />
          <Bar
            dataKey="entries"
            name="Entries"
            maxBarSize={CHART.maxBarSize}
            radius={[0, CHART.radius, CHART.radius, 0]}
            isAnimationActive={false}
          >
            {rows.map((row) => (
              <Cell key={row.seriesId} fill={seriesColor(row.seriesId)} />
            ))}
            <LabelList dataKey="entries" position="right" fill={CHART.inkSecondary} fontSize={CHART.fontSize} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
