import type { CardSet } from "@naruto-tcg/types";
import Link from "next/link";
import { CardImage } from "@/components/CardImage";
import { ArrowRightIcon, CalendarIcon } from "@/components/home/icons";
import { ProgressBar, percentLabel } from "@/components/sets/ProgressBar";
import { SET_KIND_LABEL, daysBetween, formatDate, formatDateLong, setHref } from "@/lib/meta";
import { formatMonthDay, pluralize, type SetEntryLike, type SetSummary } from "./reveals";
import styles from "./spoilers.module.css";

/** Spoiler-season banner for one unreleased set. */
export function UpcomingSetHero({
  set,
  summary,
  showcase,
  today,
  headingLevel = "h3",
  priority = false,
}: {
  set: CardSet;
  summary: SetSummary;
  /** Up to three entries to fan out as preview art, most important last. */
  showcase: readonly SetEntryLike[];
  today: string;
  headingLevel?: "h2" | "h3";
  priority?: boolean;
}) {
  const Heading = headingLevel;
  const daysLeft = Math.max(0, daysBetween(today, set.releaseDate));
  const headingId = `upcoming-${set.id}`;
  const revealed = Math.min(summary.knownNumbers, set.totalCards);
  return (
    <article
      aria-labelledby={headingId}
      className={`${styles.hero} relative isolate overflow-hidden rounded-3xl border border-shadow-700 shadow-2xl shadow-black/40`}
    >
      <div aria-hidden="true" className={styles.heroGlow} />
      <div
        className={`relative grid gap-8 p-5 sm:p-8 lg:items-center lg:gap-10 lg:p-10 ${
          showcase.length > 0 ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : ""
        }`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-md border border-chakra-500/50 bg-chakra-500/15 px-2 py-0.5 font-mono tracking-wider text-chakra-400">
              {set.id}
            </span>
            <span className="uppercase tracking-[0.16em] text-ash-400">{SET_KIND_LABEL[set.kind]}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blood-500/50 bg-blood-500/15 px-2 py-0.5 uppercase tracking-[0.14em] text-red-300">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-red-400 motion-safe:animate-pulse" />
              Spoiler season
            </span>
          </div>

          <Heading id={headingId} className="mt-3 text-balance text-2xl font-black tracking-tight text-white sm:text-4xl">
            {set.name}
          </Heading>
          {set.description && <p className="mt-3 max-w-2xl text-pretty text-sm text-ash-400 sm:text-base">{set.description}</p>}

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-shadow-700 bg-shadow-950/50 p-3 sm:p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ash-400">Countdown</dt>
              <dd className="mt-1 text-white">
                <span className="text-3xl font-black tracking-tight sm:text-4xl">{daysLeft}</span>{" "}
                <span className="text-sm text-ash-200">{daysLeft === 1 ? "day" : "days"} until release</span>
              </dd>
            </div>
            <div className="rounded-xl border border-shadow-700 bg-shadow-950/50 p-3 sm:p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ash-400">Release date</dt>
              <dd className="mt-2 flex items-center gap-2 text-sm font-semibold text-white sm:text-base">
                <CalendarIcon className="h-4 w-4 shrink-0 text-chakra-400" />
                <time dateTime={set.releaseDate} title={formatDateLong(set.releaseDate)}>
                  {formatDate(set.releaseDate)}
                </time>
              </dd>
            </div>
            <div className="col-span-2 rounded-xl border border-shadow-700 bg-shadow-950/50 p-3 sm:col-span-1 sm:p-4">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ash-400">Latest reveal</dt>
              <dd className="mt-2 text-sm font-semibold text-white sm:text-base">
                {summary.latestReveal ? (
                  <time dateTime={summary.latestReveal}>{formatMonthDay(summary.latestReveal)}</time>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <p className="text-ash-200">
                <span className="text-lg font-bold text-white">{revealed}</span>
                <span className="text-ash-400"> / {set.totalCards}</span> cards revealed
              </p>
              <p className="font-semibold tabular-nums text-chakra-400">{percentLabel(revealed, set.totalCards)}</p>
            </div>
            <ProgressBar
              value={revealed}
              max={set.totalCards}
              size="lg"
              label={`${set.shortName} reveal progress`}
              valueText={`${revealed} of ${pluralize(set.totalCards, "card")} revealed`}
              className="mt-2"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={setHref(set.id)}
              className="inline-flex items-center gap-2 rounded-lg bg-chakra-500 px-4 py-2 text-sm font-semibold text-shadow-950 transition hover:bg-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-900"
            >
              Set checklist
              <ArrowRightIcon />
            </Link>
            <Link
              href={`/cards?set=${encodeURIComponent(set.id)}`}
              className="inline-flex items-center gap-2 rounded-lg border border-shadow-500 px-4 py-2 text-sm font-semibold text-ash-200 transition hover:border-chakra-400 hover:text-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
            >
              Browse in database
            </Link>
          </div>
        </div>

        {showcase.length > 0 && (
          <div aria-hidden="true" className="order-first lg:order-none">
            <div className={`${styles.fan} max-w-[17rem] sm:max-w-[22rem]`}>
              {showcase.map((entry) => (
                <div key={entry.key} className={styles.fanCard}>
                  <CardImage card={entry.card} printing={entry.printing} priority={priority} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
