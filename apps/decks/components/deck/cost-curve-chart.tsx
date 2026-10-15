"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ChartFrame } from "@/components/charts/chart-frame";
import { DataTable, THead, Td, Th, Tr } from "@/components/ui/table";
import type { CostCurvePoint } from "@/lib/decks/deck-utils";
import { COST_CURVE_HEIGHT, COST_CURVE_SERIES, curveTotal } from "./cost-curve-series";

/**
 * Recharts is only needed for this one plot on the deck page, so it loads on its own after
 * hydration. The placeholder holds the plot's exact height (the server rendered an empty box of
 * that height before too), so nothing shifts when it arrives.
 */
const CostCurvePlot = dynamic(() => import("./cost-curve-plot").then((m) => m.CostCurvePlot), {
  ssr: false,
  loading: () => <div aria-hidden="true" style={{ height: COST_CURVE_HEIGHT }} />,
});

/** Copies per cost, stacked by card type, with a table twin. */
export function CostCurveChart({ curve }: { curve: CostCurvePoint[] }) {
  // "Other" only appears when the list has such cards; the three type series always show.
  const series = useMemo(() => COST_CURVE_SERIES.filter((s) => s.key !== "other" || curve.some((point) => point.other > 0)), [curve]);

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
                  {curveTotal(point, series)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      }
    >
      <CostCurvePlot curve={curve} series={series} />
    </ChartFrame>
  );
}
