import type { Tournament } from "@naruto-tcg/types";
import { createLocalStore, useLocalStore } from "./local-store";
import { sanitizeTournament } from "./sanitize";

/**
 * Tournaments a TO imported through the wizard, kept in this browser only. They are merged
 * with the seed data on the meta, tournament and deck pages.
 */

const EMPTY: Tournament[] = [];

/**
 * Every readable stored record, sanitized (see {@link sanitizeTournament}), in stored order.
 * Unreadable records are skipped so one bad entry never hides the others. Runs once per change
 * of the stored value, so pages get the same objects on every render.
 */
function parseImports(raw: unknown): Tournament[] | null {
  if (!Array.isArray(raw)) return null;
  const tournaments: Tournament[] = [];
  for (const item of raw) {
    try {
      const tournament = sanitizeTournament(item);
      if (tournament) tournaments.push(tournament);
    } catch {
      // Skipped: a record the sanitizer cannot read must not take the other imports down.
    }
  }
  return tournaments;
}

export const importsStore = createLocalStore<Tournament[]>("ntcg.decks.imports.v1", EMPTY, parseImports);

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
