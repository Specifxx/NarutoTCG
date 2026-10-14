import type { Decklist } from "@naruto-tcg/types";
import { appUrl } from "@naruto-tcg/ui";
import { encodeDecklist } from "@/lib/decks/deck-utils";

/** Share codes, cross-app links and file names for the deck actions. */

/** The canonical share code, or null when the list holds ids the code cannot represent (some imports). */
export function deckShareCode(decklist: Decklist): string | null {
  try {
    return encodeDecklist(decklist);
  } catch {
    return null;
  }
}

/** Opens the list in the Simulator app. */
export function simulatorHref(code: string): string {
  return `${appUrl("simulator")}/?deck=${encodeURIComponent(code)}`;
}

/** Prices the list in the Compare app. */
export function priceCheckHref(code: string): string {
  return `${appUrl("compare")}/?deck=${encodeURIComponent(code)}`;
}

/** "Uchiha Avenger by Saga Lindgren" → "uchiha-avenger-by-saga-lindgren.txt" (accents folded, ASCII only). */
export function deckFileName(deck: { name: string; author: { name: string } }): string {
  const slug = `${deck.name} by ${deck.author.name}`
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
  return `${slug || "decklist"}.txt`;
}
