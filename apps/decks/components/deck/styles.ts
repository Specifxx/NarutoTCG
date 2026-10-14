import { cx } from "@naruto-tcg/ui";

/** Shared class strings for the deck page. */

export const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";

export const BUTTON_PRIMARY = cx(
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-chakra-500 px-3 py-1.5 text-sm font-semibold text-shadow-950 transition hover:bg-chakra-400 disabled:cursor-not-allowed disabled:opacity-50",
  FOCUS_RING,
  "focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950",
);

export const BUTTON_GHOST = cx(
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-shadow-500 px-3 py-1.5 text-sm font-semibold text-ash-200 transition hover:border-chakra-400 hover:text-chakra-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-shadow-500 disabled:hover:text-ash-200",
  FOCUS_RING,
);

export const BUTTON_GHOST_SM = cx(
  "inline-flex items-center justify-center gap-1 rounded-md border border-shadow-600 px-2 py-1 text-xs font-semibold text-ash-300 transition hover:border-chakra-400 hover:text-chakra-300 disabled:cursor-not-allowed disabled:opacity-50",
  FOCUS_RING,
);

export const FIELD = cx(
  "h-9 rounded-md border border-shadow-600 bg-shadow-800 px-3 text-sm text-ash-100 placeholder:text-ash-500 [color-scheme:dark] hover:border-shadow-500",
  FOCUS_RING,
);

export const TEXTAREA = cx(
  "w-full rounded-md border border-shadow-600 bg-shadow-800 px-3 py-2 text-sm text-ash-100 placeholder:text-ash-500 [color-scheme:dark] hover:border-shadow-500",
  FOCUS_RING,
);

export const FIELD_LABEL = "text-xs font-medium text-ash-400";

export const TEXT_LINK = cx("rounded-sm font-medium text-ash-100 underline-offset-2 hover:text-chakra-400 hover:underline", FOCUS_RING);

export const PANEL = "rounded-lg border border-shadow-700 bg-shadow-900";

/** Segmented control button (aria-pressed carries the state). */
export function segmentClass(pressed: boolean): string {
  return cx(
    "rounded px-2.5 py-1 text-xs font-semibold transition",
    FOCUS_RING,
    pressed ? "bg-shadow-700 text-white" : "text-ash-400 hover:text-white",
  );
}

export const SEGMENTED = "inline-flex rounded-md border border-shadow-600 bg-shadow-900 p-0.5";

export const playerHref = (handle: string) => `/players/${encodeURIComponent(handle)}`;
export const eventHref = (tournamentId: string) => `/tournaments/${encodeURIComponent(tournamentId)}`;
