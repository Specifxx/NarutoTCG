import { NextResponse, type NextRequest } from "next/server";
import { getStores } from "@/lib/data";
import {
  serverValidationContext,
  suggestSeedId,
  toEventSeed,
  validateSubmission,
  type EventSubmission,
  type FieldErrors,
  type SubmissionErrorCode,
  type SubmissionErrorResponse,
  type SubmissionResponse,
  type SubmissionSeed,
} from "@/lib/submission";

/**
 * Event submissions from the "Submit an event" wizard.
 *
 *   POST /api/submissions   SubmissionRequest (EventSubmission JSON + honeypot `website`)
 *     201 SubmissionResponse            queued for moderation
 *     200 SubmissionResponse            honeypot filled: looks like success, nothing is stored
 *     422 { code: "invalid", errors }   field errors keyed by path ("schedule.date")
 *     429 { code: "rate-limited" }      more than 5 accepted submissions per IP in 10 minutes
 *     400 / 413 / 415                   malformed, too large, or not JSON
 *
 * Other methods get Next's automatic 405.
 *
 * STORAGE CAVEAT — `queue` and `hits` are module-level, in-memory placeholders for a
 * database-backed moderation queue and a shared rate limiter (e.g. Redis). They reset
 * on every restart or deploy and are per instance, so nothing here is durable.
 */

const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60_000;
/** Bounds memory on an unauthenticated endpoint; the oldest entries are dropped first. */
const MAX_QUEUE = 1_000;
const MAX_TRACKED_CLIENTS = 10_000;
const NO_STORE = { "Cache-Control": "no-store" };

interface QueuedSubmission {
  id: string;
  receivedAt: string;
  status: "pending_review";
  submission: EventSubmission;
  seed: SubmissionSeed;
}

const queue: QueuedSubmission[] = [];
const hits = new Map<string, number[]>();

// 32 symbols without 0/O/1/I; 256 is a multiple of 32, so `byte % 32` has no modulo bias.
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateId(): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const id = `SUB-${Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("")}`;
    if (!queue.some((q) => q.id === id)) return id;
  }
}

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function recentHits(key: string, now: number): number[] {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length) hits.set(key, recent);
  else hits.delete(key);
  return recent;
}

function recordHit(key: string, now: number) {
  if (hits.size >= MAX_TRACKED_CLIENTS && !hits.has(key)) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) hits.delete(k);
    }
    // Still full of active clients: forget the longest-tracked one.
    const oldest = hits.keys().next();
    if (hits.size >= MAX_TRACKED_CLIENTS && !oldest.done) hits.delete(oldest.value);
  }
  hits.set(key, [...recentHits(key, now), now]);
}

function fail(
  status: number,
  code: SubmissionErrorCode,
  error: string,
  extra: { errors?: FieldErrors; headers?: Record<string, string> } = {},
) {
  const body: SubmissionErrorResponse = { error, code, ...(extra.errors ? { errors: extra.errors } : {}) };
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extra.headers } });
}

export async function POST(request: NextRequest) {
  const now = new Date();
  const client = clientKey(request);

  const recent = recentHits(client, now.getTime());
  if (recent.length >= RATE_LIMIT_MAX) {
    const retryAfter = Math.max(1, Math.ceil((recent[0] + RATE_LIMIT_WINDOW_MS - now.getTime()) / 1000));
    return fail(
      429,
      "rate-limited",
      `You've sent ${RATE_LIMIT_MAX} submissions in the last 10 minutes. Please wait a few minutes and try again.`,
      { headers: { "Retry-After": String(retryAfter) } },
    );
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return fail(415, "unsupported-media-type", "Send the submission as JSON.");
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return fail(413, "too-large", "That submission is too large. Shorten the description and try again.");
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return fail(413, "too-large", "That submission is too large. Shorten the description and try again.");
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "bad-request", "The request body isn't valid JSON.");
  }

  const receivedAt = now.toISOString();

  // Honeypot: people never see the "website" field, so anything in it is a bot. Reply exactly
  // like a success (minus the seed) so the bot has no signal to adapt to, and store nothing.
  const website = typeof body === "object" && body !== null ? (body as Record<string, unknown>).website : undefined;
  if (typeof website === "string" && website.trim() !== "") {
    recordHit(client, now.getTime());
    const decoy: SubmissionResponse = { id: generateId(), status: "pending_review", receivedAt };
    return NextResponse.json(decoy, { status: 200, headers: NO_STORE });
  }

  const verifiedSlugs = new Set((await getStores()).filter((s) => s.verified).map((s) => s.slug));
  const result = validateSubmission(body, serverValidationContext(now, verifiedSlugs));
  if (!result.ok) {
    return fail(422, "invalid", "Some answers need attention.", { errors: result.errors });
  }

  const id = generateId();
  const seed = toEventSeed(result.value, suggestSeedId(result.value));
  queue.push({ id, receivedAt, status: "pending_review", submission: result.value, seed });
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
  recordHit(client, now.getTime());

  const response: SubmissionResponse = { id, status: "pending_review", receivedAt, seed };
  return NextResponse.json(response, { status: 201, headers: NO_STORE });
}
