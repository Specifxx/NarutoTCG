import type { CardSet, NarutoCard } from "@naruto-tcg/types";
import type { Metadata } from "next";
import { CardBrowser, type BrowserCard, type BrowserSet } from "@/components/browser/CardBrowser";
import { DatabaseHeader } from "@/components/browser/DatabaseHeader";
import { getAllCards, getSets } from "@/lib/data";

export const metadata: Metadata = {
  title: "Card Database",
  description:
    "Search every Naruto TCG card by name, character tag, or rules text, and filter by card type, chakra element, cost, rarity, and set.",
};

/** Drop fields the browser never shows to keep the client payload small. */
function toBrowserCard(card: NarutoCard): BrowserCard {
  const { flavor: _flavor, artist: _artist, ...rest } = card;
  return rest;
}

function toBrowserSet({ id, name, shortName, kind, releaseDate }: CardSet): BrowserSet {
  return { id, name, shortName, kind, releaseDate };
}

export default function CardsPage() {
  const cards = getAllCards();
  const stats = {
    cards: cards.length,
    printings: cards.reduce((total, card) => total + card.printings.length, 0),
    sets: new Set(cards.flatMap((card) => card.printings.map((printing) => printing.setId))).size,
    reveals: cards.filter((card) => card.reveal !== undefined).length,
  };

  return (
    <>
      <DatabaseHeader stats={stats} />
      <CardBrowser cards={cards.map(toBrowserCard)} sets={getSets().map(toBrowserSet)} />
    </>
  );
}
