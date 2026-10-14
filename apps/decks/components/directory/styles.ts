import { cx } from "@naruto-tcg/ui";

/** Shared class strings for the deck directory and player pages. */

export const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";

export const FIELD = cx(
  "h-9 rounded-md border border-shadow-600 bg-shadow-800 px-3 text-sm text-ash-100 placeholder:text-ash-500 [color-scheme:dark] hover:border-shadow-500 disabled:opacity-60",
  FOCUS_RING,
);

export const FIELD_LABEL = "text-xs font-medium text-ash-400";

export const BUTTON_GHOST = cx(
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-shadow-500 px-3 py-1.5 text-sm font-semibold text-ash-200 transition hover:border-chakra-400 hover:text-chakra-300 disabled:opacity-60",
  FOCUS_RING,
);

export const BUTTON_PRIMARY = cx(
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-chakra-500 px-3 py-1.5 text-sm font-semibold text-shadow-950 transition hover:bg-chakra-400",
  FOCUS_RING,
  "focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950",
);

export const TEXT_LINK = cx("rounded-sm font-medium text-ash-100 hover:text-chakra-400", FOCUS_RING);

/** Toggle chip; pressed state uses the accent border, never color alone (a check mark is added). */
export function chipClass(pressed: boolean): string {
  return cx(
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60",
    FOCUS_RING,
    pressed
      ? "border-chakra-500 bg-chakra-500/15 text-white"
      : "border-shadow-600 bg-shadow-800 text-ash-300 hover:border-shadow-500 hover:text-white",
  );
}
