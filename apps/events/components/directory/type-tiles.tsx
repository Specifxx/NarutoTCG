import type { EventType } from "@naruto-tcg/types";
import { EVENT_TYPES } from "@/lib/event-meta";
import { cx } from "@/lib/format";
import { TypeTileLink } from "./type-tile-link";

/**
 * "Browse by type" quick filters (see `TypeTileLink`). Swipeable row on small
 * screens, five columns on desktop. Server component; counts match what each
 * tile's filter lists (upcoming events of that type, cancelled ones included).
 */
export function TypeTiles({ counts }: { counts: Record<EventType, number> }) {
  return (
    <section aria-labelledby="browse-by-type" className="mt-8">
      <h2 id="browse-by-type" className="text-xs font-semibold uppercase tracking-[0.14em] text-ash-400">
        Browse by type
      </h2>
      <ul className="relative -mx-4 mt-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:thin] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {EVENT_TYPES.map((meta) => {
          const Icon = meta.icon;
          const count = counts[meta.type];
          return (
            <li key={meta.type} className="w-60 shrink-0 snap-start lg:w-auto">
              <TypeTileLink
                type={meta.type}
                className={cx(
                  "group relative grid h-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 overflow-hidden rounded-xl border border-shadow-700 bg-shadow-900/80 p-3.5 transition-colors hover:bg-shadow-800/80",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
                )}
              >
                {/* Type-coloured top edge. */}
                <span
                  className={cx("absolute inset-x-0 top-0 h-0.5 opacity-70 group-hover:opacity-100", meta.classes.dot)}
                  aria-hidden="true"
                />
                {/* DOM order is label → count → description for screen readers; the grid places them visually. */}
                <span className={cx("col-start-2 row-start-1 text-sm font-semibold leading-snug", meta.classes.text)}>
                  {meta.label}
                </span>
                <span className="col-start-3 row-start-1 text-right leading-tight">
                  <span className="block text-lg font-bold text-white tabular-nums">
                    {count.toLocaleString("en-US")}
                  </span>
                  <span className="block text-[11px] text-ash-400">upcoming</span>
                </span>
                <span className="col-span-3 row-start-2 mt-2.5 line-clamp-3 text-xs leading-relaxed text-ash-400">
                  {meta.description}
                </span>
                <span
                  className={cx(
                    "col-start-1 row-start-1 flex h-9 w-9 items-center justify-center rounded-lg border transition-transform group-hover:scale-105",
                    meta.classes.border,
                    meta.classes.bg,
                    meta.classes.text,
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
              </TypeTileLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
