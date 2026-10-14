/**
 * Shared Tailwind class recipes so every page in the zone looks and behaves the
 * same (focus rings, disabled states, sizes). Kept as literal strings so
 * Tailwind's scanner picks them up.
 */

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950";

export const button = {
  primary: `inline-flex items-center justify-center gap-2 rounded-md bg-chakra-500 px-4 py-2 text-sm font-semibold text-shadow-950 transition-colors hover:bg-chakra-400 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
  secondary: `inline-flex items-center justify-center gap-2 rounded-md border border-shadow-500 bg-shadow-800 px-4 py-2 text-sm font-semibold text-ash-200 transition-colors hover:border-chakra-400 hover:text-chakra-400 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
  ghost: `inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ash-400 transition-colors hover:bg-shadow-800 hover:text-ash-200 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
  danger: `inline-flex items-center justify-center gap-2 rounded-md border border-blood-500/60 bg-blood-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-blood-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
  /** Square icon-only button; pair with an aria-label. */
  icon: `inline-flex h-9 w-9 items-center justify-center rounded-md border border-shadow-700 text-ash-400 transition-colors hover:border-chakra-500 hover:text-chakra-400 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
} as const;

export const field = {
  label: "block text-sm font-medium text-ash-200",
  hint: "mt-1 text-xs text-ash-400",
  error: "mt-1 text-xs font-medium text-rose-300",
  input: `block w-full rounded-md border border-shadow-700 bg-shadow-900 px-3 py-2 text-sm text-ash-200 placeholder:text-ash-400/60 transition-colors hover:border-shadow-500 focus:border-chakra-500 focus:outline-none focus:ring-2 focus:ring-chakra-500/30 disabled:opacity-50 aria-[invalid=true]:border-rose-400/70`,
  select: `block w-full appearance-none rounded-md border border-shadow-700 bg-shadow-900 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%238d8da3'%3E%3Cpath d='M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z'/%3E%3C/svg%3E")] bg-[length:1.1rem] bg-[right_0.6rem_center] bg-no-repeat py-2 pl-3 pr-9 text-sm text-ash-200 transition-colors hover:border-shadow-500 focus:border-chakra-500 focus:outline-none focus:ring-2 focus:ring-chakra-500/30 disabled:opacity-50`,
  checkbox: "h-4 w-4 rounded border-shadow-500 bg-shadow-900 accent-chakra-500",
} as const;

export const surface = {
  card: "rounded-xl border border-shadow-700 bg-shadow-900/80",
  panel: "rounded-xl border border-shadow-700 bg-shadow-900/80 p-5",
  inset: "rounded-lg border border-shadow-700 bg-shadow-950/60",
} as const;

/** Toggle chip (filters, segmented options). Use with aria-pressed. */
export function chip(active: boolean): string {
  return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${focus} ${
    active
      ? "border-chakra-500 bg-chakra-500/15 text-chakra-400"
      : "border-shadow-700 bg-shadow-900 text-ash-400 hover:border-shadow-500 hover:text-ash-200"
  }`;
}
