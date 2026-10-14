"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { ArchetypeReport } from "@/lib/deck/analytics";

export function ArchetypePanel({ report }: { report: ArchetypeReport }) {
  const top = report.ranked.slice(0, 4);
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <span className="panel-title">Archetype</span>
        <span className="flex items-center gap-1.5 text-[11px] text-ash-400">
          <span className="h-2 w-2 rounded-full" style={{ background: report.elementColor, boxShadow: `0 0 8px ${report.elementColor}` }} />
          {report.identity}
        </span>
      </div>
      {report.primary ? (
        <>
          <div className="mb-3 rounded-lg border border-chakra-500/25 bg-chakra-500/[0.06] px-3 py-2">
            <p className="flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wider text-chakra-300">
              <Sparkles className="h-3.5 w-3.5" /> {report.primary.name}
            </p>
            <p className="mt-0.5 text-xs text-ash-400">{report.primary.blurb}</p>
          </div>
          <ul className="space-y-1.5">
            {top.map((a, i) => (
              <li key={a.id} className="grid grid-cols-[112px_1fr_36px] items-center gap-2 text-[11px]" title={a.blurb}>
                <span className={i === 0 ? "text-ash-100" : "text-ash-400"}>{a.name}</span>
                <span className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.span
                    className="block h-full rounded-full"
                    style={{ background: "var(--color-series-1)", opacity: i === 0 ? 1 : 0.55 }}
                    initial={false}
                    animate={{ width: `${Math.max(2, a.share * 100)}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 26 }}
                  />
                </span>
                <span className="text-right font-display text-ash-300">{Math.round(a.share * 100)}%</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-xs text-ash-500">Add cards to classify the deck.</p>
      )}
    </section>
  );
}
