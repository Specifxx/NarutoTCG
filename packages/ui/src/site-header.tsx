import type { ReactNode } from "react";

export type SiteAppId = "simulator" | "decks" | "compare" | "learn" | "events";

export interface SiteApp {
  id: SiteAppId;
  label: string;
  blurb: string;
  /** Public env var that overrides the app's URL at build time. */
  envKey: string;
  /** Local dev URL used when the env var is not set. */
  fallback: string;
}

export const SITE_APPS: readonly SiteApp[] = [
  {
    id: "simulator",
    label: "Simulator",
    blurb: "Play-test matches",
    envKey: "NEXT_PUBLIC_SIMULATOR_URL",
    fallback: "http://localhost:3000",
  },
  {
    id: "decks",
    label: "Decks",
    blurb: "Build and share decks",
    envKey: "NEXT_PUBLIC_DECKS_URL",
    fallback: "http://localhost:3001",
  },
  {
    id: "compare",
    label: "Compare",
    blurb: "Compare card prices",
    envKey: "NEXT_PUBLIC_COMPARE_URL",
    fallback: "http://localhost:3002",
  },
  {
    id: "events",
    label: "Events",
    blurb: "Events and local stores",
    envKey: "NEXT_PUBLIC_EVENTS_URL",
    fallback: "http://localhost:3004",
  },
  {
    id: "learn",
    label: "Learn",
    blurb: "Rules, puzzles and keywords",
    envKey: "NEXT_PUBLIC_LEARN_URL",
    fallback: "http://localhost:3003/learn",
  },
];

export type SiteUrls = Record<SiteAppId, string>;

/**
 * Resolves each app's absolute URL. Pass `process.env` from a server component
 * (e.g. a root layout) so deployments can point the header at their own hosts.
 */
export function resolveSiteUrls(env: Readonly<Record<string, string | undefined>> = {}): SiteUrls {
  const urls = {} as SiteUrls;
  for (const app of SITE_APPS) urls[app.id] = env[app.envKey]?.trim() || app.fallback;
  return urls;
}

/**
 * Apps to show in the header. In development every app is listed (local ports).
 * In production only apps whose URL env var is set are listed, plus the current
 * one, so a single-app deployment doesn't link to apps that aren't live.
 */
export function visibleSiteApps(
  current: SiteAppId,
  env: Readonly<Record<string, string | undefined>> = {},
): SiteAppId[] {
  if (env.NODE_ENV !== "production") return SITE_APPS.map((a) => a.id);
  return SITE_APPS.filter((a) => a.id === current || Boolean(env[a.envKey]?.trim())).map((a) => a.id);
}

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

function AppIcon({ id }: { id: SiteAppId }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (id) {
    case "simulator":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="7" height="10" rx="1.5" transform="rotate(-8 6.5 10)" />
          <rect x="13" y="7" width="7" height="10" rx="1.5" transform="rotate(8 16.5 12)" />
          <path d="M9 20h6" />
        </svg>
      );
    case "decks":
      return (
        <svg {...common}>
          <rect x="6" y="3" width="12" height="16" rx="2" />
          <path d="M4 7v12a2 2 0 0 0 2 2h10" />
          <path d="M12 8l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" />
        </svg>
      );
    case "compare":
      return (
        <svg {...common}>
          <path d="M4 19V9" />
          <path d="M10 19V5" />
          <path d="M16 19v-7" />
          <path d="M22 19H2" />
        </svg>
      );
    case "events":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
          <path d="M8 14h3v3H8z" />
        </svg>
      );
    case "learn":
      return (
        <svg {...common}>
          <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
          <path d="M5 17a3 3 0 0 1 3-3h11" />
          <path d="M9 8h6" />
        </svg>
      );
  }
}

