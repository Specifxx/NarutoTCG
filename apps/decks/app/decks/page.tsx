import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DeckDirectory, DeckDirectoryFallback, type DeckDirectoryProps } from "@/components/directory/deck-directory";
import { cardOptionsFor } from "@/components/directory/decks";
import { BUTTON_GHOST } from "@/components/directory/styles";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { ARCHETYPES } from "@/lib/data/archetypes";
import { getSeedTier } from "@/lib/data/meta";
import { getDeckSummaries } from "@/lib/decks/repository";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Decks",
  description:
    "Search tournament decklists and community builds for the Naruto TCG by archetype, event tier, finish and card (fictional demo data).",
};

export default function DecksPage() {
  const decks = [...getDeckSummaries()];
  const props: DeckDirectoryProps = {
    decks,
    tiers: Object.fromEntries(ARCHETYPES.map((archetype) => [archetype.id, getSeedTier(archetype.id)])),
    cards: cardOptionsFor(decks),
  };
  const tournamentCount = decks.filter((deck) => deck.source === "tournament").length;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Deck database"
        title="Decks"
        description={`${formatNumber(tournamentCount)} published tournament lists and ${formatNumber(decks.length - tournamentCount)} community builds. Filter by archetype, event tier, finish or the cards a list runs. Every event, player and deck here is fictional demo data.`}
        actions={
          <Link href="/meta" className={BUTTON_GHOST}>
            Meta tier list
          </Link>
        }
      />
      <Suspense fallback={<DeckDirectoryFallback {...props} />}>
        <DeckDirectory {...props} />
      </Suspense>
    </PageContainer>
  );
}
