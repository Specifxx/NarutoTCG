"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const FADE_RIGHT = "[mask-image:linear-gradient(to_right,black_85%,transparent)]";

/** Scroll `scroller` horizontally (only) so `target` is fully visible. */
function revealInScroller(scroller: HTMLElement, target: HTMLElement): void {
  const box = scroller.getBoundingClientRect();
  const item = target.getBoundingClientRect();
  // Adjusting scrollLeft directly avoids scrollIntoView(), which also scrolls the page.
  if (item.right > box.right) scroller.scrollLeft += item.right - box.right;
  else if (item.left < box.left) scroller.scrollLeft -= box.left - item.left;
}

/**
 * Horizontally scrollable <nav> for narrow screens. The right edge fades only
 * while links are hidden there, keyboard focus scrolls the focused link fully
 * into view, and the `[aria-current="page"]` link is revealed whenever
 * `activeKey` changes (pass the current pathname or app key).
 */
export function ScrollFadeNav({
  label,
  activeKey,
  className = "",
  children,
}: {
  label: string;
  activeKey?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [hiddenRight, setHiddenRight] = useState(false);

  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const update = () => setHiddenRight(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    if (nav.firstElementChild) observer.observe(nav.firstElementChild);
    nav.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      nav.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && active) revealInScroller(nav, active);
  }, [activeKey]);

  return (
    <nav
      ref={ref}
      aria-label={label}
      onFocus={(event) => {
        if (ref.current && event.target instanceof HTMLElement) revealInScroller(ref.current, event.target);
      }}
      className={`overflow-x-auto [scrollbar-width:none] ${hiddenRight ? FADE_RIGHT : ""} ${className}`}
    >
      {children}
    </nav>
  );
}
