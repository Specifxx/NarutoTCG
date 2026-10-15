"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { puzzleKey } from "@/content/puzzles";
import type { PuzzleDef } from "@/lib/game/puzzle";
import { useProgress } from "@/lib/progress";

/**
 * Best star rating per puzzle (3 = no hints, 2 = hints used, 1 = solution
 * shown), kept beside the shared XP progress. Whether a puzzle counts as
 * cleared always comes from the XP award, so resetting progress also hides
 * the stars.
 */
const STORAGE_KEY = "naruto-tcg.learn.puzzle-stars.v1";
type StarRecord = Record<string, number>;

function read(): StarRecord {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: StarRecord = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number" && value >= 1 && value <= 3) out[id] = Math.round(value);
    }
    return out;
  } catch {
    return {};
  }
}

function write(records: StarRecord) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Storage can be blocked; stars then last for this visit only.
  }
}

export function starsForRun({ hintsUsed, sawSolution }: { hintsUsed: number; sawSolution: boolean }): 1 | 2 | 3 {
  if (sawSolution) return 1;
  return hintsUsed > 0 ? 2 : 3;
}

export function usePuzzleStars() {
  const { hydrated, awards } = useProgress();
  const [records, setRecords] = useState<StarRecord>({});
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<StarRecord>({});

  useEffect(() => {
    const initial = read();
    ref.current = initial;
    setRecords(initial);
    setLoaded(true);
  }, []);

  /** Best stars for a cleared puzzle, or null when it has not been cleared. */
  const starsFor = useCallback(
    (puzzle: Pick<PuzzleDef, "id" | "xp">): number | null => {
      const award = awards[puzzleKey(puzzle.id)];
      if (!award) return null;
      const stored = records[puzzle.id];
      if (stored) return stored;
      return award.xp < puzzle.xp ? 1 : 2;
    },
    [awards, records],
  );

  /** Records a clear. A fresh XP award overwrites old stars (progress was reset); otherwise keep the best. */
  const record = useCallback((id: string, stars: number, freshAward: boolean) => {
    const prev = ref.current[id] ?? 0;
    const value = freshAward ? stars : Math.max(prev, stars);
    const next = { ...ref.current, [id]: value };
    ref.current = next;
    setRecords(next);
    write(next);
  }, []);

  return { ready: hydrated && loaded, starsFor, record, awards };
}
