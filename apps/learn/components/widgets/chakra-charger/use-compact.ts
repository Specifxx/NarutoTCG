"use client";

import { useEffect, useState } from "react";

const QUERY = "(max-width: 639px)";

/**
 * True on phone-sized screens, where the widget switches to small cards so the
 * gauge and the cards fit on screen together. The widget renders client-only,
 * so reading matchMedia on the first render is safe.
 */
export function useCompact(): boolean {
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return compact;
}
