"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/**
 * 48 divides evenly into every grid column count used (2, 3, 4, 6), so each
 * page ends on a complete row.
 */
export const PAGE_SIZE = 48;

export interface ProgressiveList {
  /** How many items to render. */
  visible: number;
  hasMore: boolean;
  showMore: () => void;
  /** Attach to an element after the list; scrolling near it loads the next page. */
  sentinelRef: RefObject<HTMLDivElement | null>;
}

/**
 * Render a long list in pages. The count resets whenever `resetKey` changes
 * (new filters or sort), without an effect, by storing the key with the count.
 */
export function useProgressiveList(resetKey: string, total: number, pageSize: number = PAGE_SIZE): ProgressiveList {
  const [page, setPage] = useState({ key: resetKey, count: pageSize });
  const count = page.key === resetKey ? page.count : pageSize;
  const visible = Math.min(count, total);
  const hasMore = visible < total;

  const showMore = useCallback(() => {
    setPage((prev) => ({ key: resetKey, count: (prev.key === resetKey ? prev.count : pageSize) + pageSize }));
  }, [resetKey, pageSize]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || typeof IntersectionObserver === "undefined") return;
    // Recreated after every page so a sentinel that is still in range keeps loading.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) showMore();
      },
      { rootMargin: "0px 0px 900px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, showMore, visible]);

  return { visible, hasMore, showMore, sentinelRef };
}

/** `value`, updated only after it has been stable for `delay` ms. */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
