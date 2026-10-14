/**
 * Canonical origin of the events zone, for places that need absolute URLs
 * (metadataBase, JSON-LD, calendar files, Google Calendar details).
 *
 * Production must set NEXT_PUBLIC_SITE_URL (Vercel's production URL is used when
 * present). The localhost fallback is for development and warns in production.
 */
function resolveSiteOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[events] NEXT_PUBLIC_SITE_URL is not set: canonical URLs, og:url, JSON-LD and calendar links will point at http://localhost:3004",
    );
  }
  return "http://localhost:3004";
}

export const SITE_ORIGIN = resolveSiteOrigin();

export function eventPath(id: string): string {
  return `/events/${encodeURIComponent(id)}`;
}

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
}
