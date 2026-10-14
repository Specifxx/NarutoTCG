import { Menu, X } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

/** Top-level product areas of the platform. Each one is served by its own app (a Next.js "zone"). */
export type PlatformZone = "learn" | "events" | "cards" | "decks" | "simulator" | "compare";

export interface PlatformNavItem {
  zone: PlatformZone;
  label: string;
  path: string;
}

export const PLATFORM_NAV: readonly PlatformNavItem[] = [
  { zone: "learn", label: "Learn", path: "/learn" },
  { zone: "events", label: "Events", path: "/events" },
  { zone: "cards", label: "Cards", path: "/cards" },
  { zone: "decks", label: "Decks", path: "/decks" },
  { zone: "simulator", label: "Simulator", path: "/simulator" },
  { zone: "compare", label: "Compare", path: "/compare" },
];

/** Overrides for zones served from another origin, e.g. `{ learn: "http://localhost:3003" }` in local dev. */
export type ZoneUrls = Partial<Record<PlatformZone, string>>;

type LinkProps = { href: string; className?: string; children?: ReactNode; "aria-current"?: "page" };

export interface SiteHeaderProps {
  /** The zone rendering the header; its link is highlighted and uses `LinkComponent`. */
  active: PlatformZone;
  zoneUrls?: ZoneUrls;
  /** Client-side link (e.g. `next/link`) used for the active zone. Other zones are hard navigations. */
  LinkComponent?: ComponentType<LinkProps>;
  /** Optional right-aligned content such as a call-to-action button. */
  actions?: ReactNode;
}

export function zoneHref(item: PlatformNavItem, zoneUrls?: ZoneUrls) {
  return zoneUrls?.[item.zone] ?? item.path;
}

function ShurikenMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M16 1.5 19.2 12.8 30.5 16 19.2 19.2 16 30.5 12.8 19.2 1.5 16 12.8 12.8Z"
      />
      <circle cx="16" cy="16" r="3.2" className="fill-shadow-950" />
    </svg>
  );
}

export function SiteHeader({ active, zoneUrls, LinkComponent, actions }: SiteHeaderProps) {
  const renderLink = (item: PlatformNavItem, className: string) => {
    const isActive = item.zone === active;
    const classes = `${className} ${
      isActive ? "text-chakra-400" : "text-ash-400 hover:text-ash-200"
    }`;
    if (isActive && LinkComponent) {
      return (
        <LinkComponent key={item.zone} href={item.path} className={classes} aria-current="page">
          {item.label}
        </LinkComponent>
      );
    }
    return (
      <a
        key={item.zone}
        href={isActive ? item.path : zoneHref(item, zoneUrls)}
        className={classes}
        aria-current={isActive ? "page" : undefined}
      >
        {item.label}
      </a>
    );
  };

  const home = PLATFORM_NAV.find((item) => item.zone === active) ?? PLATFORM_NAV[0];

  return (
    <header className="sticky top-0 z-[1100] border-b border-shadow-700/80 bg-shadow-950/85 backdrop-blur supports-[backdrop-filter]:bg-shadow-950/70">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        {LinkComponent ? (
          <LinkComponent href={home.path} className="flex items-center gap-2 font-bold tracking-tight text-white">
            <ShurikenMark className="h-6 w-6 text-chakra-500" />
            <span>
              Naruto <span className="text-chakra-400">TCG</span>
            </span>
          </LinkComponent>
        ) : (
          <a href={home.path} className="flex items-center gap-2 font-bold tracking-tight text-white">
            <ShurikenMark className="h-6 w-6 text-chakra-500" />
            <span>
              Naruto <span className="text-chakra-400">TCG</span>
            </span>
          </a>
        )}

        <nav aria-label="Platform" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {PLATFORM_NAV.map((item) => (
              <li key={item.zone}>
                {renderLink(
                  item,
                  "relative rounded-md px-3 py-2 text-sm font-medium transition-colors aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:-bottom-[9px] aria-[current=page]:after:h-0.5 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-chakra-500",
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {actions}
          <details className="group relative md:hidden">
            <summary
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-shadow-700 text-ash-200 hover:border-chakra-500 [&::-webkit-details-marker]:hidden"
              aria-label="Open platform menu"
            >
              <Menu className="h-5 w-5 group-open:hidden" aria-hidden="true" />
              <X className="hidden h-5 w-5 group-open:block" aria-hidden="true" />
            </summary>
            <nav
              aria-label="Platform"
              className="absolute right-0 top-11 w-56 rounded-lg border border-shadow-700 bg-shadow-900 p-2 shadow-xl shadow-black/60"
            >
              <ul className="flex flex-col">
                {PLATFORM_NAV.map((item) => (
                  <li key={item.zone}>
                    {renderLink(item, "block rounded-md px-3 py-2 text-sm font-medium hover:bg-shadow-800")}
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
