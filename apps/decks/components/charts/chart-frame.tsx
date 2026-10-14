"use client";

import { cx } from "@naruto-tcg/ui";
import { useId, useState, type ReactNode } from "react";
import { ChartLegend, type LegendItem } from "./legend";

/**
 * Card wrapper every chart sits in: title, legend, and a Chart/Table toggle so each value
 * is reachable without hovering (the table is the accessible twin of the chart).
 */
export function ChartFrame({
  title,
  description,
  legend,
  table,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  legend?: LegendItem[];
  table: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const id = useId();
  return (
    <figure
      aria-labelledby={`${id}-title`}
      className={cx("flex min-w-0 flex-col gap-3 rounded-lg border border-shadow-700 bg-shadow-900 p-4", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <figcaption>
          <div id={`${id}-title`} className="font-semibold text-white">
            {title}
          </div>
          {description && <div className="mt-0.5 text-xs text-ash-400">{description}</div>}
        </figcaption>
        <div role="group" aria-label="View" className="flex rounded-md border border-shadow-600 p-0.5 text-xs">
          {(["chart", "table"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className={cx(
                "rounded px-2 py-1 font-medium capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
                view === option ? "bg-shadow-700 text-white" : "text-ash-400 hover:text-white",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {legend && legend.length > 1 && view === "chart" && <ChartLegend items={legend} />}
      <div className="relative min-w-0 overflow-hidden">{view === "chart" ? children : <div className="relative max-h-96 overflow-auto">{table}</div>}</div>
    </figure>
  );
}
