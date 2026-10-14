"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { CostCurve, CurveBucket } from "@/lib/deck/analytics";

export const SERIES = [
  { key: "character", label: "Characters", color: "var(--color-series-1)" },
  { key: "jutsu", label: "Jutsu", color: "var(--color-series-2)" },
  { key: "item", label: "Items", color: "var(--color-series-3)" },
] as const;

const HEIGHT = 128;

/** Stacked Chakra-cost histogram of the main deck. */
export function CostCurveChart({ curve }: { curve: CostCurve }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(4, curve.peak);
  const hovered: CurveBucket | null = hover === null ? null : curve.buckets[hover];

  return (
    <figure>
      <figcaption className="mb-2 flex items-center justify-between gap-2">
        <span className="panel-title">Chakra curve</span>
        <span className="text-[11px] text-ash-400">
          avg <span className="font-display font-semibold text-ash-100">{curve.average.toFixed(2)}</span>
          <button type="button" onClick={() => setTable((t) => !t)} className="ml-3 text-ash-500 underline-offset-2 hover:text-ash-200 hover:underline">
            {table ? "Chart" : "Table"}
          </button>
        </span>
      </figcaption>

      {table ? (
        <table className="w-full text-left text-[11px]">
          <thead className="text-ash-500">
            <tr>
              <th className="py-1 font-medium">Cost</th>
              {SERIES.map((s) => (
                <th key={s.key} className="py-1 font-medium">
                  {s.label}
                </th>
              ))}
              <th className="py-1 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="text-ash-200">
            {curve.buckets.map((b) => (
              <tr key={b.cost} className="border-t border-white/5">
                <td className="py-1 font-display">{b.label}</td>
                <td>{b.character}</td>
                <td>{b.jutsu}</td>
                <td>{b.item}</td>
                <td className="font-semibold">{b.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          <div className="relative flex items-end gap-1.5 border-b border-white/10" style={{ height: HEIGHT }} onPointerLeave={() => setHover(null)}>
            {[0.5, 1].map((f) => (
              <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/[0.05]" style={{ bottom: HEIGHT * f }}>
                <span className="absolute -top-2 right-0 text-[9px] text-ash-500">{Math.round(max * f)}</span>
              </div>
            ))}
            {curve.buckets.map((b, i) => (
              <div
                key={b.cost}
                className="relative flex h-full flex-1 flex-col justify-end"
                onPointerEnter={() => setHover(i)}
                role="img"
                aria-label={`Cost ${b.label}: ${b.total} cards`}
              >
                {b.total > 0 && (
                  <span className="mb-1 text-center font-display text-[10px] font-semibold text-ash-300">{b.total}</span>
                )}
                <div className="flex flex-col-reverse gap-[2px]">
                  {SERIES.map((s, si) => {
                    const v = b[s.key];
                    if (!v) return null;
                    const isTop = SERIES.slice(si + 1).every((t) => !b[t.key]);
                    return (
                      <motion.div
                        key={s.key}
                        initial={false}
                        animate={{ height: (v / max) * (HEIGHT - 18) }}
                        transition={{ type: "spring", stiffness: 260, damping: 28 }}
                        style={{
                          background: s.color,
                          opacity: hover === null || hover === i ? 1 : 0.45,
                          borderRadius: isTop ? "4px 4px 0 0" : 0,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1.5">
            {curve.buckets.map((b) => (
              <span key={b.cost} className="flex-1 text-center font-display text-[10px] text-ash-500">
                {b.label}
              </span>
            ))}
          </div>
          {hovered && hovered.total > 0 && (
            <div
              className="pointer-events-none absolute -top-2 z-10 rounded-md border border-white/10 bg-shadow-850 px-2.5 py-1.5 text-[11px] shadow-xl"
              style={{ left: `${((hover! + 0.5) / curve.buckets.length) * 100}%`, transform: "translate(-50%, -100%)" }}
            >
              <p className="font-display font-semibold text-ash-50">Cost {hovered.label}</p>
              {SERIES.map((s) =>
                hovered[s.key] ? (
                  <p key={s.key} className="flex items-center gap-1.5 text-ash-300">
                    <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                    {s.label} <span className="ml-auto pl-3 text-ash-100">{hovered[s.key]}</span>
                  </p>
                ) : null,
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-ash-400">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
