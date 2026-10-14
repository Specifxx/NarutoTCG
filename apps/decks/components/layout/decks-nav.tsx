"use client";

import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/meta", label: "Meta" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/decks", label: "Decks" },
  { href: "/tournaments/import", label: "Import results" },
] as const;

/** The longest link prefix that matches wins, so /tournaments/import does not also light up Tournaments. */
function activeHref(pathname: string): string | null {
  if (pathname.startsWith("/deck/") || pathname.startsWith("/players/")) return "/decks";
  const matches = LINKS.filter((l) => (l.href === "/" ? pathname === "/" : pathname === l.href || pathname.startsWith(`${l.href}/`)));
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

export function DecksNav() {
  const active = activeHref(usePathname() ?? "/");
  return (
    <div className="border-t border-shadow-800">
      <nav aria-label="Decks" className="mx-auto flex max-w-7xl gap-1 relative overflow-x-auto px-4 sm:px-6">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active === link.href ? "page" : undefined}
            className={cx(
              "relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition",
              active === link.href
                ? "text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-chakra-400"
                : "text-ash-400 hover:text-white",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
