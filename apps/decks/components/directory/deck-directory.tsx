"use client";

import { cx } from "@naruto-tcg/ui";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FocusEvent, type ReactNode } from "react";
import { EmptyState } from "@/components/ui/badges";
import { DECK_SORT_LABELS, searchDecks, type DeckSort } from "@/lib/decks/catalog";
import type { DeckSummary } from "@/lib/decks/types";
import { formatNumber, pluralize } from "@/lib/format";
import type { TierId } from "@/lib/meta/types";
import { deckVotesStore } from "@/lib/storage/community";
import { useImportedTournaments } from "@/lib/storage/imports";
import { useLocalStore } from "@/lib/storage/local-store";
import { DeckFilters } from "./deck-filters";
import { PAGE_SIZE, cardOptionsFor, featuredDecks, importedDeckSummaries, mergeDecks, type CardOption } from "./decks";
import {
  hasActiveFilters,
  parseDeckParams,
  resetDeckFilters,
  serializeDeckParams,
  toDeckQuery,
  type DeckParams,
} from "./params";
import { BUTTON_GHOST, BUTTON_PRIMARY, FIELD, FIELD_LABEL } from "./styles";
import { VotedDeckCard } from "./voted-deck-card";

const TEXT_DEBOUNCE_MS = 150;

export interface DeckDirectoryProps {
  /** Seed directory rows, newest first. */
  decks: DeckSummary[];
  /** Seed tier per archetype id. */
  tiers: Record<string, TierId>;
  /** Card filter options for every card in a seed deck. */
  cards: CardOption[];
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M5 2h10v2h3v2.5A3.5 3.5 0 0 1 14.6 10a5 5 0 0 1-3.6 3V15h3v3H6v-3h3v-2a5 5 0 0 1-3.6-3A3.5 3.5 0 0 1 2 6.5V4h3V2Zm0 4H4v.5c0 .8.4 1.4 1 1.7V6Zm10 0v2.2c.6-.3 1-.9 1-1.7V6h-1Z"
      />
    </svg>
  );
}

function UpvoteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path d="M10 4 16 12H4L10 4Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Keeps the focused card fully visible in the swipeable strip: Chrome does not scroll a nested
 * scroller for a partly visible focus target, and with mandatory snapping a small scroll would
 * snap straight back, so scroll the whole snap item (the <li>) instead of the focused link.
 */
