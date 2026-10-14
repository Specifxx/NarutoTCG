"use client";

import { useMemo } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipContentProps } from "recharts";
import { ChartFrame } from "@/components/charts/chart-frame";
import { CHART, seriesColor, seriesLabel } from "@/components/charts/chart-theme";
import { ChartTooltipCard } from "@/components/charts/chart-tooltip";
import { formatNumber, formatPercent, pluralize } from "@/lib/format";
import { OTHER_SERIES_ID, type OverallShareRow } from "@/lib/meta/share";
import { sliceDonut } from "./derive";

const HEIGHT = 240;

type Slice = OverallShareRow & { fill: string };

function DonutTooltip({ active, payload }: TooltipContentProps) {
  const slice = payload?.[0]?.payload as Slice | undefined;
  if (!active || !slice) return null;
  return (
    <ChartTooltipCard
      title={slice.label}
      rows={[
        { key: "share", label: "of players", value: formatPercent(slice.share), color: slice.fill },
        { key: "entries", label: slice.entries === 1 ? "entry" : "entries", value: formatNumber(slice.entries) },
      ]}
    />
  );
}

/** Part-to-whole meta share: the five largest archetypes plus "Other" (at most six slices). */
export function MetaShareDonut({ rows, totalPlayers }: { rows: OverallShareRow[]; totalPlayers: number }) {
  const { slices, folded } = useMemo(() => {
    const result = sliceDonut(rows);
    return { slices: result.slices.map((s): Slice => ({ ...s, fill: seriesColor(s.seriesId) })), folded: result.folded };
  }, [rows]);
  const hasOther = slices.some((s) => s.seriesId === OTHER_SERIES_ID);
  const foldedNote = !hasOther
    ? ""
    : folded.length > 0
      ? ` Other folds ${folded.map(seriesLabel).join(", ")} and every archetype without a chart color (rogue included).`
      : " Other folds every archetype without a chart color (rogue included).";

  return (
    <ChartFrame
      title="Meta share"
      description={`Share of ${pluralize(totalPlayers, "player")}.${foldedNote}`}
      legend={slices.map((s) => ({ id: s.seriesId, label: `${s.label} ${formatPercent(s.share)}`, color: s.fill }))}
      table={
        <table className="w-full text-sm">
          <caption className="sr-only">Meta share by archetype</caption>
          <thead className="text-left text-xs uppercase tracking-wide text-ash-400">
            <tr>
              <th scope="col" className="py-1.5 pr-3 font-semibold">
                Archetype
              </th>
              <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
                Entries
              </th>
              <th scope="col" className="py-1.5 text-right font-semibold">
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {slices.map((s) => (
              <tr key={s.seriesId} className="border-t border-shadow-700">
                <th scope="row" className="py-1.5 pr-3 text-left font-normal text-ash-100">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: s.fill }} />
                    {s.label}
                  </span>
                </th>
                <td className="py-1.5 pr-3 text-right tabular-nums">{formatNumber(s.entries)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatPercent(s.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="relative overflow-hidden">
        <ResponsiveContainer width="100%" height={HEIGHT} initialDimension={{ width: 640, height: HEIGHT }}>
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={slices}
              dataKey="entries"
              nameKey="label"
              innerRadius="62%"
              outerRadius="96%"
              startAngle={90}
              endAngle={-270}
              stroke={CHART.surface}
              strokeWidth={CHART.gap}
              isAnimationActive={false}
            />
            <Tooltip content={DonutTooltip} isAnimationActive={false} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          <span className="text-2xl font-semibold text-white">{formatNumber(totalPlayers)}</span>
          <span className="text-xs text-ash-400">players</span>
        </div>
      </div>
    </ChartFrame>
  );
}
