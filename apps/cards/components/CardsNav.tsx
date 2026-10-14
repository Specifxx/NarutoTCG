"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "/", label: "Overview", match: (p: string) => p === "/" },
  { href: "/cards", label: "Card Database", match: (p: string) => p === "/cards" || p.startsWith("/card/") },
  { href: "/spoilers", label: "Spoilers", match: (p: string) => p.startsWith("/spoilers") },
  { href: "/sets", label: "Set Checklists", match: (p: string) => p.startsWith("/sets") },
] as const;

/** Secondary navigation for the Cards app, rendered inside the shared SiteHeader. */
export function CardsNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  // True while tabs are cut off on the right (narrow phones); shows the edge fade.
  const [moreRight, setMoreRight] = useState(false);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => setMoreRight(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1);
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    nav.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      nav.removeEventListener("scroll", update);
    };
  }, []);

  // Keep the current section's tab in view. Scrolls the nav only: scrollIntoView()
  // would also nudge the page, whose scroll-padding-top covers this header.
  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !link) return;
    const navBox = nav.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    if (linkBox.right > navBox.right) nav.scrollLeft += linkBox.right - navBox.right;
    else if (linkBox.left < navBox.left) nav.scrollLeft -= navBox.left - linkBox.left;
  }, [pathname]);

  return (
    <nav
      ref={navRef}
      aria-label="Cards"
      className={`mx-auto max-w-7xl overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 ${
        moreRight ? "[mask-image:linear-gradient(to_right,black_85%,transparent)]" : ""
      }`}
    >
      <ul className="flex h-11 items-center gap-5 text-sm">
        {LINKS.map((link) => {
          const active = link.match(pathname);
          return (
            <li key={link.href} className="h-full">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full items-center whitespace-nowrap border-b-2 transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-chakra-400 ${
                  active
                    ? "border-chakra-500 font-semibold text-white"
                    : "border-transparent text-ash-400 hover:border-shadow-500 hover:text-ash-200"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
