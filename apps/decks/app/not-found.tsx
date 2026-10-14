import { cx } from "@naruto-tcg/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, LeafMark } from "@/components/home/icons";
import { StatusPage } from "@/components/home/status-page";
import { BUTTON_GHOST, FOCUS_RING } from "@/components/home/styles";
import { PageContainer } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page does not exist on the Naruto TCG decks and meta tracker.",
};

const DESTINATIONS = [
  { href: "/meta", label: "Meta", description: "Tier list, win rates and matchups" },
  { href: "/decks", label: "Decks", description: "Tournament lists and community builds" },
  { href: "/tournaments", label: "Tournaments", description: "Standings, brackets and pairings" },
] as const;

export default function NotFound() {
  return (
    <PageContainer>
      <StatusPage
        mark={<LeafMark className="h-16 w-16 text-chakra-400" />}
        eyebrow="Error 404"
        title="This scroll is not in the archive"
        actions={
          <nav aria-label="Where to next" className="flex flex-col items-center gap-6">
            <ul className="grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-3">
              {DESTINATIONS.map((destination) => (
                <li key={destination.href}>
                  <Link
                    href={destination.href}
                    className={cx(
                      "group flex h-full flex-col gap-1 rounded-lg border border-shadow-700 bg-shadow-900 p-4 transition hover:border-chakra-600",
                      FOCUS_RING,
                    )}
                  >
                    <span className="flex items-center justify-between gap-2 font-semibold text-white group-hover:text-chakra-300">
                      {destination.label}
                      <ArrowRightIcon className="h-4 w-4 text-ash-500 group-hover:text-chakra-300" />
                    </span>
                    <span className="text-xs text-ash-400">{destination.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/" className={BUTTON_GHOST}>
              Back to the overview
            </Link>
          </nav>
        }
      >
        <p>
          The page you are looking for does not exist or has moved. An event or deck you imported lives only in the browser
          you imported it in.
        </p>
      </StatusPage>
    </PageContainer>
  );
}
