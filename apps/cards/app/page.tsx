import type { CardType, ChakraElement, NarutoCard } from "@naruto-tcg/types";
import type { Metadata } from "next";
import { HomeHero, type HeroCard } from "@/components/home/HomeHero";
import {
  ElementTiles,
  LatestReveals,
  SetsRow,
  StatTiles,
  TypeLinks,
  daysUntil,
  type SetRowItem,
  type SpoilerSeason,
} from "@/components/home/HomeSections";
import { latestRevealDate, summarizeSet } from "@/components/spoilers/reveals";
import { getAllCards, getDecks, getRevealedCards, getSetEntries, getSets } from "@/lib/data";
import { RARITY_META, isReleased, primaryPrinting, todayIso } from "@/lib/meta";

export const metadata: Metadata = {
  title: { absolute: "Naruto TCG · Card Database, Spoilers & Set Checklists" },
  description:
    "Search every Naruto TCG card, follow the latest spoilers and reveal countdowns, and track your collection with set checklists.",
};

const LATEST_REVEALS = 6;
const SUGGESTIONS = 5;
const HOME_SETS = 8;

function countBy<K extends string>(cards: readonly NarutoCard[], pick: (card: NarutoCard) => K): Map<K, number> {
  const counts = new Map<K, number>();
  for (const card of cards) counts.set(pick(card), (counts.get(pick(card)) ?? 0) + 1);
  return counts;
}

const maxRarityRank = (card: NarutoCard): number => Math.max(...card.printings.map((p) => RARITY_META[p.rarity].rank));

/** Most common traits, then keywords, as quick-search suggestions. */
function popularTerms(cards: readonly NarutoCard[], limit: number): string[] {
  const traits = new Map<string, number>();
  const keywords = new Map<string, number>();
  for (const card of cards) {
    for (const trait of card.traits) traits.set(trait, (traits.get(trait) ?? 0) + 1);
    for (const keyword of card.keywords) keywords.set(keyword, (keywords.get(keyword) ?? 0) + 1);
  }
  const top = (map: Map<string, number>, n: number) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, n)
      .map(([term]) => term);
  const keywordSlots = Math.min(2, keywords.size);
  return [...new Set([...top(traits, limit - keywordSlots), ...top(keywords, keywordSlots)])].slice(0, limit);
}

/** Three cards for the hero fan: newest reveals first, topped up with the rarest printings. */
function heroShowcase(cards: readonly NarutoCard[], revealed: readonly NarutoCard[]): HeroCard[] {
  const rarest = (card: NarutoCard): HeroCard => {
    const printing = [...card.printings].sort((a, b) => RARITY_META[b.rarity].rank - RARITY_META[a.rarity].rank)[0];
    return { card, printing: printing ?? primaryPrinting(card) };
  };
  const picks = new Map<string, HeroCard>();
  for (const card of revealed) {
    if (picks.size >= 3) break;
    picks.set(card.id, rarest(card));
  }
  if (picks.size < 3) {
    const byRarity = [...cards].sort((a, b) => maxRarityRank(b) - maxRarityRank(a));
    for (const card of byRarity) {
      if (picks.size >= 3) break;
      if (!picks.has(card.id)) picks.set(card.id, rarest(card));
    }
  }
  // The first pick renders last so it sits on top of the fan.
  return [...picks.values()].reverse();
}

export default function OverviewPage() {
  const today = todayIso();
  const cards = getAllCards();
  const sets = getSets();
  const revealed = getRevealedCards();
  const latest = latestRevealDate(revealed);

  const setItems: SetRowItem[] = sets.map((set) => ({
    set,
    summary: summarizeSet(set, getSetEntries(set.id)),
    released: isReleased(set, today),
    daysLeft: daysUntil(today, set.releaseDate),
  }));
  const upcoming = setItems.filter((item) => !item.released);
  // Spoiler season: the soonest unreleased set that has reveals.
  const seasonItem = upcoming.find((item) => item.summary.latestReveal !== undefined);
  const season: SpoilerSeason | undefined = seasonItem && {
    set: seasonItem.set,
    summary: seasonItem.summary,
    daysLeft: seasonItem.daysLeft,
  };

  const elementCounts = countBy<ChakraElement>(cards, (card) => card.element);
  const typeCounts = countBy<CardType>(cards, (card) => card.type);

  return (
    <>
      <HomeHero
        cardCount={cards.length}
        setCount={sets.length}
        suggestions={popularTerms(cards, SUGGESTIONS)}
        showcase={heroShowcase(cards, revealed)}
      />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:space-y-20 sm:px-6 sm:py-14">
        <StatTiles
          stats={{
            cards: cards.length,
            sets: sets.length,
            upcomingSets: upcoming.length,
            revealed: revealed.length,
            ...(latest !== undefined && { latestReveal: latest }),
            decks: getDecks().length,
          }}
        />
        <LatestReveals cards={revealed.slice(0, LATEST_REVEALS)} latest={latest} season={season} />
        <ElementTiles counts={elementCounts} />
        <TypeLinks counts={typeCounts} />
        {/* Newest first: upcoming and recent sets are what people check most. */}
        <SetsRow items={[...setItems].reverse().slice(0, HOME_SETS)} />
      </div>
    </>
  );
}
