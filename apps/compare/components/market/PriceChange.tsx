import { cx } from "@naruto-tcg/ui";
import { formatPct, formatSignedUsd } from "@/lib/market/format";
import type { PriceChange as Change } from "@/lib/market/types";

/** Direction of a change after display rounding, so "+0.0%" never renders green. */
export function changeDirection(change: Change | null): "up" | "down" | "flat" | "none" {
  if (!change) return "none";
  const rounded = Math.round(change.pct * 10) / 10;
  return rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
}

const TONE = {
  up: "text-leaf-400",
  down: "text-blood-400",
  flat: "text-ash-400",
  none: "text-ash-400",
} as const;

const ARROW = { up: "▲", down: "▼", flat: "", none: "" } as const;
const SR = { up: "up", down: "down", flat: "unchanged", none: "no data" } as const;

/**
 * Percent change with an arrow and sign, so direction never relies on color alone.
 * `showAbs` appends the dollar delta.
 */
export function PriceChange({
  change,
  showAbs = false,
  className,
}: {
  change: Change | null;
  showAbs?: boolean;
  className?: string;
}) {
  const direction = changeDirection(change);
  return (
    <span className={cx("inline-flex items-baseline gap-1 tabular-nums whitespace-nowrap", TONE[direction], className)}>
      {ARROW[direction] && (
        <span aria-hidden className="text-[0.7em]">
          {ARROW[direction]}
        </span>
      )}
      <span className="sr-only">{SR[direction]}</span>
      <span>{change ? formatPct(change.pct) : "—"}</span>
      {showAbs && change && <span className="text-ash-400">({formatSignedUsd(change.abs)})</span>}
    </span>
  );
}
