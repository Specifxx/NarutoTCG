import type { ReactNode } from "react";
import { ScrollFadeNav } from "./scroll-fade-nav";

// Each platform app is deployed separately, so cross-app links are absolute
// URLs. Literal `process.env.NEXT_PUBLIC_*` reads let Next.js inline them at
// build time; the defaults match the local dev ports in the root README.
export const PLATFORM_APPS = [
  { key: "learn", label: "Learn", href: process.env.NEXT_PUBLIC_LEARN_URL ?? "http://localhost:3003" },
  { key: "events", label: "Events", href: process.env.NEXT_PUBLIC_EVENTS_URL ?? "http://localhost:3005" },
  { key: "cards", label: "Cards", href: process.env.NEXT_PUBLIC_CARDS_URL ?? "http://localhost:3004" },
  { key: "decks", label: "Decks", href: process.env.NEXT_PUBLIC_DECKS_URL ?? "http://localhost:3001" },
  { key: "simulator", label: "Simulator", href: process.env.NEXT_PUBLIC_SIMULATOR_URL ?? "http://localhost:3000" },
  { key: "compare", label: "Compare", href: process.env.NEXT_PUBLIC_COMPARE_URL ?? "http://localhost:3002" },
] as const;

export type PlatformAppKey = (typeof PLATFORM_APPS)[number]["key"];

export function platformHref(key: PlatformAppKey): string {
  return PLATFORM_APPS.find((app) => app.key === key)?.href ?? "/";
}

/**
 * Sticky header shared by every app. `current` marks the active app and links
 * it to its own root; `children` renders an app-specific secondary nav row.
 */
export function SiteHeader({ current, children }: { current: PlatformAppKey; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-shadow-700 bg-shadow-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
        <a href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight text-white">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 text-chakra-500">
            <path
              fill="currentColor"
              d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3.2a6.8 6.8 0 0 1 6.6 5.1h-3.3a3.6 3.6 0 0 0-6.6 0H5.4A6.8 6.8 0 0 1 12 5.2Zm0 13.6a6.8 6.8 0 0 1-6.6-5.1h3.3a3.6 3.6 0 0 0 6.6 0h3.3a6.8 6.8 0 0 1-6.6 5.1Z"
            />
          </svg>
          <span className="sr-only sm:not-sr-only">Naruto TCG</span>
        </a>
        <ScrollFadeNav label="Platform" activeKey={current} className="-mx-2 min-w-0 flex-1">
          <ul className="flex items-center gap-1 px-2">
            {PLATFORM_APPS.map((app) => {
              const active = app.key === current;
              return (
                <li key={app.key}>
                  <a
                    href={active ? "/" : app.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "block whitespace-nowrap rounded-md bg-shadow-800 px-3 py-1.5 text-sm font-semibold text-chakra-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-chakra-400"
                        : "block whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-ash-400 transition hover:bg-shadow-800 hover:text-ash-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-chakra-400"
                    }
                  >
                    {app.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </ScrollFadeNav>
      </div>
      {children && <div className="border-t border-shadow-800">{children}</div>}
    </header>
  );
}
