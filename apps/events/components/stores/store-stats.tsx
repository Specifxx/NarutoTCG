import { BadgeCheck, CalendarDays, Earth, Store as StoreIcon, type LucideIcon } from "lucide-react";
import { cx } from "@/lib/format";

export interface StoreStat {
  label: string;
  value: number;
  icon: "stores" | "countries" | "verified" | "events";
}

const ICONS: Record<StoreStat["icon"], LucideIcon> = {
  stores: StoreIcon,
  countries: Earth,
  verified: BadgeCheck,
  events: CalendarDays,
};

/** Headline numbers for the store locator. */
export function StoreStats({ stats, className }: { stats: StoreStat[]; className?: string }) {
  return (
    <ul aria-label="Directory at a glance" className={cx("grid grid-cols-2 gap-3 md:grid-cols-4", className)}>
      {stats.map(({ label, value, icon }) => {
        const Icon = ICONS[icon];
        return (
          <li
            key={label}
            className="flex items-center gap-3 rounded-xl border border-shadow-700 bg-shadow-900/80 px-4 py-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-chakra-500/10 text-chakra-400">
              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <p className="flex min-w-0 flex-col">
              <span className="text-xl font-bold leading-tight text-white tabular-nums">
                {value.toLocaleString("en-US")}
              </span>
              <span className="truncate text-xs text-ash-400">{label}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
