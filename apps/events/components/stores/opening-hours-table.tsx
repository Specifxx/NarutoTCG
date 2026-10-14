"use client";

import { cx } from "@/lib/format";
import type { HoursRow } from "@/lib/store-hours";
import { getZonedParts } from "@/lib/time";
import { useNow } from "@/lib/use-now";

/**
 * Monday→Sunday hours with pre-formatted (server) windows. Today's row, judged
 * in the store's zone, is highlighted only after mount since it depends on the clock.
 */
export function OpeningHoursTable({
  rows,
  timeZone,
  caption,
  className,
}: {
  rows: HoursRow[];
  timeZone: string;
  /** Accessible caption, e.g. "Opening hours (PDT)". */
  caption: string;
  className?: string;
}) {
  const now = useNow(60_000);
  const today = now ? getZonedParts(now, timeZone).weekday : null;

  return (
    <table className={cx("w-full border-separate border-spacing-0 text-sm", className)}>
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {rows.map((row) => {
          const isToday = row.day === today;
          return (
            <tr key={row.day} aria-current={isToday ? "date" : undefined} className={cx(isToday && "bg-chakra-500/10")}>
              <th
                scope="row"
                className={cx(
                  "py-2 pl-3 pr-3 text-left align-top font-medium",
                  isToday ? "rounded-l-md text-white" : "text-ash-200",
                )}
              >
                <span className="flex items-center gap-2">
                  {row.label}
                  {isToday && (
                    <span className="rounded-full bg-chakra-500 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-shadow-950">
                      Today
                    </span>
                  )}
                </span>
              </th>
              <td
                className={cx(
                  "py-2 pl-2 pr-3 text-right align-top tabular-nums",
                  isToday && "rounded-r-md",
                  row.closed ? "text-ash-400" : isToday ? "text-white" : "text-ash-200",
                )}
              >
                {row.closed ? (
                  "Closed"
                ) : (
                  <span className="flex flex-col items-end gap-0.5">
                    {row.windows.map((w) => (
                      <span key={w} className="whitespace-nowrap">
                        {w}
                      </span>
                    ))}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
