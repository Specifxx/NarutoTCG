/** Shared class strings and hrefs for the tournament pages. */

export const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";

export const BUTTON_PRIMARY = `inline-flex items-center justify-center gap-2 rounded-md bg-chakra-500 px-4 py-2 text-sm font-semibold tracking-wide text-shadow-950 transition hover:bg-chakra-400 ${FOCUS_RING}`;

export const BUTTON_GHOST = `inline-flex items-center justify-center gap-2 rounded-md border border-shadow-500 px-3 py-2 text-sm font-semibold text-ash-200 transition hover:border-chakra-400 hover:text-chakra-300 ${FOCUS_RING}`;

export const BUTTON_GHOST_SM = `inline-flex items-center justify-center gap-1.5 rounded-md border border-shadow-500 px-2.5 py-1 text-xs font-semibold text-ash-200 transition hover:border-chakra-400 hover:text-chakra-300 ${FOCUS_RING}`;

export const FIELD = `h-9 rounded-md border border-shadow-600 bg-shadow-900 px-3 text-sm text-ash-100 placeholder:text-ash-500 [color-scheme:dark] ${FOCUS_RING}`;

export const INLINE_LINK = `rounded-sm hover:text-chakra-400 ${FOCUS_RING}`;

export const playerHref = (playerId: string) => `/players/${encodeURIComponent(playerId)}`;
export const eventHref = (tournamentId: string) => `/tournaments/${encodeURIComponent(tournamentId)}`;
export const deckHref = (deckId: string) => `/deck/${encodeURIComponent(deckId)}`;
