import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export { SITE_APPS, SiteHeader, resolveSiteUrls } from "./site-header";
export type { SiteApp, SiteAppId, SiteHeaderProps, SiteUrls } from "./site-header";

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
    <main id="main" className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-4xl flex-col gap-6 px-6 py-16">
      <header>
        <Badge>Naruto TCG</Badge>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">{title}</h1>
        {tagline && <p className="mt-2 text-ash-400">{tagline}</p>}
      </header>
      {children}
    </main>
  );
}
