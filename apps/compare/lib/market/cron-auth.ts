import { createHash, timingSafeEqual } from "node:crypto";

type Env = Record<string, string | undefined>;

export type CronAuthResult = { ok: true } | { ok: false; status: 401 | 503; error: string };

const BEARER = /^Bearer\s+(.+)$/i;

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Guard for /api/prices/cron. Vercel Cron and the scraper send
 * `Authorization: Bearer <CRON_SECRET>`. Both sides are hashed before the
 * constant-time comparison so neither the token's content nor its length leaks.
 * Without a secret the route stays open in development and fails closed in production.
 */
export function authorizeCron(request: Request, env: Env = process.env): CronAuthResult {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) {
    return env.NODE_ENV === "production"
      ? { ok: false, status: 503, error: "CRON_SECRET is not configured" }
      : { ok: true };
  }
  const token = BEARER.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";
  return timingSafeEqual(sha256(token), sha256(secret))
    ? { ok: true }
    : { ok: false, status: 401, error: "Unauthorized" };
}
