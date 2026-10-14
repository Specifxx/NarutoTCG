import Link from "next/link";
import { ChevronRightIcon } from "@/components/directory/icons";
import { directoryHref } from "@/lib/market/query";
import type { MarketCard } from "@/lib/market/types";

const link =
  "rounded-sm text-ash-400 underline-offset-4 transition-colors hover:text-ash-200 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";

export function Breadcrumbs({ card }: { card: MarketCard }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm">
      <ol className="flex min-w-0 items-center gap-1.5">
        <li className="shrink-0">
          <Link href="/" className={link}>
            Price Directory
          </Link>
        </li>
        <li aria-hidden className="shrink-0 text-ash-400">
          <ChevronRightIcon className="size-3.5" />
        </li>
        <li className="min-w-0 shrink truncate">
          <Link href={directoryHref({ sets: [card.setCode] })} className={link}>
            {card.set}
          </Link>
        </li>
        <li aria-hidden className="hidden shrink-0 text-ash-400 sm:block">
          <ChevronRightIcon className="size-3.5" />
        </li>
        {/* On phones the card name is the heading right below, so the crumb is kept for screen readers only. */}
        <li className="sr-only sm:not-sr-only sm:min-w-0 sm:flex-1 sm:truncate">
          <span aria-current="page" className="text-ash-200">
            {card.name}
          </span>
        </li>
      </ol>
    </nav>
  );
}
