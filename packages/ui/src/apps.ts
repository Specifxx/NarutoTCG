export type AppKey = "simulator" | "decks" | "compare" | "learn";

export interface AppLink {
  key: AppKey;
  label: string;
  description: string;
  defaultUrl: string;
}

export const APP_LINKS: readonly AppLink[] = [
  { key: "simulator", label: "Simulator", description: "Play-test matches", defaultUrl: "http://localhost:3000" },
  { key: "decks", label: "Decks", description: "Meta, tournaments and decklists", defaultUrl: "http://localhost:3001" },
  { key: "compare", label: "Compare", description: "Card price comparison", defaultUrl: "http://localhost:3002" },
  { key: "learn", label: "Learn", description: "Rules and guides", defaultUrl: "http://localhost:3003" },
];

// Literal env references so Next.js can inline them into client bundles.
const ENV_URLS: Record<AppKey, string | undefined> = {
  simulator: process.env.NEXT_PUBLIC_SIMULATOR_URL,
  decks: process.env.NEXT_PUBLIC_DECKS_URL,
  compare: process.env.NEXT_PUBLIC_COMPARE_URL,
  learn: process.env.NEXT_PUBLIC_LEARN_URL,
};

/** Base URL of a platform app, from `NEXT_PUBLIC_<APP>_URL` or its local dev port. */
export function appUrl(key: AppKey): string {
  const fromEnv = ENV_URLS[key]?.trim();
  const base = fromEnv || APP_LINKS.find((app) => app.key === key)!.defaultUrl;
  return base.replace(/\/+$/, "");
}
