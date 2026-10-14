"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { EmptyState } from "@/components/ui/badges";
import { PageHeader } from "@/components/ui/page-header";
import type { TierId } from "@/lib/meta/types";
import { useImportedTournaments } from "@/lib/storage/imports";
import { useHydrated } from "@/lib/storage/local-store";
import { deckPageTitle } from "./deck-meta";
import { DeckView } from "./deck-view";
import { findImportedDeck } from "./imported-deck";
import { BUTTON_GHOST, BUTTON_PRIMARY, FOCUS_RING } from "./styles";
import { EMPTY_DECK_CONTEXT } from "./types";

function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Loading the imported deck from this browser…</span>
      <div aria-hidden="true" className="flex animate-pulse flex-col gap-4 border-b border-shadow-700 pb-6">
        <div className="h-3 w-32 rounded bg-shadow-700" />
        <div className="h-9 w-3/4 max-w-xl rounded bg-shadow-700" />
        <div className="h-4 w-1/2 max-w-md rounded bg-shadow-800" />
      </div>
      <div aria-hidden="true" className="grid animate-pulse grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[63/88] rounded-xl border border-shadow-700 bg-shadow-900" />
        ))}
      </div>
    </div>
  );
}

/**
 * Deck page for a deck from an event imported in this browser: looks the event up once storage
 * is readable and renders the regular view without seed matchup data.
 */
export function ImportedDeckLoader({ deckId, tournamentId, tiers }: { deckId: string; tournamentId: string; tiers: Record<string, TierId> }) {
  const hydrated = useHydrated();
  const imported = useImportedTournaments();
  const deck = useMemo(() => findImportedDeck(imported, deckId), [imported, deckId]);

  useEffect(() => {
    if (deck) document.title = `${deckPageTitle(deck)} · Naruto TCG Decks`;
  }, [deck]);

  if (!hydrated) return <LoadingState />;

  if (!deck) {
    const eventStored = imported.some((t) => t.id === tournamentId);
    return (
      <>
        <PageHeader
          eyebrow={
            <Link href="/decks" className={`rounded-sm hover:text-chakra-300 ${FOCUS_RING}`}>
              Decks
            </Link>
          }
          title="Deck not found in this browser"
          description={
            eventStored
              ? "The imported event is here, but it has no published list for this player."
              : "Imported events are stored only in the browser that imported them. This one may have been deleted, or imported on another device."
          }
        />
        <EmptyState title="Nothing to show for this link">
          <p>Import the event again, decklists included, to see this deck here.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {eventStored ? (
              <Link href={`/tournaments/${encodeURIComponent(tournamentId)}`} className={BUTTON_PRIMARY}>
                Open the imported event
              </Link>
            ) : (
              <Link href="/tournaments/import" className={BUTTON_PRIMARY}>
                Open the import wizard
              </Link>
            )}
            <Link href="/decks" className={BUTTON_GHOST}>
              Browse all decks
            </Link>
          </div>
        </EmptyState>
      </>
    );
  }

  return <DeckView deck={deck} context={{ ...EMPTY_DECK_CONTEXT, tier: tiers[deck.archetypeId] ?? null }} />;
}
