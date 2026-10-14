"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { ChartFrame } from "@/components/charts/chart-frame";
import { CHART } from "@/components/charts/chart-theme";
import { ChartTooltipCard } from "@/components/charts/chart-tooltip";
import { formatPercent } from "@/lib/format";
import type { FieldVsTopCutRow } from "@/lib/meta/share";
import { AXIS_TICK, CATEGORY_TICK, FIELD_FILL, HOVER_CURSOR, TOP_CUT_FILL, niceCeil, percentTick } from "./chart-common";
import { formatLift, sortFieldVsTopCut } from "./derive";

const ROW_HEIGHT = 40;
const X_AXIS_BAND = 28;
const BAR_SIZE = 10;

function ratio(row: FieldVsTopCutRow): string {
  return row.fieldShare > 0 ? formatLift(row.topCutShare / row.fieldShare) : "—";
}

function FieldTooltip({ active, payload }: TooltipContentProps) {
  const row = payload?.[0]?.payload as FieldVsTopCutRow | undefined;
  if (!active || !row) return null;
  return (
    <ChartTooltipCard
      title={row.label}
      rows={[
        { key: "cut", label: "of top-cut slots", value: formatPercent(row.topCutShare), color: TOP_CUT_FILL },
        { key: "field", label: "of the field", value: formatPercent(row.fieldShare), color: FIELD_FILL },
      ]}
      footer={`Top cut ÷ field: ${ratio(row)}`}
    />
  );
}

/**
 * Paired bars per archetype: share of the field (gray) next to share of top-cut slots
 * (chakra). One hue family, so the comparison reads as more/less, not as identity.
 */
export function FieldVsCutChart({ rows, hasTopCut }: { rows: FieldVsTopCutRow[]; hasTopCut: boolean }) {
  const data = useMemo(() => sortFieldVsTopCut(rows), [rows]);
  const max = niceCeil(Math.max(0, ...data.flatMap((r) => [r.fieldShare, r.topCutShare])));
  const ticks = Array.from({ length: Math.round(max / 0.05) + 1 }, (_, i) => i * 0.05).filter(
    (_, i, all) => all.length <= 7 || i % 2 === 0,
  );
  const height = data.length * ROW_HEIGHT + X_AXIS_BAND;

  return (
    <ChartFrame
      title="Field vs top cut"
      description={
        hasTopCut
          ? "Share of all entries vs share of top-cut slots, by field share (Other last). An orange bar longer than its gray twin means the deck converts above its numbers."
          : "None of the selected events had a top cut, so every top-cut share is 0%."
      }
      legend={[
        { id: "field", label: "Field share", color: FIELD_FILL },
        { id: "cut", label: "Top-cut share", color: TOP_CUT_FILL },
      ]}
      table={
        <table className="w-full text-sm">
          <caption className="sr-only">Field share vs top-cut share by archetype</caption>
          <thead className="text-left text-xs uppercase tracking-wide text-ash-400">
            <tr>
              <th scope="col" className="py-1.5 pr-3 font-semibold">
                Archetype
              </th>
              <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
                Field
              </th>
              <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
                Top cut
              </th>
              <th scope="col" className="py-1.5 text-right font-semibold">
                Ratio
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.seriesId} className="border-t border-shadow-700">
                <th scope="row" className="py-1.5 pr-3 text-left font-normal text-ash-100">
                  {row.label}
                </th>
                <td className="py-1.5 pr-3 text-right tabular-nums">{formatPercent(row.fieldShare)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{formatPercent(row.topCutShare)}</td>
                <td className="py-1.5 text-right tabular-nums">{ratio(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      {/* Clips the 640px pre-measure render so it never widens the page on narrow screens. */}
      <div className="overflow-hidden">
        <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 640, height }}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            barGap={CHART.gap}
            barCategoryGap={8}
          >
            <CartesianGrid horizontal={false} stroke={CHART.grid} strokeWidth={1} />
            <XAxis
              type="number"
              domain={[0, max]}
              ticks={ticks}
              tickFormatter={percentTick}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              height={X_AXIS_BAND}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={96}
              tick={CATEGORY_TICK}
              tickLine={false}
              axisLine={{ stroke: CHART.axis }}
              interval={0}
            />
            <Tooltip content={FieldTooltip} cursor={HOVER_CURSOR} isAnimationActive={false} />
            <Bar
              dataKey="fieldShare"
              name="Field share"
              fill={FIELD_FILL}
              barSize={BAR_SIZE}
              radius={[0, CHART.radius, CHART.radius, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="topCutShare"
              name="Top-cut share"
              fill={TOP_CUT_FILL}
              barSize={BAR_SIZE}
              radius={[0, CHART.radius, CHART.radius, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
