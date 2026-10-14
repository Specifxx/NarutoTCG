"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during server render and hydration, true afterwards. Use it to gate output
 * that depends on the viewer's environment (time zone, locale, browser APIs).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
