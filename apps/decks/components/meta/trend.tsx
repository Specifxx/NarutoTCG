import { cx } from "@naruto-tcg/ui";
import { formatPointDelta } from "@/lib/format";
import type { ArchetypeTrend } from "@/lib/meta/stats";
import { TREND_EVENTS, trendDirection, type TrendDirection } from "./derive";

const SPOKEN: Record<TrendDirection, string> = { up: "Rising", down: "Falling", flat: "Steady" };

function TrendIcon({ direction, className }: { direction: TrendDirection; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={cx("h-3 w-3 shrink-0", className)}>
      {direction === "flat" ? (
        <path d="M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d={direction === "up" ? "M6 2 11 9H1Z" : "M6 10 1 3h10Z"} fill="currentColor" />
      )}
    </svg>
  );
}

/** Meta share change, latest events vs the window before: an up/down/flat icon plus signed points. */
export function TrendValue({ trend }: { trend: ArchetypeTrend | undefined }) {
  if (!trend) {
    return (
      <span className="text-ash-500" title={`Needs at least ${2 * TREND_EVENTS} events in the selection`}>
        —<span className="sr-only"> no trend yet</span>
      </span>
    );
  }
  const direction = trendDirection(trend.delta);
  return (
    <span
      className="inline-flex items-center gap-1 tabular-nums"
      title={`Meta share over the latest ${TREND_EVENTS} events vs the ${TREND_EVENTS} before them`}
    >
      <TrendIcon direction={direction} className={direction === "flat" ? "text-ash-500" : "text-ash-300"} />
      <span className="sr-only">{SPOKEN[direction]}: </span>
      {formatPointDelta(trend.delta)}
    </span>
  );
}
