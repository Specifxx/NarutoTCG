"use client";

import { CalendarDays, Hourglass, Map as MapIcon, Plus, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/format";

const TABS = [
  { href: "/events", label: "Events", icon: CalendarDays, match: (p: string) => p === "/events" || (/^\/events\/[^/]+$/.test(p) && !["/events/map", "/events/submit"].includes(p)) },
  { href: "/events/map", label: "Map", icon: MapIcon, match: (p: string) => p === "/events/map" },
  { href: "/stores", label: "Stores", icon: Store, match: (p: string) => p === "/stores" || p.startsWith("/store/") },
  { href: "/countdowns", label: "Countdowns", icon: Hourglass, match: (p: string) => p === "/countdowns" },
] as const;

/** Secondary navigation for the events zone. */
export function EventsSubnav() {
  const pathname = usePathname() ?? "/events";
  const submitActive = pathname === "/events/submit";

  return (
    <div className="border-b border-shadow-700/80 bg-shadow-900/60">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 sm:px-6">
        <nav aria-label="Events" className="-mb-px flex min-w-0 flex-1 overflow-x-auto">
          <ul className="flex items-center sm:gap-1">
            {TABS.map(({ href, label, icon: Icon, match }) => {
              const active = match(pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex items-center gap-2 whitespace-nowrap border-b-2 px-2 py-3 text-sm font-medium transition-colors sm:px-3",
                      active
                        ? "border-chakra-500 text-white"
                        : "border-transparent text-ash-400 hover:border-shadow-500 hover:text-ash-200",
                    )}
                  >
                    <Icon className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <Link
          href="/events/submit"
          aria-current={submitActive ? "page" : undefined}
          className={cx(
            "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors sm:px-3",
            submitActive
              ? "bg-chakra-400 text-shadow-950"
              : "bg-chakra-500 text-shadow-950 hover:bg-chakra-400",
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Submit event</span>
        </Link>
      </div>
    </div>
  );
}
