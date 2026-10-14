/** Shared class strings for the import wizard. */

export const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";

export const BUTTON_PRIMARY = `inline-flex items-center justify-center gap-2 rounded-md bg-chakra-500 px-4 py-2 text-sm font-semibold tracking-wide text-shadow-950 transition hover:bg-chakra-400 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

export const BUTTON_GHOST = `inline-flex items-center justify-center gap-2 rounded-md border border-shadow-500 px-3 py-2 text-sm font-semibold text-ash-200 transition hover:border-chakra-400 hover:text-chakra-300 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

export const BUTTON_GHOST_SM = `inline-flex items-center justify-center gap-1.5 rounded-md border border-shadow-500 px-2.5 py-1 text-xs font-semibold text-ash-200 transition hover:border-chakra-400 hover:text-chakra-300 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

export const BUTTON_DANGER = `inline-flex items-center justify-center gap-2 rounded-md bg-blood-500 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110 ${FOCUS_RING}`;

export const ICON_BUTTON = `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ash-400 transition hover:bg-shadow-700 hover:text-white ${FOCUS_RING}`;

/** Input/select look without a size; combine with a height and width. */
export const CONTROL = `min-w-0 rounded-md border border-shadow-600 bg-shadow-900 text-sm text-ash-100 placeholder:text-ash-500 [color-scheme:dark] aria-[invalid=true]:border-status-critical ${FOCUS_RING}`;

/** Full-width form field. */
export const FIELD = `${CONTROL} h-9 w-full px-3`;

/** Compact inline select (file kind, issue source). */
export const FIELD_SM = `${CONTROL} h-8 px-2`;

const TEXTAREA_BASE = `w-full min-w-0 rounded-md border border-shadow-600 bg-shadow-900 px-3 py-2 text-ash-100 placeholder:text-ash-500 [color-scheme:dark] ${FOCUS_RING}`;

export const TEXTAREA = `${TEXTAREA_BASE} text-sm`;

/** Monospace textarea for pasted CSV or JSON. */
export const CODE_TEXTAREA = `${TEXTAREA_BASE} font-mono text-xs`;

export const LABEL = "text-sm font-medium text-ash-200";

export const HINT = "text-xs text-ash-400";

export const INLINE_LINK = `rounded-sm font-medium text-chakra-300 underline-offset-2 hover:text-chakra-400 hover:underline ${FOCUS_RING}`;

export const PANEL = "rounded-lg border border-shadow-700 bg-shadow-900";
