import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { APP_LINKS, appHref, type AppKey } from "./nav";

export { APP_LINKS, appHref, type AppKey, type AppLink } from "./nav";

/** Joins truthy class names. */
export const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

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
    <main id="main" className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-16">
      <header>
        <Badge>Naruto TCG</Badge>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">{title}</h1>
        {tagline && <p className="mt-2 text-ash-400">{tagline}</p>}
      </header>
      {children}
    </main>
  );
}

function ShurikenMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M16 1.5 19.2 12.8 30.5 16 19.2 19.2 16 30.5 12.8 19.2 1.5 16 12.8 12.8Z"
      />
      <circle cx="16" cy="16" r="3.2" fill="var(--color-shadow-950)" />
    </svg>
  );
}

/**
 * Sticky cross-app header shared by Decks, Simulator, Compare and Learn.
 * Apps without a resolvable URL (see `appHref`) are left out of the nav.
 * Pages must render `<main id="main">` for the skip link to land.
 */
export function SiteHeader({ current }: { current: AppKey }) {
  return (
    <header className="sticky top-0 z-40 border-b border-shadow-700 bg-shadow-950/90 backdrop-blur supports-[backdrop-filter]:bg-shadow-950/75">
      <a
        href="#main"
        className="sr-only rounded-md bg-chakra-500 px-3 py-2 text-sm font-semibold text-shadow-950 focus:not-sr-only focus:absolute focus:left-4 focus:top-2.5 focus:z-50"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <a
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-md font-bold tracking-tight text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
        >
          <ShurikenMark className="h-7 w-7 text-chakra-500" />
          <span className="hidden sm:inline">
            Naruto <span className="text-chakra-400">TCG</span>
          </span>
          <span className="sr-only sm:hidden">Naruto TCG</span>
        </a>
        <nav aria-label="Naruto TCG apps" className="ml-auto">
          <ul className="flex items-center gap-0.5 sm:gap-1">
            {APP_LINKS.map((app) => {
              const href = appHref(app.key, current);
              if (!href) return null;
              const active = app.key === current;
              return (
                <li key={app.key}>
                  <a
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "relative flex h-10 items-center rounded-md px-2 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 sm:px-3 sm:text-sm",
                      active
                        ? "text-white after:absolute after:inset-x-2 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-chakra-500 sm:after:inset-x-3"
                        : "text-ash-400 hover:bg-shadow-800 hover:text-ash-200",
                    )}
                  >
                    {app.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
