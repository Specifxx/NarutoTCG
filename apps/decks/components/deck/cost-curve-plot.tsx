"use client";

import { Bar, BarChart, BarStack, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { CHART } from "@/components/charts/chart-theme";
import { ChartTooltipCard } from "@/components/charts/chart-tooltip";
import type { CostCurvePoint } from "@/lib/decks/deck-utils";
import { formatNumber, pluralize } from "@/lib/format";
import { COST_CURVE_HEIGHT, curveTotal, type CostCurveSeries } from "./cost-curve-series";

/** The cost-label band under the plot. */
const X_AXIS_BAND = 24;
const AXIS_TICK = { fill: CHART.tick, fontSize: CHART.fontSize } as const;
const HOVER_CURSOR = { fill: "rgba(255, 255, 255, 0.04)" } as const;

function CurveTooltip({ active, payload, series }: TooltipContentProps & { series: readonly CostCurveSeries[] }) {
  const point = payload?.[0]?.payload as CostCurvePoint | undefined;
  if (!active || !point) return null;
  return (
    <ChartTooltipCard
      title={`Cost ${point.cost}`}
      rows={[...series].reverse().map((s) => ({ key: s.key, label: s.label, value: formatNumber(point[s.key]), color: s.color }))}
      footer={pluralize(curveTotal(point, series), "card")}
    />
  );
}

/**
 * The Recharts plot of the cost curve. Its own module so the deck page can load Recharts lazily:
 * the frame, legend and table twin around it render without the chart library.
 */
export function CostCurvePlot({ curve, series }: { curve: CostCurvePoint[]; series: readonly CostCurveSeries[] }) {
  const peak = Math.max(0, ...curve.map((point) => curveTotal(point, series)));
  return (
    <ResponsiveContainer width="100%" height={COST_CURVE_HEIGHT} initialDimension={{ width: 640, height: COST_CURVE_HEIGHT }}>
      {/* One named image, not Recharts' unnamed role="application" tab stop: the Table view carries the values. */}
      <BarChart
        data={curve}
        accessibilityLayer={false}
        role="img"
        aria-label="Cost curve, stacked column chart. Switch to the Table view for exact counts."
        margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        barCategoryGap="18%"
      >
        <CartesianGrid vertical={false} stroke={CHART.grid} strokeWidth={1} />
        <XAxis dataKey="cost" height={X_AXIS_BAND} interval={0} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART.axis }} />
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
  );
}
