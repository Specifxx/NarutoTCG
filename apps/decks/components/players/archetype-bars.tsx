import { ArchetypeBadge } from "@/components/ui/badges";
import { archetypeColor } from "@/lib/data/archetypes";
import { formatPercent } from "@/lib/format";
import type { ArchetypeRow } from "./profile";

/**
 * Compact bar list of archetypes played. Numbers are printed in ink; the bar (archetype color,
 * square at the baseline, rounded at the data end) only carries magnitude and identity.
 */
export function ArchetypeBars({ rows }: { rows: ArchetypeRow[] }) {
  return (
    <ul className="flex flex-col gap-3 rounded-lg border border-shadow-700 bg-shadow-900 p-4">
      {rows.map((row) => (
        <li key={row.archetypeId} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <ArchetypeBadge archetypeId={row.archetypeId} href />
            <span className="shrink-0 text-sm tabular-nums">
              <span className="font-semibold text-white">{row.count}</span>
              <span className="sr-only"> {row.count === 1 ? "event" : "events"},</span>
              <span className="text-ash-400"> · {formatPercent(row.share, 0)}</span>
            </span>
          </div>
          <div aria-hidden="true" className="h-2 bg-shadow-800">
            <div className="h-full rounded-r" style={{ width: `${Math.max(row.scale * 100, 2)}%`, backgroundColor: archetypeColor(row.archetypeId) }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
