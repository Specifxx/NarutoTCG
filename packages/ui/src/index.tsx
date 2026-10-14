import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  return (
    <button
      className={cx(
        "rounded-md px-4 py-2 text-sm font-semibold tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 disabled:opacity-50",
        variant === "primary" && "bg-chakra-500 text-shadow-950 hover:bg-chakra-400",
        variant === "ghost" && "border border-shadow-500 text-ash-200 hover:border-chakra-400 hover:text-chakra-400",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("rounded-lg border border-shadow-700 bg-shadow-900 p-5 shadow-lg shadow-black/40", className)}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cx(
        "inline-block rounded-full border border-chakra-600 bg-shadow-800 px-2.5 py-0.5 text-xs font-medium text-chakra-400",
        className,
      )}
      {...props}
    />
  );
}

export function PageShell({ title, tagline, children }: { title: string; tagline?: string; children?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-16">
      <header>
        <Badge>Naruto TCG</Badge>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">{title}</h1>
        {tagline && <p className="mt-2 text-ash-400">{tagline}</p>}
      </header>
      {children}
    </main>
  );
}

export { ReleaseRoadmap, ReleaseStatusBadge, type ReleaseRoadmapProps } from "./components/release-roadmap";
export {
  DEVELOPMENT_WINDOW_DAYS,
  GLOBAL_LAUNCH_LABEL,
  RELEASE_PHASES,
  getReleaseStatus,
  type Release,
  type ReleaseAppId,
  type ReleasePhase,
  type ReleaseStatus,
} from "./release-schedule";

export interface NavLink {
  key: string;
  label: string;
  href: string;
}

export const DEFAULT_NAV: NavLink[] = [
  { key: "learn", label: "Learn", href: "/learn" },
  { key: "events", label: "Events", href: "/events" },
  { key: "cards", label: "Cards", href: "/cards" },
  { key: "decks", label: "Decks", href: "/decks" },
  { key: "simulator", label: "Simulator", href: "/simulator" },
  { key: "compare", label: "Compare", href: "/compare" },
];

export function SiteHeader({ current, links = DEFAULT_NAV }: { current?: string; links?: NavLink[] }) {
  return (
    <header className="sticky top-0 z-[1000] border-b border-shadow-700 bg-shadow-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <a href="/" className="text-lg font-bold tracking-tight text-white">
          <span className="text-chakra-400">忍</span> Naruto TCG
        </a>
        <nav className="flex flex-wrap gap-1 text-sm">
          {links.map((l) => (
            <a
              key={l.key}
              href={l.href}
              aria-current={l.key === current ? "page" : undefined}
              className={cx(
                "rounded-md px-3 py-1.5 transition hover:text-chakra-400",
                l.key === current ? "bg-shadow-800 text-chakra-400" : "text-ash-400",
              )}
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
