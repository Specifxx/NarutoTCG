// Client-safe link builders for the card detail page.
import { cardsHref } from "@/lib/search";

/** Link into the card database search for a trait, keyword, or card name. */
export function cardSearchHref(query: string): "/cards" | `/cards?${string}` {
  return cardsHref({ query });
}
