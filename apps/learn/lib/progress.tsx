"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Gamified progress: idempotent XP awards keyed by achievement, persisted per
 * browser in localStorage. Awarding the same key twice is a no-op.
 *
 * Key conventions:
 *   lesson:<lessonId>:complete   lesson:<lessonId>:widget   lesson:<lessonId>:quiz
 *   puzzle:<puzzleId>            keyword:<keywordId>
 */

export interface RankDef {
  id: "academy" | "genin" | "chunin" | "jonin" | "kage";
  title: string;
  minXp: number;
  blurb: string;
}

export const RANKS: readonly RankDef[] = [
  { id: "academy", title: "Academy Student", minXp: 0, blurb: "Every legend starts in the classroom." },
  { id: "genin", title: "Genin", minXp: 100, blurb: "You know how a Round flows." },
  { id: "chunin", title: "Chunin", minXp: 400, blurb: "You manage Chakra and spring ambushes." },
  { id: "jonin", title: "Jonin", minXp: 800, blurb: "You read missions and the Edge like a veteran." },
  { id: "kage", title: "Kage", minXp: 1300, blurb: "You lead your village to victory." },
];

/** XP values for each achievement type. */
export const XP = {
  lessonComplete: 100,
  widgetComplete: 50,
  quizPerfect: 50,
  keywordExplored: 5,
} as const;

export interface RankInfo {
  rank: RankDef;
  index: number;
  next: RankDef | null;
  /** 0..1 progress from this rank toward the next. */
  progress: number;
  xpIntoRank: number;
  xpForNext: number | null;
}

export function rankForXp(xp: number): RankInfo {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i]!.minXp) index = i;
  const rank = RANKS[index]!;
  const next = RANKS[index + 1] ?? null;
  const span = next ? next.minXp - rank.minXp : 1;
  const xpIntoRank = xp - rank.minXp;
  return {
    rank,
    index,
    next,
    progress: next ? Math.min(1, xpIntoRank / span) : 1,
    xpIntoRank,
    xpForNext: next ? next.minXp - xp : null,
  };
}

export interface Award {
  key: string;
  xp: number;
  label: string;
  at: number;
}

export interface Toast {
  id: number;
  label: string;
  xp: number;
}

interface ProgressContextValue {
  /** False until localStorage has been read on the client. */
  hydrated: boolean;
  xp: number;
  awards: Readonly<Record<string, Award>>;
  rank: RankInfo;
  has: (key: string) => boolean;
  /** Grants XP once per key. Returns true if this call granted it. */
  award: (key: string, xp: number, label: string) => boolean;
  reset: () => void;
  toasts: readonly Toast[];
  dismissToast: (id: number) => void;
  /** Set when an award pushes the player into a new rank. */
  rankUp: RankDef | null;
  clearRankUp: () => void;
}

const STORAGE_KEY = "naruto-tcg.learn.progress.v1";
const ProgressContext = createContext<ProgressContextValue | null>(null);

function load(): Record<string, Award> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { awards?: Record<string, Award> };
    return parsed && typeof parsed.awards === "object" && parsed.awards ? parsed.awards : {};
  } catch {
    return {};
  }
}

function save(awards: Record<string, Award>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, awards }));
  } catch {
    // Storage can be unavailable (private mode, blocked site data). Progress then lasts for the session.
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [awards, setAwards] = useState<Record<string, Award>>({});
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [rankUp, setRankUp] = useState<RankDef | null>(null);
  const awardsRef = useRef(awards);
  const toastId = useRef(0);

  useEffect(() => {
    const loaded = load();
    awardsRef.current = loaded;
    setAwards(loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(awards);
  }, [awards, hydrated]);

  const award = useCallback((key: string, xp: number, label: string) => {
    if (awardsRef.current[key]) return false;
    const before = Object.values(awardsRef.current).reduce((s, a) => s + a.xp, 0);
    const next = { ...awardsRef.current, [key]: { key, xp, label, at: Date.now() } };
    awardsRef.current = next;
    setAwards(next);
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, label, xp }]);
    const from = rankForXp(before).index;
    const to = rankForXp(before + xp);
    if (to.index > from) setRankUp(to.rank);
    return true;
  }, []);

  const reset = useCallback(() => {
    awardsRef.current = {};
    setAwards({});
    setRankUp(null);
  }, []);

  const value = useMemo<ProgressContextValue>(() => {
    const xp = Object.values(awards).reduce((s, a) => s + a.xp, 0);
    return {
      hydrated,
      xp,
      awards,
      rank: rankForXp(xp),
      has: (key) => Boolean(awards[key]),
      award,
      reset,
      toasts,
      dismissToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
      rankUp,
      clearRankUp: () => setRankUp(null),
    };
  }, [awards, hydrated, award, reset, toasts, rankUp]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used inside <ProgressProvider>");
  return ctx;
}
