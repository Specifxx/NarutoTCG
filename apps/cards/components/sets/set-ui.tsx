// Small server-safe presentation pieces shared by set pages, the spoiler
// center and the overview. Kept free of client imports so importing them
// never pulls collection-tracking JS into a page bundle.
import type { SetKind } from "@naruto-tcg/types";

/** Banner gradient per product kind (use with `bg-gradient-to-*`). */
export const KIND_BANNER: Record<SetKind, string> = {
  starter: "from-wind/25 via-water/10 to-transparent",
  booster: "from-chakra-500/30 via-blood-500/10 to-transparent",
  promo: "from-amber-400/25 via-fuchsia-500/10 to-transparent",
};

export function UpcomingBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-chakra-500/50 bg-chakra-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-chakra-400 ${className}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-chakra-400 motion-safe:animate-pulse" />
      Upcoming
    </span>
  );
}
