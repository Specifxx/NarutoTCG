"use client";

import type { Deck } from "@naruto-tcg/types";
import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { emptyDeck, newDeckId } from "./deck";

interface DeckStoreState {
  decks: Deck[];
  activeId: string | null;
  hydrated: boolean;
  create: (name?: string) => string;
  save: (deck: Deck) => void;
  /** Saves a copy of a deck under a new id (used for starters and imports). */
  saveCopy: (deck: Deck, name?: string) => string;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  setActive: (id: string | null) => void;
}

export const useDeckStore = create<DeckStoreState>()(
  persist(
    (set, get) => ({
      decks: [],
      activeId: null,
      hydrated: false,
      create: (name) => {
        const deck = emptyDeck(name ?? `New Deck ${get().decks.length + 1}`);
        set((s) => ({ decks: [...s.decks, deck], activeId: deck.id }));
        return deck.id;
      },
      save: (deck) =>
        set((s) => ({
          decks: s.decks.some((d) => d.id === deck.id)
            ? s.decks.map((d) => (d.id === deck.id ? deck : d))
            : [...s.decks, deck],
        })),
      saveCopy: (deck, name) => {
        const now = new Date().toISOString();
        const copy: Deck = { ...deck, id: newDeckId(), name: name ?? deck.name, owner: undefined, createdAt: now, updatedAt: now };
        set((s) => ({ decks: [...s.decks, copy], activeId: copy.id }));
        return copy.id;
      },
      rename: (id, name) =>
        set((s) => ({
          decks: s.decks.map((d) => (d.id === id ? { ...d, name, updatedAt: new Date().toISOString() } : d)),
        })),
      remove: (id) =>
        set((s) => {
          const decks = s.decks.filter((d) => d.id !== id);
          return { decks, activeId: s.activeId === id ? (decks[0]?.id ?? null) : s.activeId };
        }),
      setActive: (id) => set({ activeId: id }),
    }),
    {
      name: "naruto-tcg-simulator:decks",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ decks: s.decks, activeId: s.activeId }),
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useDeckStore.setState({ hydrated: true });
      },
    },
  ),
);

/** Restores saved decks from localStorage after mount (keeps SSR markup deterministic). */
export function useDeckStoreHydration(): boolean {
  const hydrated = useDeckStore((s) => s.hydrated);
  useEffect(() => {
    if (!useDeckStore.getState().hydrated) void useDeckStore.persist.rehydrate();
  }, []);
  return hydrated;
}
