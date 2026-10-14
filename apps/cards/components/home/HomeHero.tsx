import type { CardPrinting, NarutoCard } from "@naruto-tcg/types";
import Link from "next/link";
import { CardImage } from "@/components/CardImage";
import { SearchIcon } from "./icons";
import styles from "./home.module.css";
import { cardsHref } from "@/lib/search";

export interface HeroCard {
  card: NarutoCard;
  printing: CardPrinting;
}

/** Overview hero with a JS-free GET search into the card database. */
export function HomeHero({
  cardCount,
  setCount,
  suggestions,
  showcase,
}: {
  cardCount: number;
  setCount: number;
  /** Quick searches, e.g. popular traits. */
  suggestions: readonly string[];
  /** Up to three cards for the decorative fan; the last renders on top. */
  showcase: readonly HeroCard[];
}) {
  return (
    <section aria-labelledby="home-heading" className={`${styles.hero} relative overflow-hidden border-b border-shadow-800`}>
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-20">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-chakra-400">Naruto TCG · Card Database</p>
          <h1 id="home-heading" className="mt-3 text-balance text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">
            Every card. Every reveal. <span className={styles.gradientText}>Every set.</span>
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-base text-ash-400 sm:text-lg">
            Search {cardCount.toLocaleString("en-US")} cards across {setCount} {setCount === 1 ? "set" : "sets"}, follow
            the latest spoilers, and check off your collection one printing at a time.
          </p>

          <form
            role="search"
            action="/cards"
            method="get"
            className="mt-8 flex max-w-xl items-center gap-1.5 rounded-2xl border border-shadow-700 bg-shadow-950/80 p-1.5 shadow-xl shadow-black/40 transition focus-within:border-chakra-500/70 focus-within:ring-2 focus-within:ring-chakra-500/40"
          >
            <label htmlFor="home-search" className="sr-only">
              Search cards
            </label>
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ash-400" />
              <input
                id="home-search"
                name="q"
                type="search"
                autoComplete="off"
                enterKeyHint="search"
                placeholder="Names, traits or rules text…"
                className="w-full bg-transparent py-3 pl-11 pr-2 text-base text-white placeholder:text-ash-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-chakra-500 px-4 py-3 text-sm font-bold text-shadow-950 transition hover:bg-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:px-6"
            >
              Search
            </button>
          </form>

          {suggestions.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ash-400">Try</span>
              {suggestions.map((term) => (
                <Link
                  key={term}
                  href={cardsHref({ query: term })}
                  className="rounded-full border border-shadow-700 bg-shadow-900/80 px-3 py-1 text-ash-200 transition hover:border-chakra-500/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
                >
                  {term}
                </Link>
              ))}
            </div>
          )}
        </div>

        {showcase.length > 0 && (
          <div aria-hidden="true" className="relative hidden sm:block">
            <div className={styles.seal} />
            <div className={`${styles.fan} max-w-[22rem] lg:max-w-[30rem]`}>
              {showcase.map(({ card, printing }) => (
                <div key={`${card.id}-${printing.number}-${printing.variant}`} className={styles.fanCard}>
                  <CardImage card={card} printing={printing} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
