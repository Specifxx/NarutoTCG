import { NextResponse, type NextRequest } from "next/server";
import { getStores } from "@/lib/data";
import { clientIp, isJsonRequest, readBodyText } from "@/lib/http";
import { createRateLimiter } from "@/lib/rate-limit";
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
 * STORAGE CAVEAT — `queue` and `limiter` are module-level, in-memory placeholders for a
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
const limiter = createRateLimiter({
  max: RATE_LIMIT_MAX,
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxKeys: MAX_TRACKED_CLIENTS,
});

// 32 symbols without 0/O/1/I; 256 is a multiple of 32, so `byte % 32` has no modulo bias.
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateId(): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const id = `SUB-${Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("")}`;
    if (!queue.some((q) => q.id === id)) return id;
  }
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

function rateLimited(client: string, at: number) {
  return fail(
    429,
    "rate-limited",
    `You've sent ${RATE_LIMIT_MAX} submissions in the last 10 minutes. Please wait a few minutes and try again.`,
    { headers: { "Retry-After": String(limiter.retryAfterSeconds(client, at)) } },
  );
}

export async function POST(request: NextRequest) {
  const now = new Date();
  const client = clientIp(request.headers);
  // Cheap early rejection; the binding check sits next to the write below.
  if (limiter.isLimited(client, now.getTime())) return rateLimited(client, now.getTime());

  if (!isJsonRequest(request)) {
    return fail(415, "unsupported-media-type", "Send the submission as JSON.");
  }
  const raw = await readBodyText(request, MAX_BODY_BYTES);
  if (raw === null) {
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
    limiter.record(client, Date.now());
    const decoy: SubmissionResponse = { id: generateId(), status: "pending_review", receivedAt };
    return NextResponse.json(decoy, { status: 200, headers: NO_STORE });
  }

  const verifiedSlugs = new Set((await getStores()).filter((s) => s.verified).map((s) => s.slug));
  const result = validateSubmission(body, serverValidationContext(now, verifiedSlugs));
  if (!result.ok) {
    return fail(422, "invalid", "Some answers need attention.", { errors: result.errors });
  }

  // Check and record with no await in between, timed after the body arrived: otherwise a
  // burst of concurrent (or slow-bodied) requests all pass the early check unrecorded.
  const settledAt = Date.now();
  if (limiter.isLimited(client, settledAt)) return rateLimited(client, settledAt);
  const id = generateId();
  const seed = toEventSeed(result.value, suggestSeedId(result.value));
  queue.push({ id, receivedAt, status: "pending_review", submission: result.value, seed });
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
  limiter.record(client, settledAt);

  const response: SubmissionResponse = { id, status: "pending_review", receivedAt, seed };
  return NextResponse.json(response, { status: 201, headers: NO_STORE });
}
