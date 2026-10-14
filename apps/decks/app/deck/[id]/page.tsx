import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deckPageTitle } from "@/components/deck/deck-meta";
import { DeckView } from "@/components/deck/deck-view";
import { ImportedDeckLoader } from "@/components/deck/imported-deck-loader";
import { isImportedDeckId } from "@/components/deck/imported-deck";
import { buildSeedDeckContext, seedTierMap } from "@/components/deck/server-context";
import { PageContainer } from "@/components/ui/page-header";
import { getArchetype } from "@/lib/data/archetypes";
import { getDeck, getDeckSummaries } from "@/lib/decks/repository";
import { parseDeckId } from "@/lib/decks/types";
import { EVENT_TIER_LABEL, formatDate } from "@/lib/format";
import { placementLabel } from "@/lib/tournament/standings";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = true;

export function generateStaticParams(): Array<{ id: string }> {
  return getDeckSummaries().map((deck) => ({ id: deck.id }));
}

function decodeId(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    // Malformed escape: look the raw segment up as-is.
    return raw;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeId((await params).id);
  const deck = getDeck(id);
  if (deck) {
    const archetype = getArchetype(deck.archetypeId)?.name ?? deck.archetypeId;
    const event = deck.tournament;
    return {
      title: deckPageTitle(deck),
      description: event
        ? `${archetype} decklist: ${placementLabel(event.placement, event.topCutSize)} at ${event.name} (${EVENT_TIER_LABEL[event.tier]}, ${formatDate(event.date)}). Card list, cost curve, opening-hand odds and matchup guide (fictional demo data).`
        : `${archetype} community decklist by ${deck.author.name}: card list, cost curve, opening-hand odds, matchup notes and comments (fictional demo data).`,
    };
  }
  if (isImportedDeckId(id)) return { title: "Imported deck", robots: { index: false } };
  return { title: "Deck not found" };
}

export default async function DeckPage({ params }: Props) {
  const id = decodeId((await params).id);
  const deck = getDeck(id);
  if (deck) {
    return (
      <PageContainer>
        <DeckView deck={deck} context={buildSeedDeckContext(deck)} />
      </PageContainer>
    );
  }
  const parsed = parseDeckId(id);
  if (parsed?.kind === "tournament" && isImportedDeckId(id)) {
    return (
      <PageContainer>
        <ImportedDeckLoader deckId={id} tournamentId={parsed.tournamentId} tiers={seedTierMap()} />
      </PageContainer>
    );
  }
  notFound();
}
