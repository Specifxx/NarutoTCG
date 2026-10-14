import { cx } from "@/lib/format";

/**
 * Registered-vs-capacity counter with a progress bar. Uncapped events show the
 * registered count only.
 */
export function CapacityMeter({
  registered,
  capacity,
  size = "md",
  className,
}: {
  registered: number;
  capacity: number | null;
  size?: "sm" | "md";
  className?: string;
}) {
  if (capacity === null) {
    return (
      <p className={cx("text-ash-400", size === "sm" ? "text-xs" : "text-sm", className)}>
        <span className="font-semibold text-ash-200 tabular-nums">{registered.toLocaleString("en-US")}</span> registered ·
        open entry
      </p>
    );
  }

  const ratio = capacity > 0 ? Math.min(1, registered / capacity) : 1;
  const left = Math.max(0, capacity - registered);
  const full = left === 0;
  const almostFull = !full && ratio >= 0.85;
  const label = full ? "Full — waitlist" : almostFull ? `Only ${left} left` : `${left} spots left`;

  return (
    <div className={cx("min-w-0", className)}>
      <div className={cx("flex items-baseline justify-between gap-2", size === "sm" ? "text-xs" : "text-sm")}>
        <span className="text-ash-400">
          <span className="font-semibold text-ash-200 tabular-nums">{registered.toLocaleString("en-US")}</span>
          <span className="tabular-nums"> / {capacity.toLocaleString("en-US")}</span> registered
        </span>
        <span className={cx("font-medium", full ? "text-rose-300" : almostFull ? "text-amber-300" : "text-emerald-300")}>
          {label}
        </span>
      </div>
      <div
        className={cx("mt-1.5 overflow-hidden rounded-full bg-shadow-700", size === "sm" ? "h-1" : "h-1.5")}
        role="progressbar"
        aria-label="Registration capacity"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={Math.min(registered, capacity)}
        aria-valuetext={`${registered} of ${capacity} spots taken`}
      >
        <div
          className={cx(
            "h-full rounded-full",
            full ? "bg-rose-500" : almostFull ? "bg-amber-400" : "bg-gradient-to-r from-chakra-600 to-chakra-400",
          )}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