function revealFocusedItem(event: FocusEvent<HTMLUListElement>) {
  if (event.target === event.currentTarget) return;
  const item = event.target.closest("li");
  if (item && event.currentTarget.contains(item)) item.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function FeaturedGroup({
  title,
  icon,
  decks,
  tierOf,
}: {
  title: string;
  icon: ReactNode;
  decks: DeckSummary[];
  tierOf: (archetypeId: string) => TierId | undefined;
}) {
  const id = useId();
  if (decks.length === 0) return null;
  return (
    <div className="min-w-0">
      <h3 id={id} className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-ash-300">
        {icon}
        {title}
      </h3>
      {/* A swipeable strip on small screens (it scrolls inside itself), a 3-up grid from md. */}
      <ul
        aria-labelledby={id}
        onFocus={revealFocusedItem}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 relative overflow-x-auto px-4 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0 md:grid md:grid-cols-3 md:overflow-visible md:pb-0"
      >
        {decks.map((deck) => (
          <li key={deck.id} className="w-[17.5rem] max-w-[85%] shrink-0 snap-start md:w-auto md:max-w-none">
            <VotedDeckCard deck={deck} tier={tierOf(deck.archetypeId)} headingLevel={4} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A change to the directory state, applied to the latest state (the URL may be ahead of the last render). */
type DeckParamsUpdate = (prev: DeckParams) => DeckParams;

/**
 * The directory body for one query string: seed decks plus decks from events imported in this
 * browser, filtered and sorted client-side. `onChange` is absent in the Suspense fallback, which
 * renders the unfiltered view with inert controls.
 */
function DirectoryView({
  decks,
  tiers,
  cards,
  query,
  onChange,
}: DeckDirectoryProps & { query: string; onChange?: (update: DeckParamsUpdate) => void }) {
  const id = useId();
  const imported = useImportedTournaments();
  // Seed events the directory already lists; a re-import of one adds no second copy of its decks.
  const seedEventIds = useMemo(() => new Set(decks.flatMap((deck) => (deck.tournament ? [deck.tournament.id] : []))), [decks]);
  const importedDecks = useMemo(() => importedDeckSummaries(imported, seedEventIds), [imported, seedEventIds]);
  const all = useMemo(() => mergeDecks(decks, importedDecks), [decks, importedDecks]);
  const importedIds = useMemo(() => new Set(all.slice(decks.length).map((deck) => deck.id)), [all, decks.length]);
  const cardOptions = useMemo(() => cardOptionsFor(importedDecks, cards), [importedDecks, cards]);
  // This browser's votes: "Most upvoted" ranks by the counts the cards show (seed + vote).
  // Empty on the server and the first render, like the cards themselves.
  const [localVotes] = useLocalStore(deckVotesStore);

  const state = useMemo(() => parseDeckParams(query), [query]);
  const results = useMemo(() => searchDecks(all, { ...toDeckQuery(state), localVotes }), [all, state, localVotes]);
  const filtering = hasActiveFilters(state);
  const featured = useMemo(() => (filtering ? null : featuredDecks(all, undefined, localVotes)), [filtering, all, localVotes]);
  const importedShown = importedIds.size > 0 ? results.filter((deck) => importedIds.has(deck.id)).length : 0;
  const tierOf = (archetypeId: string) => {
    const tier = tiers[archetypeId];
    return tier && tier !== "unranked" ? tier : undefined;
  };

  // The debounce timer reads the latest `onChange` through a ref; every change is an updater
  // applied to the URL's current state, so quick successive changes never drop one another.
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // The search box edits a local draft; the URL follows after a short pause.
  const [draft, setDraft] = useState(state.text);
  const [syncedText, setSyncedText] = useState(state.text);
  if (syncedText !== state.text) {
    // The URL changed under us (reset, back/forward, a nav link): adopt it unless it is our own draft.
    setSyncedText(state.text);
    if (draft.trim() !== state.text) setDraft(state.text);
  }
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const takePendingText = (): Partial<DeckParams> => {
    if (timer.current === undefined) return {};
    window.clearTimeout(timer.current);
    timer.current = undefined;
    return { text: draft };
  };

  const update = (patch: Partial<DeckParams>) => {
    if (!onChange) return;
    const pending = takePendingText();
    onChange((prev) => ({ ...prev, ...pending, ...patch }));
  };

  const onTextChange = (value: string) => {
    setDraft(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      onChangeRef.current?.((prev) => ({ ...prev, text: value }));
    }, TEXT_DEBOUNCE_MS);
  };

  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const reset = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    setDraft("");
    onChange?.(resetDeckFilters);
    // Both reset buttons unmount once nothing is filtered: land on the results heading, not <body>.
    resultsHeading.current?.focus();
  };

  // "Show more" pagination, reset whenever the filters or sort change.
  const resultsKey = serializeDeckParams(state);
  const [page, setPage] = useState({ key: resultsKey, count: PAGE_SIZE });
  // Drop the old count on every change, so returning to an earlier query starts from one page again.
  if (page.key !== resultsKey) setPage({ key: resultsKey, count: PAGE_SIZE });
  const visible = page.key === resultsKey ? page.count : PAGE_SIZE;
  const listRef = useRef<HTMLUListElement>(null);
  const focusFrom = useRef<number | null>(null);
  useEffect(() => {
    if (focusFrom.current === null) return;
    listRef.current?.children[focusFrom.current]?.querySelector<HTMLAnchorElement>("h3 a")?.focus();
    focusFrom.current = null;
  }, [visible]);
  const showMore = () => {
    focusFrom.current = visible;
    setPage({ key: resultsKey, count: visible + PAGE_SIZE });
  };

  const resetButton = (
    <button type="button" onClick={reset} disabled={!onChange} className={BUTTON_PRIMARY}>
      Reset filters
    </button>
  );

  return (
    <div className="flex flex-col gap-8">
      <DeckFilters
        state={state}
        text={draft}
        cards={cardOptions}
        onTextChange={onChange && onTextChange}
        onTextSubmit={() => update({})}
        onChange={onChange && update}
      />

      {featured && (featured.winners.length > 0 || featured.community.length > 0) && (
        <section aria-labelledby={`${id}-featured`} className="flex flex-col gap-4">
          <div>
            <h2 id={`${id}-featured`} className="text-xl font-bold text-white">
              Featured
            </h2>
            <p className="mt-1 text-sm text-ash-400">The latest event winners and the community&rsquo;s most upvoted lists.</p>
          </div>
          <FeaturedGroup
            title="Latest event winners"
            icon={<TrophyIcon className="h-3.5 w-3.5 text-chakra-400" />}
            decks={featured.winners}
            tierOf={tierOf}
          />
          <FeaturedGroup
            title="Top community decks"
            icon={<UpvoteIcon className="h-3.5 w-3.5 text-chakra-400" />}
            decks={featured.community}
            tierOf={tierOf}
          />
        </section>
      )}

      <section aria-labelledby={`${id}-results`} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 ref={resultsHeading} id={`${id}-results`} tabIndex={-1} className="text-xl font-bold text-white focus:outline-none">
              {filtering ? "Matching decks" : "All decks"}
            </h2>
            <p aria-live="polite" className="mt-1 text-sm text-ash-400">
              <span className="font-semibold tabular-nums text-ash-100">{formatNumber(results.length)}</span>{" "}
              {results.length === 1 ? "deck" : "decks"}
              {importedShown > 0 && <> · incl. {pluralize(importedShown, "deck")} from events imported in this browser</>}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {filtering && results.length > 0 && (
              <button type="button" onClick={reset} disabled={!onChange} className={BUTTON_GHOST}>
                Reset filters
              </button>
            )}
            <div className="flex items-center gap-2">
              <label htmlFor={`${id}-sort`} className={FIELD_LABEL}>
                Sort by
              </label>
              <select
                id={`${id}-sort`}
                value={state.sort}
                disabled={!onChange}
                onChange={(event) => update({ sort: event.target.value as DeckSort })}
                className={cx(FIELD, "pr-8")}
              >
                {Object.entries(DECK_SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {results.length === 0 ? (
          <EmptyState title="No decks match these filters">
            <p>Try fewer archetypes or cards, another event tier, or a shorter search.</p>
            <div className="mt-4">{resetButton}</div>
          </EmptyState>
        ) : (
          <>
            <ul ref={listRef} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.slice(0, visible).map((deck) => (
                <li key={deck.id} className="min-w-0">
                  <VotedDeckCard deck={deck} tier={tierOf(deck.archetypeId)} />
                </li>
              ))}
            </ul>
            {results.length > visible && (
              <div className="flex flex-col items-center gap-2 pt-2">
                <p className="text-sm text-ash-400">
                  Showing <span className="tabular-nums text-ash-200">{formatNumber(visible)}</span> of{" "}
                  <span className="tabular-nums text-ash-200">{formatNumber(results.length)}</span>
                </p>
                <button type="button" onClick={showMore} className={BUTTON_GHOST}>
                  Show {formatNumber(Math.min(PAGE_SIZE, results.length - visible))} more
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/**
 * URL-synced deck directory. Filtering is entirely client-side, so changes go through the native
 * History API (as on /meta): Next integrates `history.replaceState` with the App Router, so
 * `useSearchParams` follows without a server round-trip (no RSC refetch of the whole deck list,
 * and no hard-navigation fallback when offline), and the scroll position stays put. Updates read
 * and write `window.location` directly, which is current even before React re-renders.
 * The server parent must wrap it in <Suspense>.
 */
export function DeckDirectory(props: DeckDirectoryProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = useCallback(
    (update: DeckParamsUpdate) => {
      const current = window.location.search.replace(/^\?/, "");
      const nextQuery = serializeDeckParams(update(parseDeckParams(current)), current);
      if (nextQuery === current) return;
      window.history.replaceState(null, "", `${pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`);
    },
    [pathname],
  );

  return <DirectoryView {...props} query={searchParams.toString()} onChange={onChange} />;
}

/** Suspense fallback: the unfiltered directory with inert controls, so the static HTML carries real decks. */
export function DeckDirectoryFallback(props: DeckDirectoryProps) {
  return <DirectoryView {...props} query="" />;
}
