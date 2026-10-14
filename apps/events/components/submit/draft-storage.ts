import { coerceDraft, STEPS, type SubmissionDraft } from "@/lib/submission";

/**
 * Wizard autosave in localStorage. Storage can be unavailable (private mode,
 * blocked site data, quota), so every access is guarded and failures are silent:
 * the wizard simply works without a saved draft.
 */

export const DRAFT_STORAGE_KEY = "ntcg:submission-draft";
const VERSION = 1;

export interface StoredDraft {
  savedAt: string;
  step: number;
  maxVisited: number;
  draft: SubmissionDraft;
}

function clampStep(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) return 0;
  return Math.min(Math.max(value, 0), STEPS.length - 1);
}

export function readStoredDraft(): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (record.v !== VERSION || typeof record.savedAt !== "string") return null;
    const step = clampStep(record.step);
    return {
      savedAt: record.savedAt,
      step,
      maxVisited: Math.max(step, clampStep(record.maxVisited)),
      // Re-coerce so drafts saved by an older build can't put invalid shapes into state.
      draft: coerceDraft(record.draft),
    };
  } catch {
    return null;
  }
}

export function writeStoredDraft(value: StoredDraft): boolean {
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ v: VERSION, ...value }));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
