import { NextResponse, type NextRequest } from "next/server";
import { getEvent } from "@/lib/data";
import { clientIp, isJsonRequest, readBodyText } from "@/lib/http";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  PHASE_ERROR_MESSAGE,
  registerForEvent,
  registrationPhase,
  validateRegistrationRequest,
  type RegistrationErrorCode,
  type RegistrationErrorResponse,
  type RegistrationFieldErrors,
  type RegistrationResponse,
} from "@/lib/registrations";

/**
 * Register for an event that takes online sign-ups.
 *
 *   POST /api/events/:id/register   { displayName, email, country?, acceptCodeOfConduct, waitlist? }
 *     201 RegistrationResponse          registered, or waitlisted when the event is full
 *     404 { code: "not-found" }         unknown event
 *     409 { code: cancelled | ended | not-open | closed | not-online | duplicate | full }
 *     422 { code: "invalid", fieldErrors }
 *     429 { code: "rate-limited" }      more than 10 sign-up attempts per IP in 10 minutes
 *     400 / 413 / 415 { code: "bad-request" }
 *
 * A duplicate gets a generic message with no email field error, so the response never
 * states that a given address signed up. Its 409 status still differs from a 201 until
 * sign-ups are confirmed by email (pending until a link is clicked, one generic "check
 * your inbox" reply for every case); meanwhile every attempt that reaches the store,
 * duplicates included, counts against the per-IP limit, which bounds both probing and
 * capacity squatting.
 *
 * Other methods get Next's automatic 405. Storage and the limiter are in-memory,
 * per-instance placeholders; see lib/registrations.ts and lib/rate-limit.ts.
 */

const MAX_BODY_BYTES = 4 * 1024;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60_000;
const MAX_TRACKED_CLIENTS = 10_000;
const NO_STORE = { "Cache-Control": "no-store" };

const limiter = createRateLimiter({
  max: RATE_LIMIT_MAX,
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxKeys: MAX_TRACKED_CLIENTS,
});

type RouteContext = { params: Promise<{ id: string }> };

function fail(
  status: number,
  code: RegistrationErrorCode,
  error: string,
  extra: { fieldErrors?: RegistrationFieldErrors; headers?: Record<string, string> } = {},
) {
  const body: RegistrationErrorResponse = {
    error,
    code,
    ...(extra.fieldErrors ? { fieldErrors: extra.fieldErrors } : {}),
  };
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extra.headers } });
}

function rateLimited(client: string, at: number) {
  return fail(
    429,
    "rate-limited",
    "You've made several registration attempts in the last 10 minutes. Please wait a few minutes and try again.",
    { headers: { "Retry-After": String(limiter.retryAfterSeconds(client, at)) } },
  );
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const client = clientIp(request.headers);
  // Cheap early rejection; the binding check is the one next to the store below.
  const requestedAt = Date.now();
  if (limiter.isLimited(client, requestedAt)) return rateLimited(client, requestedAt);

  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return fail(404, "not-found", "We couldn't find that event.");

  const phase = registrationPhase(
    {
      status: event.status,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      opensAt: event.registration.opensAt,
      closesAt: event.registration.closesAt,
    },
    new Date(requestedAt),
  );
  if (phase !== "open") return fail(409, phase, PHASE_ERROR_MESSAGE[phase]);
  if (event.registration.method !== "online") {
    return fail(
      409,
      "not-online",
      event.registration.method === "in-store"
        ? "This event takes sign-ups in store, not online."
        : "This event takes sign-ups on the organiser's website.",
    );
  }

  if (!isJsonRequest(request)) {
    return fail(415, "bad-request", "Send the registration as JSON.");
  }
  const raw = await readBodyText(request, MAX_BODY_BYTES);
  if (raw === null) {
    return fail(413, "bad-request", "That request is too large.");
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "bad-request", "The request body isn't valid JSON.");
  }

  const parsed = validateRegistrationRequest(body);
  if (!parsed.ok) {
    return fail(422, "invalid", "Please fix the highlighted fields.", { fieldErrors: parsed.fieldErrors });
  }

  // Check and record with no await in between, and at the time the body finished
  // arriving: otherwise a burst of concurrent (or slow-bodied) requests all pass the
  // early check before any of them is recorded.
  const now = new Date();
  if (limiter.isLimited(client, now.getTime())) return rateLimited(client, now.getTime());
  const outcome = registerForEvent(event, parsed.value, now);
  limiter.record(client, now.getTime());
  if (!outcome.ok) {
    return outcome.code === "duplicate"
      ? fail(
          409,
          "duplicate",
          "We couldn't complete this registration. If you've already signed up for this event, use the confirmation code you got then.",
        )
      : fail(409, "full", "The waitlist for this event is full.");
  }

  const response: RegistrationResponse = outcome.response;
  return NextResponse.json(response, { status: 201, headers: NO_STORE });
}
