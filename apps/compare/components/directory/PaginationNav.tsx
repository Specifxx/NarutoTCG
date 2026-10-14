"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { cx } from "@naruto-tcg/ui";

function isPlainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * The pagination landmark. Reaching the first or last page replaces the activated
 * Previous / Next link with a disabled placeholder, which would drop keyboard focus to
 * the document. When that happens, focus moves to the current page link, or to the
 * landmark itself where the numbered links are hidden, so Tab carries on from here.
 */
export function PaginationNav({
  current,
  className,
  children,
}: {
  current: number;
  className?: string;
  children: ReactNode;
}) {
  const navRef = useRef<HTMLElement>(null);
  const activated = useRef(false);

  useEffect(() => {
    if (!activated.current) return;
    activated.current = false;
    const nav = navRef.current;
    const focused = document.activeElement;
    if (!nav || (focused !== null && focused !== document.body)) return;
    const currentLink = nav.querySelector<HTMLElement>('[aria-current="page"]');
    const target = currentLink && currentLink.getClientRects().length > 0 ? currentLink : nav;
    // The provider has already scrolled the results into view; keep that position.
    target.focus({ preventScroll: true });
  }, [current]);

  return (
    <nav
      ref={navRef}
      aria-label="Pagination"
      tabIndex={-1}
      onClickCapture={(event) => {
        if (isPlainClick(event) && event.target instanceof Element && event.target.closest("a[href]")) {
          activated.current = true;
        }
      }}
      className={cx("focus:outline-none", className)}
    >
      {children}
    </nav>
  );
}
