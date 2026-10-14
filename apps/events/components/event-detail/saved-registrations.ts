import type { RegistrationStatus } from "@/lib/registrations";

/**
 * Per-device memory of registrations made from this browser, so a reload keeps
 * the "You're registered" state. Browser storage can be missing, full or blocked
 * (private mode, disabled cookies), so every access is guarded and failures fall
 * back to "nothing saved".
 */

const STORAGE_KEY = "ntcg:registrations";

export interface SavedRegistration {
  status: RegistrationStatus;
  confirmationCode: string;
  displayName: string;
  /** Confirmed count returned by the server when this registration was made. */
  registeredCount: number;
  waitlistPosition?: number;
  savedAt: string;
}

function isSavedRegistration(value: unknown): value is SavedRegistration {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.status === "registered" || v.status === "waitlisted") &&
    typeof v.confirmationCode === "string" &&
    typeof v.displayName === "string" &&
    typeof v.registeredCount === "number" &&
    typeof v.savedAt === "string" &&
    (v.waitlistPosition === undefined || typeof v.waitlistPosition === "number")
  );
}

function readAll(): Record<string, SavedRegistration> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, SavedRegistration> = {};
    for (const [eventId, entry] of Object.entries(parsed)) {
      if (isSavedRegistration(entry)) out[eventId] = entry;
    }
    return out;
  } catch {
    return {};
  }
}

export function loadSavedRegistration(eventId: string): SavedRegistration | null {
  return readAll()[eventId] ?? null;
}

export function saveRegistration(eventId: string, registration: SavedRegistration): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [eventId]: registration }));
  } catch {
    // Storage unavailable: the confirmation still shows for this visit.
  }
}
