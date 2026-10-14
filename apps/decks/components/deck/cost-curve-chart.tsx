"use client";

import { useMemo } from "react";
import { Bar, BarChart, BarStack, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { ChartFrame } from "@/components/charts/chart-frame";
import { CHART } from "@/components/charts/chart-theme";
import { ChartTooltipCard } from "@/components/charts/chart-tooltip";
import { DataTable, THead, Td, Th, Tr } from "@/components/ui/table";
import { CHART_COLORS, OTHER_COLOR } from "@/lib/data/archetypes";
import type { CostCurvePoint, DeckSectionKey } from "@/lib/decks/deck-utils";
import { formatNumber, pluralize } from "@/lib/format";

/** Plot plus the cost-label band. */
const HEIGHT = 228;
const X_AXIS_BAND = 24;
const AXIS_TICK = { fill: CHART.tick, fontSize: CHART.fontSize } as const;
const HOVER_CURSOR = { fill: "rgba(255, 255, 255, 0.04)" } as const;

interface Series {
  key: DeckSectionKey;
  label: string;
  color: string;
}

/** Card-type series (not archetypes): fixed colors, stacked bottom to top in this order. */
const TYPE_SERIES: readonly Series[] = [
  { key: "character", label: "Characters", color: CHART_COLORS[0] },
  { key: "jutsu", label: "Jutsus", color: CHART_COLORS[1] },
  { key: "mission", label: "Missions", color: CHART_COLORS[2] },
  { key: "other", label: "Other", color: OTHER_COLOR },
];

const total = (point: CostCurvePoint, series: readonly Series[]) => series.reduce((sum, s) => sum + point[s.key], 0);

function CurveTooltip({ active, payload, series }: TooltipContentProps & { series: readonly Series[] }) {
  const point = payload?.[0]?.payload as CostCurvePoint | undefined;
  if (!active || !point) return null;
  return (
    <ChartTooltipCard
      title={`Cost ${point.cost}`}
      rows={[...series].reverse().map((s) => ({ key: s.key, label: s.label, value: formatNumber(point[s.key]), color: s.color }))}
      footer={pluralize(total(point, series), "card")}
    />
  );
}

/** Copies per cost, stacked by card type, with a table twin. */
export function CostCurveChart({ curve }: { curve: CostCurvePoint[] }) {
  // "Other" only appears when the list has such cards; the three type series always show.
  const series = useMemo(() => TYPE_SERIES.filter((s) => s.key !== "other" || curve.some((point) => point.other > 0)), [curve]);
  const peak = Math.max(0, ...curve.map((point) => total(point, series)));

  return (
    <ChartFrame
      title="Cost curve"
      description="Main-deck copies at each cost, stacked by card type."
      legend={series.map((s) => ({ id: s.key, label: s.label, color: s.color }))}
      table={
        <DataTable>
          <caption className="sr-only">Main-deck copies at each cost by card type</caption>
          <THead>
            <tr>
              <Th>Cost</Th>
              {series.map((s) => (
                <Th key={s.key} numeric>
                  {s.label}
                </Th>
              ))}
              <Th numeric>Total</Th>
            </tr>
          </THead>
          <tbody>
            {curve.map((point) => (
              <Tr key={point.cost}>
                <th scope="row" className="px-3 py-2 text-left font-medium text-ash-100">
                  {point.cost}
                </th>
                {series.map((s) => (
                  <Td key={s.key} numeric>
                    {point[s.key]}
                  </Td>
                ))}
                <Td numeric className="font-semibold text-white">
                  {total(point, series)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      }
    >
      <ResponsiveContainer width="100%" height={HEIGHT} initialDimension={{ width: 640, height: HEIGHT }}>
        <BarChart data={curve} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="18%">
          <CartesianGrid vertical={false} stroke={CHART.grid} strokeWidth={1} />
          <XAxis
            dataKey="cost"
            height={X_AXIS_BAND}
            interval={0}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: CHART.axis }}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, Math.max(4, Math.ceil(peak / 4) * 4)]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip content={(props) => <CurveTooltip {...props} series={series} />} cursor={HOVER_CURSOR} isAnimationActive={false} />
          <BarStack radius={[CHART.radius, CHART.radius, 0, 0]}>
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
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
    </ChartFrame>
  );
}
