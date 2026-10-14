export type AppKey = "decks" | "simulator" | "compare" | "learn";

export interface AppLink {
  key: AppKey;
  label: string;
  /** Local `next dev` port, used when no URL is configured outside production. */
  devPort: number;
}

/** Navigation order shared by every app's header. */
export const APP_LINKS: AppLink[] = [
  { key: "decks", label: "Decks", devPort: 3001 },
  { key: "simulator", label: "Simulator", devPort: 3000 },
  { key: "compare", label: "Compare", devPort: 3002 },
  { key: "learn", label: "Learn", devPort: 3003 },
];

// Each variable is spelled out literally so Next.js can inline NEXT_PUBLIC_* values at build time.
function configuredUrl(key: AppKey): string | undefined {
  switch (key) {
    case "decks":
      return process.env.NEXT_PUBLIC_DECKS_URL;
    case "simulator":
      return process.env.NEXT_PUBLIC_SIMULATOR_URL;
    case "compare":
      return process.env.NEXT_PUBLIC_COMPARE_URL;
    case "learn":
      return process.env.NEXT_PUBLIC_LEARN_URL;
  }
}

/**
 * Home URL of a sibling app. The current app links to its own root; others use
 * NEXT_PUBLIC_<APP>_URL, else localhost:<port> in development, else `/<app>`
 * (the multi-zone path convention) in production.
 */
export function appHref(target: AppKey, current: AppKey): string {
  if (target === current) return "/";
  const configured = configuredUrl(target)?.trim().replace(/\/+$/, "");
  if (configured) return `${configured}/`;
  const app = APP_LINKS.find((a) => a.key === target)!;
  return process.env.NODE_ENV === "production" ? `/${target}` : `http://localhost:${app.devPort}/`;
}
