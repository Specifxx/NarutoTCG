import type { ZoneUrls } from "@naruto-tcg/ui";

/**
 * Where sibling zones live. Unset in production (one origin, path-based zones);
 * set per zone in `.env.development` so local dev links reach the other apps' ports.
 * Each variable is referenced literally so Next.js can inline it at build time.
 */
const entries: [keyof ZoneUrls, string | undefined][] = [
  ["learn", process.env.NEXT_PUBLIC_ZONE_URL_LEARN],
  ["cards", process.env.NEXT_PUBLIC_ZONE_URL_CARDS],
  ["decks", process.env.NEXT_PUBLIC_ZONE_URL_DECKS],
  ["simulator", process.env.NEXT_PUBLIC_ZONE_URL_SIMULATOR],
  ["compare", process.env.NEXT_PUBLIC_ZONE_URL_COMPARE],
];

export const zoneUrls: ZoneUrls = Object.fromEntries(entries.filter(([, url]) => !!url));
