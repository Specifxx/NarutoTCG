import type { CardSet } from "@naruto-tcg/types";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/home/icons";
import { FeedFilterBar, FeedGroup, FeedGroupCount, FeedItem, FeedNoMatches, RevealFeedProvider } from "@/components/spoilers/FeedFilters";
import { NewBadge, RevealCard } from "@/components/spoilers/RevealCard";
import { RevealTimeline, revealDayId } from "@/components/spoilers/RevealTimeline";
import { UpcomingSetHero } from "@/components/spoilers/UpcomingSetHero";
import {
  formatWeekdayMonthDay,
  groupByRevealDate,
  isNewReveal,
  latestRevealDate,
  limitRevealDays,
  pluralize,
  revealTimeline,
  showcaseEntries,
  summarizeSet,
  type FeedKey,
} from "@/components/spoilers/reveals";
import styles from "@/components/spoilers/spoilers.module.css";
import { getRevealedCards, getSetEntries, getSets } from "@/lib/data";
import { RARITY_META, formatDate, formatDateLong, isReleased, primaryPrinting, todayIso } from "@/lib/meta";

export const metadata: Metadata = {
  title: "Spoiler & Reveal Center",
  description: "Every newly revealed Naruto TCG card, grouped by reveal day, with release countdowns and reveal progress for upcoming sets.",
};

/** Feed images above this index load eagerly (roughly the first visible rows). */
const EAGER_IMAGES = 4;

/** Upper bound on cards rendered in the static feed; older days link to the database instead. */
const FEED_CARD_LIMIT = 240;

