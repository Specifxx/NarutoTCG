import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { formatDate, pluralize } from "@/lib/format";
import { ArrowRightIcon, LeafMark } from "./icons";
import { BUTTON_GHOST, BUTTON_PRIMARY, EYEBROW } from "./styles";

/** Overview hero: pitch, calls to action and the date of the newest event in the meta. */
export function OverviewHero({ asOf, eventCount }: { asOf: string | null; eventCount: number }) {
  return (
    <section
      aria-labelledby="overview-title"
      className={cx(
        "relative overflow-hidden rounded-xl border border-shadow-700 bg-shadow-900 px-5 py-8 sm:px-8 sm:py-12",
        "bg-[radial-gradient(ellipse_at_top_right,rgba(255,122,26,0.14),transparent_55%)]",
      )}
    >
      <LeafMark
        strokeWidth={1.2}
        className="pointer-events-none absolute -top-12 -right-16 h-72 w-72 text-chakra-500/15 sm:-top-16 sm:-right-10 sm:h-96 sm:w-96"
      />
      <div className="relative max-w-2xl">
        <p className={EYEBROW}>Competitive meta</p>
        <h1 id="overview-title" className="mt-3 text-3xl font-black tracking-tight text-balance text-white sm:text-5xl">
          Know the meta before <span className="text-chakra-400">round one.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-ash-300 sm:text-lg">
          Tier lists, matchup data and winning decklists from every tracked event, plus an import wizard that turns organizer
          exports into results in minutes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/meta" className={BUTTON_PRIMARY}>
            View the meta
            <ArrowRightIcon />
          </Link>
          <Link href="/decks" className={BUTTON_GHOST}>
            Browse decks
          </Link>
          <Link href="/tournaments/import" className={BUTTON_GHOST}>
            Import results
          </Link>
        </div>
        <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ash-400">
          {asOf ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-chakra-400" />
              Meta as of{" "}
              <time dateTime={asOf} className="font-semibold text-ash-100">
                {formatDate(asOf)}
              </time>
            </span>
          ) : (
            <span>No events tracked yet</span>
          )}
          <span aria-hidden="true">·</span>
          <span>{pluralize(eventCount, "event")}</span>
          <span aria-hidden="true">·</span>
          <span>All seed events, players and decks are fictional demo data</span>
        </p>
      </div>
    </section>
  );
}
