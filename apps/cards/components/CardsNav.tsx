"use client";

import { ScrollFadeNav } from "@naruto-tcg/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview", match: (p: string) => p === "/" },
  { href: "/cards", label: "Card Database", match: (p: string) => p === "/cards" || p.startsWith("/card/") },
  { href: "/spoilers", label: "Spoilers", match: (p: string) => p.startsWith("/spoilers") },
  { href: "/sets", label: "Set Checklists", match: (p: string) => p.startsWith("/sets") },
] as const;

/** Secondary navigation for the Cards app, rendered inside the shared SiteHeader. */
export function CardsNav() {
  const pathname = usePathname();
  return (
    <ScrollFadeNav label="Cards" activeKey={pathname} className="mx-auto max-w-7xl px-4 sm:px-6">
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
    </ScrollFadeNav>
  );
}
