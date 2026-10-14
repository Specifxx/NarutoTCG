import type { EventStatus } from "@naruto-tcg/types";
import { Ban, CirclePause } from "lucide-react";
import { cx } from "@/lib/format";

/** Prominent notice for cancelled or postponed events; renders nothing otherwise. */
export function StatusBanner({ status, organizerName }: { status: EventStatus; organizerName: string }) {
  if (status === "scheduled") return null;
  const cancelled = status === "cancelled";
  const Icon = cancelled ? Ban : CirclePause;

  return (
    <div
      className={cx(
        "mb-4 flex gap-3 rounded-xl border p-4",
        cancelled ? "border-blood-500/60 bg-blood-500/10" : "border-amber-400/50 bg-amber-500/10",
      )}
    >
      <Icon className={cx("mt-0.5 h-5 w-5 shrink-0", cancelled ? "text-rose-300" : "text-amber-300")} aria-hidden="true" />
      <div>
        <p className="font-semibold text-white">
          {cancelled ? "This event has been cancelled" : "This event has been postponed"}
        </p>
        <p className="mt-0.5 text-sm text-ash-200">
          {cancelled
            ? `Registration is closed. Contact ${organizerName} about refunds or alternative dates.`
            : `${organizerName} is rescheduling. The date below is the original one — check back for the new date before you travel.`}
        </p>
      </div>
    </div>
  );
}
