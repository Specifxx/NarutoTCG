import type { NarutoCard } from "@naruto-tcg/types";
import Link from "next/link";
import { cardHref, setHref } from "@/lib/meta";
import type { CardNeighbors } from "./queries";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0">
      <path
        d={direction === "left" ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Card Database › Set › Card. */
export function Breadcrumbs({ card, setId, setLabel }: { card: NarutoCard; setId: string; setLabel: string }) {
  const crumb = `rounded-sm transition hover:text-white ${FOCUS}`;
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ash-400">
        <li>
          <Link href="/cards" className={crumb}>
            Card Database
          </Link>
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="text-shadow-500">
            ›
          </span>
          <Link href={setHref(setId)} className={crumb}>
            {setLabel}
          </Link>
        </li>
        <li className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden="true" className="text-shadow-500">
            ›
          </span>
          <span aria-current="page" className="truncate font-medium text-ash-200">
            {card.name}
          </span>
        </li>
      </ol>
    </nav>
  );
}

const STEP =
  "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full border px-2.5 text-sm font-medium transition sm:px-3";

/** Previous / next card within the debut set's collector order. */
export function CardPager({ neighbors, setLabel }: { neighbors: CardNeighbors; setLabel: string }) {
  const { prev, next, position, total } = neighbors;
  if (total <= 1 || position === 0) return null;
  return (
    <nav aria-label={`Cards in ${setLabel}`} className="flex items-center gap-2">
      {prev ? (
        <Link
          href={cardHref(prev.id)}
          rel="prev"
          className={`${STEP} border-shadow-700 bg-shadow-900/80 text-ash-200 hover:border-chakra-400 hover:text-white ${FOCUS}`}
        >
          <Chevron direction="left" />
          <span className="sr-only">Previous card: </span>
          <span className="sr-only sm:not-sr-only sm:inline-block sm:max-w-36 sm:truncate">{prev.name}</span>
        </Link>
      ) : (
        <span aria-hidden="true" className={`${STEP} border-shadow-800 text-shadow-500`}>
          <Chevron direction="left" />
        </span>
      )}
      <span className="px-1 text-xs tabular-nums text-ash-400">
        <span aria-hidden="true">
          {position} / {total}
        </span>
        <span className="sr-only">
          Card {position} of {total}
        </span>
      </span>
      {next ? (
        <Link
          href={cardHref(next.id)}
          rel="next"
          className={`${STEP} border-shadow-700 bg-shadow-900/80 text-ash-200 hover:border-chakra-400 hover:text-white ${FOCUS}`}
        >
          <span className="sr-only">Next card: </span>
          <span className="sr-only sm:not-sr-only sm:inline-block sm:max-w-36 sm:truncate">{next.name}</span>
          <Chevron direction="right" />
        </Link>
      ) : (
        <span aria-hidden="true" className={`${STEP} border-shadow-800 text-shadow-500`}>
          <Chevron direction="right" />
        </span>
      )}
    </nav>
  );
}
