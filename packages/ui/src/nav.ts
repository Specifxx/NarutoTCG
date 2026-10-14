export type AppKey = "decks" | "simulator" | "compare" | "learn";

export interface AppLink {
  key: AppKey;
  label: string;
  /** Local `next dev` port, used when no URL is configured outside production. */
  devPort: number;
  /** Variable holding the app's public URL; Next.js inlines it at build time. */
  urlEnv: string;
}

/** Navigation order shared by every app's header. */
export const APP_LINKS: AppLink[] = [
  { key: "decks", label: "Decks", devPort: 3001, urlEnv: "NEXT_PUBLIC_DECKS_URL" },
  { key: "simulator", label: "Simulator", devPort: 3000, urlEnv: "NEXT_PUBLIC_SIMULATOR_URL" },
  { key: "compare", label: "Compare", devPort: 3002, urlEnv: "NEXT_PUBLIC_COMPARE_URL" },
  { key: "learn", label: "Learn", devPort: 3003, urlEnv: "NEXT_PUBLIC_LEARN_URL" },
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
 * NEXT_PUBLIC_<APP>_URL, else localhost:<port> in development. A production build
 * without that URL gets null: the apps are not mounted under one domain, so any
 * guessed path would 404 and the header leaves the link out instead.
 */
export function appHref(target: AppKey, current: AppKey): string | null {
  if (target === current) return "/";
  const configured = configuredUrl(target)?.trim().replace(/\/+$/, "");
  if (configured) return `${configured}/`;
  if (process.env.NODE_ENV === "production") return null;
  const app = APP_LINKS.find((a) => a.key === target)!;
  return `http://localhost:${app.devPort}/`;
}

/** App URL variables that are unset or blank in `env`. */
export function missingAppUrlEnv(env: Record<string, string | undefined> = process.env): string[] {
  return APP_LINKS.map((app) => app.urlEnv).filter((name) => !env[name]?.trim());
}

/** next build reloads the config in each compiler worker; workers inherit this flag, so the warning prints once. */
const WARNED_FLAG = "NARUTO_TCG_APP_URL_WARNING_SHOWN";

/** Called from next.config.ts during production builds, so a missing app URL shows up in the build log. */
export function warnMissingAppUrls(env: Record<string, string | undefined> = process.env): void {
  const missing = missingAppUrlEnv(env);
  if (missing.length === 0 || env[WARNED_FLAG]) return;
  env[WARNED_FLAG] = "1";
  console.warn(
    `\n[naruto-tcg] Production build without ${missing.join(", ")}.\n` +
      "  NEXT_PUBLIC_* values are inlined at build time: the shared header hides links to apps without a URL.\n" +
      "  Set all four NEXT_PUBLIC_<APP>_URL variables in the build environment and rebuild.\n",
  );
}
