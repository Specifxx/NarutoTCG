import type { CardSet, CardType, ChakraElement, NarutoCard } from "@naruto-tcg/types";
import { platformHref } from "@naruto-tcg/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { CardImage } from "@/components/CardImage";
import { ElementIcon } from "@/components/ElementIcon";
import { ProgressBar } from "@/components/sets/ProgressBar";
import { KIND_BANNER, UpcomingBadge } from "@/components/sets/set-ui";
import { NewBadge } from "@/components/spoilers/RevealCard";
import { formatMonthDay, isNewReveal, pluralize, type SetSummary } from "@/components/spoilers/reveals";
import {
  CARD_TYPES,
  CHAKRA_ELEMENTS,
  ELEMENT_META,
  SET_KIND_LABEL,
  TYPE_META,
  cardHref,
  daysBetween,
  formatDate,
  setHref,
} from "@/lib/meta";
import { ArrowRightIcon, CardsIcon, DeckIcon, EyeIcon, LayersIcon } from "./icons";
import styles from "./home.module.css";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950";

/** Stretched-link classes: the link's ::after covers its nearest positioned ancestor. */
const STRETCHED =
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-chakra-400";

export function SectionHeader({
  id,
  title,
  eyebrow,
  action,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-chakra-400">{eyebrow}</p>}
        <h2 id={id} className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function SectionLink({ href, children }: { href: "/spoilers" | "/sets" | "/cards"; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-chakra-400 transition hover:text-chakra-500 ${FOCUS}`}
    >
      {children}
      <ArrowRightIcon className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Stat tiles

export interface HomeStats {
  cards: number;
  sets: number;
  upcomingSets: number;
  revealed: number;
  latestReveal?: string;
  decks: number;
}

function StatTile({
  label,
  value,
  detail,
  icon,
  link,
}: {
  label: string;
  value: number;
  detail: string;
  icon: ReactNode;
  link: ReactNode;
}) {
  return (
    <li className="group relative flex flex-col rounded-2xl border border-shadow-700 bg-gradient-to-b from-shadow-800/80 to-shadow-900 p-4 shadow-lg shadow-black/20 transition hover:border-chakra-500/50 focus-within:border-chakra-500/60 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ash-400">{label}</p>
        <span className="rounded-lg bg-chakra-500/10 p-1.5 text-chakra-400">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">{value.toLocaleString("en-US")}</p>
      <p className="mt-1 text-sm text-ash-400">{detail}</p>
      <div className="mt-3 text-sm font-semibold text-chakra-400">{link}</div>
    </li>
  );
}

export function StatTiles({ stats }: { stats: HomeStats }) {
  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        At a glance
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label="Cards"
          value={stats.cards}
          detail={`Across ${pluralize(stats.sets, "set")}`}
          icon={<CardsIcon />}
          link={
            <Link href="/cards" className={`rounded-sm hover:text-chakra-500 ${STRETCHED} after:rounded-2xl`}>
              Open database
            </Link>
          }
        />
        <StatTile
          label="Sets"
          value={stats.sets}
          detail={stats.upcomingSets > 0 ? `${stats.upcomingSets} upcoming` : "All released"}
          icon={<LayersIcon />}
          link={
            <Link href="/sets" className={`rounded-sm hover:text-chakra-500 ${STRETCHED} after:rounded-2xl`}>
              Set checklists
            </Link>
          }
        />
        <StatTile
          label="Revealed"
          value={stats.revealed}
          detail={stats.latestReveal ? `Latest ${formatMonthDay(stats.latestReveal)}` : "No spoilers yet"}
          icon={<EyeIcon />}
          link={
            <Link href="/spoilers" className={`rounded-sm hover:text-chakra-500 ${STRETCHED} after:rounded-2xl`}>
              Spoiler center
            </Link>
          }
        />
        <StatTile
          label="Decklists"
          value={stats.decks}
          detail="Built with these cards"
          icon={<DeckIcon />}
          link={
            <a href={platformHref("decks")} className={`rounded-sm hover:text-chakra-500 ${STRETCHED} after:rounded-2xl`}>
              Browse decks
            </a>
          }
        />
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Latest reveals

export interface SpoilerSeason {
  set: CardSet;
  summary: SetSummary;
  daysLeft: number;
}

export function LatestReveals({
  cards,
  latest,
  season,
}: {
  cards: readonly NarutoCard[];
  /** Most recent reveal date in the dataset; anchors the NEW window. */
  latest: string | undefined;
  season: SpoilerSeason | undefined;
}) {
  return (
    <section aria-labelledby="latest-heading">
      <SectionHeader
        id="latest-heading"
        eyebrow="Spoilers"
        title="Latest reveals"
        action={<SectionLink href="/spoilers">All spoilers</SectionLink>}
      />

      {season && (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-chakra-500/30 bg-gradient-to-r from-chakra-500/10 via-shadow-900 to-shadow-900 p-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="min-w-0 sm:w-72 sm:shrink-0">
            <p className="flex items-center gap-2 text-xs">
              <span className="font-mono font-semibold text-chakra-400">{season.set.id}</span>
              <UpcomingBadge />
            </p>
            <p className="mt-1 truncate font-semibold text-white">{season.set.shortName}</p>
            <p className="text-sm text-ash-400">
              <time dateTime={season.set.releaseDate}>{formatDate(season.set.releaseDate)}</time> ·{" "}
              {pluralize(season.daysLeft, "day")} to go
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ash-200">
              <span className="font-bold text-white">{Math.min(season.summary.knownNumbers, season.set.totalCards)}</span> of{" "}
              {season.set.totalCards} cards revealed
            </p>
            <ProgressBar
              value={Math.min(season.summary.knownNumbers, season.set.totalCards)}
              max={season.set.totalCards}
              label={`${season.set.shortName} reveal progress`}
              valueText={`${season.summary.knownNumbers} of ${season.set.totalCards} cards revealed`}
              className="mt-2"
            />
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-shadow-700 bg-shadow-900/60 px-6 py-10 text-center text-sm text-ash-400">
          No cards have been revealed yet. New spoilers will show up here first.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-6">
          {cards.map((card) => (
            <li key={card.id} className="group relative">
              <div className="relative transition duration-300 motion-safe:group-hover:-translate-y-1">
                <CardImage card={card} className="shadow-lg shadow-black/50" />
              </div>
              {isNewReveal(card.reveal?.date, latest) && (
                <NewBadge className="pointer-events-none absolute -top-2 right-1.5 z-10" />
              )}
              <h3 className="mt-2 truncate text-sm font-semibold text-white">
                <Link href={cardHref(card.id)} className={`rounded-sm group-hover:text-chakra-400 ${STRETCHED} after:rounded-lg`}>
                  {card.name}
                </Link>
              </h3>
              {card.reveal && (
                <p className="text-xs text-ash-400">
                  Revealed <time dateTime={card.reveal.date}>{formatMonthDay(card.reveal.date)}</time>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Browse by element / type

const ELEMENT_TILE: Record<ChakraElement, string> = {
  fire: "border-fire/30 from-fire/20 hover:border-fire/70 hover:shadow-fire/20",
  water: "border-water/30 from-water/20 hover:border-water/70 hover:shadow-water/20",
  lightning: "border-lightning/30 from-lightning/15 hover:border-lightning/70 hover:shadow-lightning/20",
  earth: "border-earth/30 from-earth/20 hover:border-earth/70 hover:shadow-earth/20",
  wind: "border-wind/30 from-wind/15 hover:border-wind/70 hover:shadow-wind/20",
};

export function ElementTiles({ counts }: { counts: ReadonlyMap<ChakraElement, number> }) {
  return (
    <section aria-labelledby="elements-heading">
      <SectionHeader id="elements-heading" eyebrow="Chakra natures" title="Browse by element" />
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {CHAKRA_ELEMENTS.map((element, i) => {
          const meta = ELEMENT_META[element];
          return (
            <li key={element} className={i === CHAKRA_ELEMENTS.length - 1 ? "col-span-2 sm:col-span-1" : undefined}>
              <Link
                href={`/cards?element=${element}`}
                className={`${styles.elementTile} group relative flex h-full min-h-32 flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br to-shadow-900 p-4 shadow-lg shadow-black/20 hover:shadow-xl ${ELEMENT_TILE[element]} ${FOCUS}`}
              >
                <span
                  aria-hidden="true"
                  className={`${styles.kanji} ${meta.text} pointer-events-none absolute -bottom-5 -right-1 select-none text-8xl font-black leading-none opacity-[0.13] transition-opacity group-hover:opacity-25`}
                >
                  {meta.kanji}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-shadow-950/60 ring-1 ring-white/10">
                  <ElementIcon element={element} className="h-5 w-5" />
                </span>
                <span className="relative mt-6">
                  <span className="block text-lg font-bold text-white">{meta.label}</span>
                  <span className="text-sm text-ash-400">{pluralize(counts.get(element) ?? 0, "card")}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const TYPE_GLYPH: Record<CardType, string> = { leader: "将", character: "忍", mission: "任", jutsu: "術" };

export function TypeLinks({ counts }: { counts: ReadonlyMap<CardType, number> }) {
  return (
    <section aria-labelledby="types-heading">
      <SectionHeader id="types-heading" eyebrow="Card types" title="Browse by type" />
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {CARD_TYPES.map((type) => {
          const meta = TYPE_META[type];
          return (
            <li key={type}>
              <Link
                href={`/cards?type=${type}`}
                className={`group flex h-full items-start gap-4 rounded-2xl border border-shadow-700 bg-shadow-900 p-4 transition hover:border-chakra-500/50 hover:bg-shadow-800/70 ${FOCUS}`}
              >
                <span
                  aria-hidden="true"
                  className={`${styles.kanji} flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-shadow-700 bg-shadow-950 text-2xl font-black text-chakra-400 transition group-hover:border-chakra-500/50`}
                >
                  {TYPE_GLYPH[type]}
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-2">
                    <span className="font-bold text-white">{meta.plural}</span>
                    <span className="text-sm tabular-nums text-ash-400">{counts.get(type) ?? 0}</span>
                  </span>
                  <span className="mt-1 block text-sm text-ash-400">{meta.blurb}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sets row

export interface SetRowItem {
  set: CardSet;
  summary: SetSummary;
  released: boolean;
  daysLeft: number;
}

export function SetsRow({ items }: { items: readonly SetRowItem[] }) {
  return (
    <section aria-labelledby="sets-heading">
      <SectionHeader
        id="sets-heading"
        eyebrow="Collection"
        title="Sets & checklists"
        action={<SectionLink href="/sets">All sets</SectionLink>}
      />
      {items.length === 0 ? (
        <p className="mt-5 text-sm text-ash-400">No sets have been announced yet.</p>
      ) : (
        <ul
          className={`${styles.scroller} -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:gap-4 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0`}
          aria-label="Sets, newest first"
        >
          {items.map(({ set, summary, released, daysLeft }) => (
            <li key={set.id} className="w-64 shrink-0 sm:w-72 lg:w-auto">
              <Link
                href={setHref(set.id)}
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-shadow-700 bg-shadow-900 p-4 transition hover:border-chakra-500/50 ${FOCUS}`}
              >
                <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${KIND_BANNER[set.kind]}`} />
                <span className="relative flex items-center gap-2 text-xs">
                  <span className="rounded-md border border-shadow-500 bg-shadow-800 px-1.5 py-0.5 font-mono font-semibold text-ash-200">
                    {set.id}
                  </span>
                  <span className="font-semibold uppercase tracking-[0.14em] text-ash-400">{SET_KIND_LABEL[set.kind]}</span>
                </span>
                <span className="relative mt-3 line-clamp-2 font-bold leading-snug text-white group-hover:text-chakra-400">
                  {set.name}
                </span>
                <span className="relative mt-1 text-sm text-ash-400">
                  {released ? (
                    <>
                      Released <time dateTime={set.releaseDate}>{formatDate(set.releaseDate)}</time>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-chakra-400">Upcoming</span> ·{" "}
                      <time dateTime={set.releaseDate}>{formatDate(set.releaseDate)}</time>
                      {daysLeft > 0 && ` (${pluralize(daysLeft, "day")})`}
                    </>
                  )}
                </span>
                <span aria-hidden="true" className="relative mt-auto block pt-4">
                  <span className="flex justify-between text-xs text-ash-400">
                    <span>{released ? "Cards listed" : "Revealed"}</span>
                    <span className="tabular-nums text-ash-200">
                      {summary.knownNumbers} / {set.totalCards}
                    </span>
                  </span>
                  <ProgressBar
                    value={Math.min(summary.knownNumbers, set.totalCards)}
                    max={set.totalCards}
                    size="sm"
                    tone={released ? "muted" : "chakra"}
                    label={`${set.shortName} ${released ? "cards listed" : "reveal progress"}`}
                    valueText={`${summary.knownNumbers} of ${set.totalCards}`}
                    className="mt-1.5"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function daysUntil(today: string, date: string): number {
  return Math.max(0, daysBetween(today, date));
}
