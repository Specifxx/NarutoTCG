import { useCallback, useSyncExternalStore } from "react";

/**
 * A tiny localStorage-backed store for per-browser state (imported events, votes, comments).
 * Every storage access is wrapped: in private mode or with blocked site data the store keeps
 * working in memory for the session. The server snapshot is always the fallback value, so
 * hydration never mismatches; stored values appear on the first client render after it.
 */
export interface LocalStore<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
  readonly fallback: T;
}

export function createLocalStore<T>(key: string, fallback: T, parse: (raw: unknown) => T | null): LocalStore<T> {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cachedValue = fallback;
  // Used when storage is unavailable or a write fails, so the UI still reflects the change.
  let memory: T | undefined;

  const readRaw = (): string | null | undefined => {
    try {
      return typeof window === "undefined" ? undefined : window.localStorage.getItem(key);
    } catch {
      return undefined;
    }
  };

  const get = (): T => {
    if (memory !== undefined) return memory;
    const raw = readRaw();
    if (raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    if (raw === null || raw === undefined) {
      cachedValue = fallback;
    } else {
      try {
        cachedValue = parse(JSON.parse(raw)) ?? fallback;
      } catch {
        cachedValue = fallback;
      }
    }
    return cachedValue;
  };

  const notify = () => listeners.forEach((listener) => listener());

  const set = (next: T | ((prev: T) => T)) => {
    const value = typeof next === "function" ? (next as (prev: T) => T)(get()) : next;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      memory = undefined;
    } catch {
      memory = value;
    }
    notify();
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) notify();
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    if (listeners.size === 1 && typeof window !== "undefined") window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
    };
  };

  return { get, set, subscribe, fallback };
}

/** React binding: `[value, setValue]`, hydration-safe. */
export function useLocalStore<T>(store: LocalStore<T>): [T, LocalStore<T>["set"]] {
  const value = useSyncExternalStore(store.subscribe, store.get, () => store.fallback);
  const set = useCallback((next: T | ((prev: T) => T)) => store.set(next), [store]);
  return [value, set];
}

/** True once mounted on the client; lets components show "loaded from this browser" states. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

const noopSubscribe = () => () => {};
