import { Info } from "lucide-react";
import Link from "next/link";

const LINKS = [
  { href: "/events", label: "Event directory" },
  { href: "/events/map", label: "Event map" },
  { href: "/stores", label: "Store locator" },
  { href: "/countdowns", label: "Countdowns" },
  { href: "/events/submit", label: "Submit an event" },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-shadow-700/80 bg-shadow-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <p className="font-semibold text-white">
            Naruto <span className="text-chakra-400">TCG</span> Events
          </p>
          <p className="mt-2 flex items-start gap-2 text-sm text-ash-400">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-chakra-400" aria-hidden="true" />
            <span>
              Listings, stores and dates on this site are sample seed data for development. They are not official
              announcements — always confirm details with the organiser before travelling.
            </span>
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-ash-400 hover:text-chakra-400">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
