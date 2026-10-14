"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { normalizeCards } from "./normalize";
import type { CardDb, SimCard } from "./types";

export const CARD_DATA_URL = "/data/cards.json";

type Status = "idle" | "loading" | "ready" | "error";

interface CardPoolState {
  status: Status;
  cards: SimCard[];
  db: CardDb;
  warnings: string[];
  error: string | null;
  load: () => Promise<void>;
}

export const useCardPoolStore = create<CardPoolState>((set, get) => ({
  status: "idle",
  cards: [],
  db: {},
  warnings: [],
  error: null,
  load: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading", error: null });
    try {
      const res = await fetch(CARD_DATA_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${CARD_DATA_URL}`);
      const { cards, warnings } = normalizeCards(await res.json());
      if (cards.length === 0) throw new Error(`${CARD_DATA_URL} contained no valid cards.`);
      const db: Record<string, SimCard> = {};
      for (const c of cards) db[c.id] = c;
      set({ status: "ready", cards, db, warnings });
    } catch (e) {
      set({ status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  },
}));

/** Loads the card pool once and returns it. */
export function useCardPool() {
  const state = useCardPoolStore();
  const load = state.load;
  useEffect(() => {
    void load();
  }, [load]);
  return state;
}
