"use client";

import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type FocusEvent } from "react";

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

/**
 * Scrolls the row sideways just enough to show `item`, keeping `margin` px clear of the edges.
 * Never scrollIntoView: the row sits in the sticky header, under the html scroll-padding, so that
 * would scroll the page up on every call.
 */
function revealInRow(row: HTMLElement, item: Element, margin = 16) {
  const bounds = row.getBoundingClientRect();
  const rect = item.getBoundingClientRect();
  if (rect.left < bounds.left + margin) row.scrollLeft -= bounds.left + margin - rect.left;
  else if (rect.right > bounds.right - margin) row.scrollLeft += rect.right - (bounds.right - margin);
}

export function DecksNav() {
  const active = activeHref(usePathname() ?? "/");
  const navRef = useRef<HTMLElement>(null);

  // The nav lives in the root layout and survives client navigations, so follow the active link,
  // not just the first render: on narrow screens "Import results" would otherwise sit off-screen.
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector('[aria-current="page"]');
    if (nav && current) revealInRow(nav, current);
  }, [active]);

  // A partly visible link that takes focus is not scrolled into view by Chrome; reveal it.
  const onFocus = (event: FocusEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) revealInRow(event.currentTarget, event.target);
  };

  return (
    <div className="border-t border-shadow-800">
      <nav
        ref={navRef}
        aria-label="Decks"
        onFocus={onFocus}
        className="mx-auto flex max-w-7xl gap-1 relative overflow-x-auto px-4 sm:px-6"
      >
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
