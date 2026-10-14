"use client";

// Owned-printing tracking persisted in localStorage. Keys come from
// `printingKey()`. The server snapshot is always empty, so pre-rendered HTML
// shows nothing owned and the real state appears right after hydration.
import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "naruto-tcg:collection:v1";
const EMPTY: ReadonlySet<string> = new Set();

let snapshot: ReadonlySet<string> | null = null;
const listeners = new Set<() => void>();

function read(): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : []);
  } catch {
    return new Set();
  }
}

function getSnapshot(): ReadonlySet<string> {
  snapshot ??= read();
  return snapshot;
}

function getServerSnapshot(): ReadonlySet<string> {
  return EMPTY;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) return;
  snapshot = read();
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function write(next: ReadonlySet<string>): void {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Storage full or blocked (private mode): keep the in-memory state.
  }
  emit();
}

export interface Collection {
  owned: ReadonlySet<string>;
  isOwned: (key: string) => boolean;
  toggle: (key: string) => void;
  /** Mark many keys owned or not owned in one write. */
  setMany: (keys: readonly string[], owned: boolean) => void;
}

export function useCollection(): Collection {
  const owned = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isOwned = useCallback((key: string) => owned.has(key), [owned]);

  const toggle = useCallback((key: string) => {
    const next = new Set(getSnapshot());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    write(next);
  }, []);

  const setMany = useCallback((keys: readonly string[], value: boolean) => {
    const next = new Set(getSnapshot());
    for (const key of keys) {
      if (value) next.add(key);
      else next.delete(key);
    }
    write(next);
  }, []);

  return { owned, isOwned, toggle, setMany };
}
