/**
 * Public URL of the Cards app, e.g. https://narutomythoscards.vercel.app.
 * NEXT_PUBLIC_CARDS_URL wins; on Vercel it falls back to the project's production
 * domain (VERCEL_PROJECT_PRODUCTION_URL, set automatically at build time).
 */
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

export const SITE_URL = (
  process.env.NEXT_PUBLIC_CARDS_URL?.trim() || (vercelHost ? `https://${vercelHost}` : "http://localhost:3005")
).replace(/\/$/, "");
