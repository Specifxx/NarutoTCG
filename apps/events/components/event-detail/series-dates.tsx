import { Repeat } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/page-header";
import type { EventSummary } from "@/lib/event-summary";
import { cx, pluralize } from "@/lib/format";

const MAX_DATES = 8;

/** Upcoming sibling occurrences of a weekly series, as date chips. */
export function SeriesDates({
  siblings,
  weekday,
  timeRange,
  storeSlug,
}: {
  /** Upcoming occurrences excluding the current one, soonest first. */
  siblings: EventSummary[];
  /** "Thursday". */
  weekday: string;
  timeRange: string;
  storeSlug?: string;
}) {
  if (siblings.length === 0) return null;
  const shown = siblings.slice(0, MAX_DATES);

  return (
    <section aria-labelledby="series-heading">
      <SectionHeading
        id="series-heading"
        title="Other dates in this series"
        description={
          <span className="inline-flex items-center gap-1.5">
            <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
            Every {weekday} · {timeRange}
          </span>
        }
      />
      <ul className="mt-4 flex flex-wrap gap-2">
        {shown.map((s) => {
          const cancelled = s.status === "cancelled";
          return (
            <li key={s.id}>
              <Link
                href={`/events/${s.id}`}
                className={cx(
                  "inline-flex items-baseline gap-1.5 rounded-full border border-shadow-700 bg-shadow-900 px-3.5 py-1.5 text-sm transition-colors hover:border-chakra-500/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
                  cancelled ? "text-ash-400" : "text-ash-200",
                )}
              >
                <span aria-hidden="true" className="text-xs font-semibold uppercase text-ash-400">
                  {s.display.weekday}
                </span>
                <span
                  aria-hidden="true"
                  className={cx("font-medium tabular-nums", cancelled && "line-through decoration-rose-400/70")}
                >
                  {s.display.month} {s.display.day}
                </span>
                <span className="sr-only">{s.display.date}</span>
                {cancelled && <span className="text-xs text-rose-300">Cancelled</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      {(siblings.length > shown.length || storeSlug) && (
        <p className="mt-3 text-sm text-ash-400">
          {siblings.length > shown.length && <>Showing the next {shown.length} of {pluralize(siblings.length, "upcoming date")}. </>}
          {storeSlug && (
            <Link href={`/store/${storeSlug}`} className="font-medium text-chakra-400 hover:text-chakra-500">
              See the store&apos;s full schedule
            </Link>
          )}
        </p>
      )}
    </section>
  );
}
