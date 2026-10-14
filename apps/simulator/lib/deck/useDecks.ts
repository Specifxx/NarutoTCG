"use client";

import type { Deck } from "@naruto-tcg/types";
import { useMemo } from "react";
import { useCardPoolStore } from "../cards/store";
import { getStarterDecks } from "./autobuild";
import { useDeckStore } from "./store";

/** Saved decks plus the starter decks generated from the current card pool. */
export function useAllDecks() {
  const saved = useDeckStore((s) => s.decks);
  const cards = useCardPoolStore((s) => s.cards);
  const starters = useMemo(() => (cards.length ? getStarterDecks(cards) : []), [cards]);
  return useMemo(() => {
    const all: Deck[] = [...saved, ...starters];
    return { saved, starters, all, byId: (id: string | null | undefined) => all.find((d) => d.id === id) ?? null };
  }, [saved, starters]);
}
