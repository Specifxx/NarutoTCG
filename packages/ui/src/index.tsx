import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { APP_LINKS, appUrl, type AppKey } from "./apps";

export { APP_LINKS, appUrl, type AppKey, type AppLink } from "./apps";

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

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

function LeafMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path
        d="M16 3c6.5 3.2 11 9 11 15.4C27 24.8 22.1 29 16 29S5 24.8 5 18.4C5 12 9.5 6.2 16 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M16 23.5a5.5 5.5 0 1 1 5.5-5.5c0 2-1.6 3.4-3.4 3.4a3.1 3.1 0 0 1-3.1-3.1c0-1.1.9-1.9 1.9-1.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Shared top navigation across the platform apps. `current` marks the app being viewed;
 * its link points at "/" so in-app navigation stays same-origin. `children` renders an
 * optional app-specific sub-navigation row.
 */
export function SiteHeader({ current, children }: { current: AppKey; children?: ReactNode }) {
  const links = APP_LINKS.map((app) => ({ ...app, href: app.key === current ? "/" : appUrl(app.key) }));
  return (
    <header className="sticky top-0 z-40 border-b border-shadow-700 bg-shadow-950/90 backdrop-blur supports-[backdrop-filter]:bg-shadow-950/75">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <a href={links.find((l) => l.key === current)!.href} className="flex shrink-0 items-center gap-2 text-white">
          <LeafMark className="h-7 w-7 text-chakra-400" />
          <span className="text-sm font-black uppercase tracking-[0.18em]">
            Naruto <span className="text-chakra-400">TCG</span>
          </span>
        </a>
        <nav aria-label="Platform" className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.key}
              href={link.href}
              aria-current={link.key === current ? "page" : undefined}
              title={link.description}
              className={cx(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition",
                link.key === current ? "bg-shadow-800 text-chakra-400" : "text-ash-300 hover:bg-shadow-800 hover:text-white",
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <details className="group relative ml-auto md:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-shadow-600 px-3 py-1.5 text-sm font-semibold text-ash-200 [&::-webkit-details-marker]:hidden">
            {links.find((l) => l.key === current)!.label}
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 transition group-open:rotate-180">
              <path d="m5 7 5 6 5-6" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </summary>
          <nav
            aria-label="Platform"
            className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-shadow-600 bg-shadow-900 shadow-xl shadow-black/60"
          >
            {links.map((link) => (
              <a
                key={link.key}
                href={link.href}
                aria-current={link.key === current ? "page" : undefined}
                className={cx(
                  "block px-4 py-3 text-sm hover:bg-shadow-800",
                  link.key === current ? "text-chakra-400" : "text-ash-200",
                )}
              >
                <span className="block font-semibold">{link.label}</span>
                <span className="block text-xs text-ash-400">{link.description}</span>
              </a>
            ))}
          </nav>
        </details>
      </div>
      {children}
    </header>
  );
}
