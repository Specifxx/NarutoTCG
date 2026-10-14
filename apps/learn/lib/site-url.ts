/** Public URL of the Learn app, e.g. https://example.com/learn (set NEXT_PUBLIC_LEARN_URL in production). */
export const SITE_URL = (process.env.NEXT_PUBLIC_LEARN_URL?.trim() || "http://localhost:3003/learn").replace(/\/$/, "");