export default function SpoilersPage() {
  const today = todayIso();
  const revealed = getRevealedCards();
  const sets = getSets();
  const setById = new Map<string, CardSet>(sets.map((set) => [set.id, set]));
  const latest = latestRevealDate(revealed);
  const { shown: days, omitted } = limitRevealDays(groupByRevealDate(revealed), FEED_CARD_LIMIT);
  const timeline = revealTimeline(revealed);

  const feedKey = (card: (typeof revealed)[number]): FeedKey => ({
    set: primaryPrinting(card).setId,
    element: card.element,
  });
  const index = days.flatMap((day) => day.cards.map(feedKey));
  const feedSetIds = new Set(index.map((key) => key.set));
  // Newest sets first: spoiler season is about what's coming next.
  const setOptions = [...sets]
    .reverse()
    .filter((set) => feedSetIds.has(set.id))
    .map((set) => ({ id: set.id, label: `${set.id} · ${set.shortName}` }));

  const upcoming = sets
    .filter((set) => !isReleased(set, today))
    .map((set) => {
      const entries = getSetEntries(set.id);
      return {
        set,
        summary: summarizeSet(set, entries),
        // The rarest card goes last so it renders on top of the fan.
        showcase: showcaseEntries(entries, (entry) => RARITY_META[entry.printing.rarity].rank).reverse(),
        hasReveals: entries.some((entry) => entry.card.reveal !== undefined),
      };
    })
    .filter((item) => item.hasReveals);

  // Without an upcoming-set hero, the first feed row is above the fold.
  const eagerIds = new Set(
    upcoming.length === 0 ? days.flatMap((day) => day.cards.map((card) => card.id)).slice(0, EAGER_IMAGES) : [],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-chakra-400">Spoilers</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">Spoiler &amp; Reveal Center</h1>
        <p className="mt-3 text-pretty text-ash-400 sm:text-lg">
          {revealed.length > 0 ? (
            <>
              Every officially revealed card ahead of release, newest first.{" "}
              <span className="text-ash-200">{pluralize(revealed.length, "card")}</span> revealed
              {latest && (
                <>
                  , most recently on{" "}
                  <time dateTime={latest} className="text-ash-200">
                    {formatDate(latest)}
                  </time>
                </>
              )}
              .
            </>
          ) : (
            "Every officially revealed card ahead of release, newest first."
          )}
        </p>
      </header>

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading" className="mt-8 sm:mt-10">
          <h2 id="upcoming-heading" className="sr-only">
            Upcoming releases
          </h2>
          <div className="space-y-6">
            {upcoming.map((item, i) => (
              <UpcomingSetHero
                key={item.set.id}
                set={item.set}
                summary={item.summary}
                showcase={item.showcase}
                today={today}
                priority={i === 0}
              />
            ))}
          </div>
        </section>
      )}

      {revealed.length === 0 ? (
        <section
          aria-labelledby="empty-heading"
          className="mt-10 rounded-3xl border border-dashed border-shadow-700 bg-shadow-900/60 px-6 py-16 text-center"
        >
          <p aria-hidden="true" className="text-5xl text-chakra-500/70">
            巻
          </p>
          <h2 id="empty-heading" className="mt-4 text-xl font-bold text-white">
            No spoilers yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ash-400">
            When cards from an upcoming set are revealed they&apos;ll appear here, grouped by the day they dropped.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href="/cards"
              className="inline-flex items-center gap-2 rounded-lg bg-chakra-500 px-4 py-2 text-sm font-semibold text-shadow-950 transition hover:bg-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950"
            >
              Browse released cards <ArrowRightIcon />
            </Link>
            <Link
              href="/sets"
              className="inline-flex items-center gap-2 rounded-lg border border-shadow-500 px-4 py-2 text-sm font-semibold text-ash-200 transition hover:border-chakra-400 hover:text-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
            >
              Set checklists
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="mt-8 sm:mt-10">
            <RevealTimeline data={timeline} headingId="timeline-heading" />
          </div>

          <RevealFeedProvider index={index}>
            <section aria-labelledby="feed-heading" className="mt-10 sm:mt-12">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <h2 id="feed-heading" className="text-2xl font-bold tracking-tight text-white">
                  Reveal feed
                </h2>
                {latest && (
                  <p className="text-sm text-ash-400">
                    <NewBadge className="relative mr-1.5 align-middle" /> = revealed in the 7 days up to{" "}
                    <time dateTime={latest}>{formatDate(latest)}</time>
                  </p>
                )}
              </div>
              <FeedFilterBar sets={setOptions} />

              <div className="mt-6 space-y-8">
                {days.map((day) => {
                  const keys = day.cards.map(feedKey);
                  const headingId = `${revealDayId(day.date)}-heading`;
                  return (
                    <FeedGroup
                      key={day.date}
                      id={revealDayId(day.date)}
                      labelledBy={headingId}
                      keys={keys}
                      className="scroll-mt-32"
                    >
                      <div
                        className={`${styles.dayHeader} sticky top-[var(--cards-header-h)] z-20 -mx-4 mb-4 flex items-center gap-3 border-b border-shadow-800 px-4 py-3 sm:-mx-6 sm:px-6`}
                      >
                        <h2 id={headingId} className="text-base font-bold text-white sm:text-lg">
                          <time dateTime={day.date} title={formatDateLong(day.date)}>
                            {formatWeekdayMonthDay(day.date)}
                          </time>
                        </h2>
                        {isNewReveal(day.date, latest) && (
                          <span className="rounded-full bg-chakra-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-chakra-400">
                            This week
                          </span>
                        )}
                        <span className="ml-auto text-sm tabular-nums text-ash-400">
                          <FeedGroupCount keys={keys} />
                        </span>
                      </div>
                      {/* Off-screen days skip layout (content-visibility). The -m-2/p-2 pair leaves
                          paint room for corner badges and shadows; the size estimate assumes ~3
                          columns until the browser has measured the real height. */}
                      <ul
                        className="-m-2 grid grid-cols-2 gap-3 p-2 [content-visibility:auto] sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5"
                        style={{ containIntrinsicSize: `auto ${Math.ceil(day.cards.length / 3) * 440}px` }}
                      >
                        {day.cards.map((card) => (
                          <FeedItem key={card.id} feedKey={feedKey(card)}>
                            <RevealCard
                              card={card}
                              set={setById.get(primaryPrinting(card).setId)}
                              isNew={isNewReveal(card.reveal?.date, latest)}
                              priority={eagerIds.has(card.id)}
                            />
                          </FeedItem>
                        ))}
                      </ul>
                    </FeedGroup>
                  );
                })}
                <FeedNoMatches />
                {omitted > 0 && (
                  <p className="rounded-2xl border border-shadow-700 bg-shadow-900/60 px-5 py-4 text-sm text-ash-400">
                    {pluralize(omitted, "older reveal")} {omitted === 1 ? "isn't" : "aren't"} shown here.{" "}
                    <Link
                      href="/cards"
                      className="rounded-sm font-semibold text-chakra-400 hover:text-chakra-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
                    >
                      Browse every card in the database
                    </Link>
                    .
                  </p>
                )}
              </div>
            </section>
          </RevealFeedProvider>
        </>
      )}
    </div>
  );
}
