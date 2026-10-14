/**
 * Absolute URLs for places that cannot take relative ones (JSON-LD, Google Calendar
 * details). Mirrors the `metadataBase` fallback in app/layout.tsx; production must
 * set NEXT_PUBLIC_SITE_URL.
 */
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3004";

export function eventPath(id: string): string {
  return `/events/${encodeURIComponent(id)}`;
}

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
}
