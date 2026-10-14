"use client";

import { CircleCheck, Clock } from "lucide-react";
import { cx } from "@/lib/format";
import { useCountdown, type CountdownTiming } from "./use-countdown";

const pill = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

/** "Upcoming" / "Live now" / "Ended" pill; a neutral skeleton until mounted. */
export function CountdownStatusPill({ timing, className }: { timing: CountdownTiming; className?: string }) {
  const countdown = useCountdown(timing);

  if (!countdown) {
    return <span aria-hidden="true" className={cx("inline-block h-[1.375rem] w-24 animate-pulse rounded-full bg-shadow-700/70", className)} />;
  }

  if (countdown.state === "live") {
    return (
      <span className={cx(pill, "border-emerald-400/50 bg-emerald-500/10 text-emerald-300", className)}>
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Live now
      </span>
    );
  }

  if (countdown.state === "ended") {
    return (
      <span className={cx(pill, "border-shadow-500/60 bg-shadow-800 text-ash-400", className)}>
        <CircleCheck className="h-3 w-3" aria-hidden="true" />
        Ended
      </span>
    );
  }

  return (
    <span className={cx(pill, "border-chakra-500/40 bg-chakra-500/10 text-chakra-400", className)}>
      <Clock className="h-3 w-3" aria-hidden="true" />
      Upcoming
    </span>
  );
}

/**
 * How much of the wait between announcement and start has passed. Ticks with the
 * timer so the caption flips to "Happening now" at the same moment as the pill.
 */
export function CountdownProgress({
  timing,
  announced,
  className,
}: {
  timing: CountdownTiming;
  /** Pre-formatted announcement date, e.g. "Jun 15, 2026". */
  announced: string;
  className?: string;
}) {
  const countdown = useCountdown(timing);
  const percent = countdown ? Math.floor(countdown.progress * 100) : 0;
  const live = countdown?.state === "live";

  let caption: string | null = null;
  if (countdown) {
    caption =
      countdown.state === "upcoming" ? `${percent}% of the wait done` : live ? "Happening now" : "Wrapped up";
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs leading-4">
        {caption ? (
          <span className="font-medium tabular-nums text-ash-200">{caption}</span>
        ) : (
          <span aria-hidden="true" className="inline-block h-4 w-28 animate-pulse rounded bg-shadow-700/70" />
        )}
        <span className="text-ash-400">Announced {announced}</span>
      </div>
      <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-shadow-700">
        <div
          className={cx(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            live ? "bg-emerald-400" : "bg-linear-to-r from-chakra-600 to-chakra-400",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
