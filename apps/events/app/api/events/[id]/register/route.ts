import { NextResponse, type NextRequest } from "next/server";
import { getEvent } from "@/lib/data";
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
 *     400 / 413 / 415 { code: "bad-request" }
 *
 * Other methods get Next's automatic 405. Storage is in-memory; see lib/registrations.ts.
 */

const MAX_BODY_BYTES = 4 * 1024;
const NO_STORE = { "Cache-Control": "no-store" };

type RouteContext = { params: Promise<{ id: string }> };

function fail(status: number, code: RegistrationErrorCode, error: string, fieldErrors?: RegistrationFieldErrors) {
  const body: RegistrationErrorResponse = { error, code, ...(fieldErrors ? { fieldErrors } : {}) };
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
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
    new Date(),
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

  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return fail(415, "bad-request", "Send the registration as JSON.");
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return fail(413, "bad-request", "That request is too large.");
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "bad-request", "The request body isn't valid JSON.");
  }

  const parsed = validateRegistrationRequest(body);
  if (!parsed.ok) return fail(422, "invalid", "Please fix the highlighted fields.", parsed.fieldErrors);

  const outcome = registerForEvent(event, parsed.value);
  if (!outcome.ok) {
    return outcome.code === "duplicate"
      ? fail(409, "duplicate", "That email is already registered for this event.", {
          email: "This email is already registered for this event.",
        })
      : fail(409, "full", "The waitlist for this event is full.");
  }

  const response: RegistrationResponse = outcome.response;
  return NextResponse.json(response, { status: 201, headers: NO_STORE });
}
