import type { Tournament } from "@naruto-tcg/types";
import { createLocalStore, useLocalStore } from "./local-store";

/**
 * Tournaments a TO imported through the wizard, kept in this browser only. They are merged
 * with the seed data on the meta, tournament and deck pages.
 */

const EMPTY: Tournament[] = [];

function looksLikeTournament(value: unknown): value is Tournament {
  if (!value || typeof value !== "object") return false;
  const t = value as Partial<Tournament>;
  return (
    typeof t.id === "string" &&
    typeof t.name === "string" &&
    typeof t.date === "string" &&
    Array.isArray(t.players) &&
    Array.isArray(t.matches)
  );
}

export const importsStore = createLocalStore<Tournament[]>("ntcg.decks.imports.v1", EMPTY, (raw) =>
  Array.isArray(raw) ? raw.filter(looksLikeTournament) : null,
);

export function useImportedTournaments(): Tournament[] {
  return useLocalStore(importsStore)[0];
}

/** Adds or replaces (by id) an imported tournament. */
export function saveImportedTournament(tournament: Tournament): void {
  importsStore.set((prev) => [tournament, ...prev.filter((t) => t.id !== tournament.id)]);
}

export function removeImportedTournament(id: string): void {
  importsStore.set((prev) => prev.filter((t) => t.id !== id));
}

export function clearImportedTournaments(): void {
  importsStore.set(EMPTY);
}
