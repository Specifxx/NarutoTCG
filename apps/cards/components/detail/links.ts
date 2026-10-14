// Client-safe link builders for the card detail page.

/**
 * Link into the card database search using the shared `/cards` URL contract.
 * Typed as a static route plus query string so next/link's typed routes accept it.
 */
export function cardSearchHref(query: string): `/cards?${string}` {
  return `/cards?q=${encodeURIComponent(query.trim())}`;
}
