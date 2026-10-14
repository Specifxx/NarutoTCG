"use client";

import { cx } from "@naruto-tcg/ui";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { getArchetype } from "@/lib/data/archetypes";
import type { DeckDetail } from "@/lib/decks/types";
import { CommentThread } from "./comment-thread";
import { DeckActions } from "./deck-actions";
import { DeckCards } from "./deck-cards";
import { DeckHeader } from "./deck-header";
import { DeckStats } from "./deck-stats";
import { DeckWriteUp } from "./deck-write-up";
import { MatchupGuide } from "./matchup-guide";
import { OpeningHandDrawer } from "./opening-hand-drawer";
import { mulliganTargetsFor } from "./sample-hand";
import { FOCUS_RING } from "./styles";
import type { DeckContext } from "./types";

const JUMP_LINK = cx(
  "shrink-0 rounded-md border border-shadow-600 bg-shadow-800 px-2.5 py-1 text-xs font-medium text-ash-300 hover:border-shadow-500 hover:text-white",
  FOCUS_RING,
);

/**
 * The deck page body: header and actions, the decklist and stats, the author's write-up, the
 * matchup guide, comments and the opening-hand drawer. Client-safe: everything seed-derived
 * arrives in `context` as plain JSON, so imported decks render through the same view.
 */
export function DeckView({ deck, context }: { deck: DeckDetail; context: DeckContext }) {
  const drawerId = useId();
  const playtestRef = useRef<HTMLButtonElement>(null);
  const [playtestOpen, setPlaytestOpen] = useState(false);
  const archetype = getArchetype(deck.archetypeId);
  const targets = useMemo(
    () => mulliganTargetsFor(deck.decklist, archetype?.mulliganTargets ?? [], deck.keyCardIds),
    [deck.decklist, archetype, deck.keyCardIds],
  );
  const closePlaytest = useCallback(() => setPlaytestOpen(false), []);
  const hasWriteUp = (deck.description?.length ?? 0) > 0;

  const jumpLinks = [
    { href: "#decklist", label: "Decklist" },
    { href: "#stats", label: "Stats" },
    ...(hasWriteUp ? [{ href: "#write-up", label: "Write-up" }] : []),
    { href: "#matchups", label: "Matchups" },
    { href: "#comments", label: "Comments" },
  ];

  return (
    <>
      <DeckHeader
        deck={deck}
        tier={context.tier}
        actions={
          <DeckActions
            deck={deck}
            decklist={deck.decklist}
            drawerId={drawerId}
            playtestOpen={playtestOpen}
            playtestRef={playtestRef}
            onPlaytest={() => setPlaytestOpen(true)}
          />
        }
      />

      <nav aria-label="On this page" className="-mt-4 flex gap-2 relative overflow-x-auto pb-1">
        {jumpLinks.map((link) => (
          <a key={link.href} href={link.href} className={JUMP_LINK}>
            {link.label}
          </a>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <DeckCards decklist={deck.decklist} archetypeId={deck.archetypeId} targets={targets} />
        <DeckStats decklist={deck.decklist} />
      </div>

      {hasWriteUp && <DeckWriteUp paragraphs={deck.description!} authorName={deck.author.name} />}

      <MatchupGuide archetypeId={deck.archetypeId} context={context} matchupNotes={deck.matchupNotes} authorName={deck.author.name} />

      <CommentThread deckId={deck.id} deckAuthorHandle={deck.author.handle} seedComments={context.comments} />

      <OpeningHandDrawer
        id={drawerId}
        open={playtestOpen}
        onClose={closePlaytest}
        returnFocusRef={playtestRef}
        deckName={deck.name}
        decklist={deck.decklist}
        targets={targets}
      />
    </>
  );
}
