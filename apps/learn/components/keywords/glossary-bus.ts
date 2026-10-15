"use client";

import { useMemo } from "react";
import { KEYWORD_CATEGORIES, KEYWORDS, type KeywordCategory } from "@/content/keywords";
import { useProgress } from "@/lib/progress";
import type { CategoryFilter } from "./glossary-search";

/**
 * Lightweight commands from the hero and featured cards to the directory,
 * which owns search, filters and the expanded entry.
 */
export type GlossaryCommand =
  | { type: "open"; id: string }
  | { type: "filter"; category: CategoryFilter }
  | { type: "focus-search" };

export const GLOSSARY_COMMAND_EVENT = "learn:glossary-command";

export function sendGlossaryCommand(command: GlossaryCommand) {
  window.dispatchEvent(new CustomEvent<GlossaryCommand>(GLOSSARY_COMMAND_EVENT, { detail: command }));
}

/** Pixels kept clear below the sticky site header when scrolling to an entry. */
export const HEADER_OFFSET = 128;

/** Document offset of an element, ignoring CSS transforms from running layout animations. */
export function documentTop(el: HTMLElement): number {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null;
  }
  return y;
}

/** Updates the URL hash without a navigation (keeps the router's history state). */
export function replaceHash(id: string | null) {
  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, "", id ? `${pathname}${search}#${id}` : `${pathname}${search}`);
}

export function readHash(): string {
  try {
    return decodeURIComponent(window.location.hash.slice(1)).trim().toLowerCase();
  } catch {
    return "";
  }
}

export const exploredKey = (id: string) => `keyword:${id}`;

export interface ExploredInfo {
  hydrated: boolean;
  ids: ReadonlySet<string>;
  count: number;
  total: number;
  byCategory: Readonly<Record<KeywordCategory, number>>;
  /** First unexplored term, featured terms first. */
  next: (typeof KEYWORDS)[number] | null;
}

/** Which glossary terms this browser has opened. Empty until progress has hydrated. */
export function useExplored(): ExploredInfo {
  const { hydrated, awards } = useProgress();
  return useMemo(() => {
    const ids = new Set<string>();
    if (hydrated) for (const k of KEYWORDS) if (awards[exploredKey(k.id)]) ids.add(k.id);
    const byCategory = Object.fromEntries(KEYWORD_CATEGORIES.map((c) => [c.id, 0])) as Record<KeywordCategory, number>;
    for (const k of KEYWORDS) if (ids.has(k.id)) byCategory[k.category] += 1;
    const next =
      KEYWORDS.find((k) => k.featured && !ids.has(k.id)) ?? KEYWORDS.find((k) => !ids.has(k.id)) ?? null;
    return { hydrated, ids, count: ids.size, total: KEYWORDS.length, byCategory, next };
  }, [hydrated, awards]);
}
