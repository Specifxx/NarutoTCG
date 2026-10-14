import { formatMonthDay, pluralize, type RevealTimelineData } from "./reveals";

/** Anchor id of a reveal day in the feed. */
export function revealDayId(date: string): string {
  return `reveals-${date}`;
}

/**
 * Compact column chart of cards revealed per day. Single series, so no legend;
 * each column links to its day in the feed and carries an sr-only value, and
 * hover/focus shows a tooltip. Only the peak column is direct-labelled.
 */
export function RevealTimeline({ data, headingId }: { data: RevealTimelineData; headingId: string }) {
  const { days, total, peak, peakDate, trimmed } = data;
  const first = days[0];
  const last = days.at(-1);
  if (!first || !last || peak === 0) return null;
  const activeDays = days.filter((day) => day.count > 0).length;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border border-shadow-700 bg-shadow-900/80 p-4 shadow-lg shadow-black/20 sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 id={headingId} className="text-lg font-bold tracking-tight text-white">
            Reveal timeline
          </h2>
          <p className="mt-0.5 text-sm text-ash-400">
            Cards revealed per day{trimmed ? `, last ${days.length} days` : ""}
          </p>
        </div>
        <dl className="flex gap-5 text-sm sm:gap-8">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ash-400">Reveals</dt>
            <dd className="mt-0.5 text-xl font-bold text-white">{total.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ash-400">Reveal days</dt>
            <dd className="mt-0.5 text-xl font-bold text-white">{activeDays}</dd>
          </div>
          {peakDate && (
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ash-400">Busiest day</dt>
              <dd className="mt-0.5 text-xl font-bold text-white">
                <time dateTime={peakDate}>{formatMonthDay(peakDate)}</time>
                <span className="ml-1.5 text-sm font-medium text-ash-400">{pluralize(peak, "card")}</span>
              </dd>
            </div>
          )}
        </dl>
      </div>

      <ol aria-label="Cards revealed per day" className="mt-6 flex h-32 items-end gap-[2px] border-b border-shadow-700 pt-6">
        {days.map((day, i) => {
          if (day.count === 0) {
            return (
              <li key={day.date} aria-hidden="true" className="flex h-full flex-1 items-end justify-center">
                <span className="mb-1 h-1 w-1 rounded-full bg-shadow-700" />
              </li>
            );
          }
          const align =
            i < days.length / 3 ? "left-0" : i > (days.length * 2) / 3 ? "right-0" : "left-1/2 -translate-x-1/2";
          return (
            <li key={day.date} className="flex h-full min-w-0 flex-1 justify-center">
              <a
                href={`#${revealDayId(day.date)}`}
                className="group/bar relative block h-full w-full max-w-6 rounded-t-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
              >
                <span className="sr-only">
                  {formatMonthDay(day.date)}: {pluralize(day.count, "card")} revealed
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 rounded-t-[4px] bg-chakra-500 transition-colors group-hover/bar:bg-chakra-400 group-focus-visible/bar:bg-chakra-400"
                  style={{ height: `${Math.max(6, (day.count / peak) * 100)}%` }}
                >
                  {day.date === peakDate && (
                    <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[11px] font-semibold tabular-nums text-ash-200 transition-opacity group-hover/bar:opacity-0 group-focus-visible/bar:opacity-0">
                      {day.count}
                    </span>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md border border-shadow-500 bg-shadow-950 px-2 py-1 text-xs text-ash-200 opacity-0 shadow-lg shadow-black/50 transition-opacity group-hover/bar:opacity-100 group-focus-visible/bar:opacity-100 ${align}`}
                >
                  <span className="font-semibold text-white">{formatMonthDay(day.date)}</span> · {pluralize(day.count, "card")}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
      <div aria-hidden="true" className="mt-2 flex justify-between text-[11px] tabular-nums text-ash-400">
        <span>{formatMonthDay(first.date)}</span>
        <span>{formatMonthDay(last.date)}</span>
      </div>
    </section>
  );
}
