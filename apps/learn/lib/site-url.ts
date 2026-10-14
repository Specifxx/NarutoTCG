/**
 * Public URL of the Learn app, e.g. https://learnnarutomythos.vercel.app/learn.
 * NEXT_PUBLIC_LEARN_URL wins; on Vercel it falls back to the project's production
 * domain (VERCEL_PROJECT_PRODUCTION_URL, set automatically at build time).
 */
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

export const SITE_URL = (
  process.env.NEXT_PUBLIC_LEARN_URL?.trim() ||
  (vercelHost ? `https://${vercelHost}/learn` : "http://localhost:3003/learn")
).replace(/\/$/, "");
