import { cx } from "@naruto-tcg/ui";

/** Shared class strings for the overview, 404 and error pages. */

export const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";

export const BUTTON_PRIMARY = cx(
  "inline-flex items-center justify-center gap-2 rounded-md bg-chakra-500 px-4 py-2 text-sm font-semibold tracking-wide text-shadow-950 transition hover:bg-chakra-400",
  FOCUS_RING,
  "focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950",
);

export const BUTTON_GHOST = cx(
  "inline-flex items-center justify-center gap-2 rounded-md border border-shadow-500 px-4 py-2 text-sm font-semibold text-ash-200 transition hover:border-chakra-400 hover:text-chakra-300",
  FOCUS_RING,
);

export const TEXT_LINK = cx("rounded-sm hover:text-chakra-400", FOCUS_RING);

const MORE_LINK_BASE = cx(
  "inline-flex items-center gap-1 rounded-sm font-semibold text-chakra-400 hover:text-chakra-300",
  FOCUS_RING,
);

/** "See all →" style link used in section headers. */
export const MORE_LINK = `${MORE_LINK_BASE} text-sm`;

export const MORE_LINK_SM = `${MORE_LINK_BASE} text-xs`;

export const PANEL = "rounded-lg border border-shadow-700 bg-shadow-900";

export const EYEBROW = "text-xs font-semibold uppercase tracking-[0.16em] text-chakra-400";

export const MINI_LABEL = "text-[11px] font-medium uppercase tracking-wide text-ash-500";
