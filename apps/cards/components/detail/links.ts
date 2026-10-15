// Client-safe link builders for the card detail page.
import { cardsHref, phraseQuery } from "@/lib/search";

/**
 * Link into the card database search for a trait, keyword, or card name.
 * Multi-word terms are quoted so "Team 10" matches the phrase, not every card
 * that mentions "team" and "10" somewhere.
 */
export function cardSearchHref(query: string): "/cards" | `/cards?${string}` {
  return cardsHref({ query: phraseQuery(query) });
}