function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="ntcg-brand-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb36b" />
          <stop offset="0.55" stopColor="#f25c00" />
          <stop offset="1" stopColor="#c0182d" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14.5" fill="#0d0d14" stroke="url(#ntcg-brand-grad)" strokeWidth="2" />
      <path
        d="M16 16m-1.2 0a1.2 1.2 0 1 1 2.4 0a2.6 2.6 0 1 1-5.2 0a4 4 0 1 1 8 0a5.4 5.4 0 1 1-10.8 0a6.8 6.8 0 1 1 13.6 0"
        fill="none"
        stroke="url(#ntcg-brand-grad)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface SiteHeaderProps {
  /** The app rendering the header; its link is marked as current. */
  current: SiteAppId;
  /** Absolute URLs for each app. Defaults to the local dev ports. */
  urls?: Partial<SiteUrls>;
  /** Apps to list (see visibleSiteApps). Defaults to all. The menu hides when only the current app is left. */
  apps?: readonly SiteAppId[];
  /** Optional app-specific secondary navigation rendered under the main bar. */
  children?: ReactNode;
}

/**
 * Shared top navigation for every app in the platform. Apps are separate Next.js
 * zones, so cross-app links are plain anchors (full navigations), not client links.
 * Uses no hooks, so it renders from server components.
 */
export function SiteHeader({ current, urls, apps, children }: SiteHeaderProps) {
  const resolved: SiteUrls = { ...resolveSiteUrls(), ...urls };
  const shown = SITE_APPS.filter((app) => !apps || apps.includes(app.id));
  const showNav = shown.length > 1;
  const home = shown.some((app) => app.id === "simulator") ? resolved.simulator : resolved[current];
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-shadow-950/75 backdrop-blur-xl supports-[backdrop-filter]:bg-shadow-950/60">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-chakra-500 focus:px-3 focus:py-1.5 focus:text-sm focus:font-semibold focus:text-shadow-950"
      >
        Skip to content
      </a>
      <div className="relative z-20 mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <a
          href={home}
          className="group flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
        >
          <span className="transition-transform duration-500 group-hover:rotate-[360deg]">
            <BrandMark />
          </span>
          <span className="text-[15px] font-black uppercase tracking-[0.18em] text-white">
            Naruto <span className="text-chakra-400">TCG</span>
          </span>
        </a>

        {showNav && (
          <nav aria-label="Naruto TCG apps" className="ml-auto hidden md:block">
            <ul className="flex items-center gap-1">
              {shown.map((app) => {
                const active = app.id === current;
                return (
                  <li key={app.id}>
                    <a
                      href={resolved[app.id]}
                      aria-current={active ? "page" : undefined}
                      title={app.blurb}
                      className={cx(
                        "relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
                        active ? "text-white" : "text-ash-400 hover:bg-white/5 hover:text-ash-200",
                      )}
                    >
                      <span className={active ? "text-chakra-400" : undefined}>
                        <AppIcon id={app.id} />
                      </span>
                      {app.label}
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-gradient-to-r from-chakra-500 via-chakra-400 to-blood-500 shadow-[0_0_12px_2px_rgba(255,122,26,0.55)]"
                        />
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

        )}

        {showNav && (
          <details className="group relative ml-auto md:hidden">
            <summary
              aria-label="Open app navigation"
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-white/10 text-ash-200 transition hover:border-chakra-400 hover:text-chakra-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 [&::-webkit-details-marker]:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path className="origin-center transition group-open:translate-y-[5px] group-open:rotate-45" d="M4 7h16" />
                <path className="transition group-open:opacity-0" d="M4 12h16" />
                <path className="origin-center transition group-open:-translate-y-[5px] group-open:-rotate-45" d="M4 17h16" />
              </svg>
            </summary>
            <nav
              aria-label="Naruto TCG apps"
              className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-white/10 bg-shadow-900/95 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl"
            >
              <ul className="flex flex-col gap-1">
                {shown.map((app) => {
                  const active = app.id === current;
                  return (
                    <li key={app.id}>
                      <a
                        href={resolved[app.id]}
                        aria-current={active ? "page" : undefined}
                        className={cx(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
                          active ? "bg-chakra-500/10 text-white" : "text-ash-300 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        <span className={active ? "text-chakra-400" : "text-ash-400"}>
                          <AppIcon id={app.id} />
                        </span>
                        <span className="flex flex-col">
                          <span className="text-sm font-semibold">{app.label}</span>
                          <span className="text-xs text-ash-400">{app.blurb}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </details>
        )}
      </div>
      {children && <div className="border-t border-white/5">{children}</div>}
    </header>
  );
}
