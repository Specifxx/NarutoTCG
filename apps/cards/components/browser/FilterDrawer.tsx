"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { CloseIcon } from "./icons";
import styles from "./browser.module.css";

/** Matches Tailwind's `lg` breakpoint, where the sidebar takes over. */
const DESKTOP_QUERY = "(min-width: 64rem)";

/**
 * Off-canvas filter drawer for small screens, built on a native modal
 * <dialog>: the rest of the page is inert while it is open, Escape closes
 * it, and focus returns to the button that opened it.
 */
export function FilterDrawer({
  open,
  onClose,
  returnFocusRef,
  resultCount,
  activeCount,
  onClearAll,
  children,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  resultCount: number;
  activeCount: number;
  onClearAll: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Lock page scroll behind the modal, and close if the viewport grows to desktop.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => {
      if (desktop.matches) dialogRef.current?.close();
    };
    desktop.addEventListener("change", onChange);
    return () => {
      root.style.overflow = previous;
      desktop.removeEventListener("change", onChange);
    };
  }, [open]);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={styles.drawer}
      onClose={() => {
        onClose();
        returnFocusRef.current?.focus();
      }}
      onClick={(event) => {
        // Clicks on the dialog itself (outside the panel) act as the overlay.
        if (event.target === event.currentTarget) close();
      }}
    >
      {open && (
        <div className={styles.drawerPanel}>
          <div className="flex items-center justify-between gap-3 border-b border-shadow-700 px-4 py-3">
            <h2 id={titleId} className="text-base font-bold text-white">
              Filters
              {activeCount > 0 && (
                <span className="ml-2 rounded-full bg-chakra-500/15 px-2 py-0.5 text-xs font-bold text-chakra-400">
                  {activeCount}
                  <span className="sr-only"> active</span>
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={close}
              className="grid h-10 w-10 place-items-center rounded-lg text-ash-400 transition hover:bg-shadow-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
            >
              <CloseIcon className="h-5 w-5" />
              <span className="sr-only">Close filters</span>
            </button>
          </div>
          <div className={`${styles.scrollArea} flex-1 overflow-y-auto overscroll-contain px-3`}>{children}</div>
          <div className="flex items-center gap-2 border-t border-shadow-700 bg-shadow-950/60 p-3">
            {/* aria-disabled (not disabled) so focus stays put after clearing. */}
            <button
              type="button"
              onClick={() => {
                if (activeCount > 0) onClearAll();
              }}
              aria-disabled={activeCount === 0}
              className="h-11 rounded-lg border border-shadow-500 px-4 text-sm font-semibold text-ash-200 transition hover:border-chakra-400 hover:text-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:border-shadow-500 aria-disabled:hover:text-ash-200"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={close}
              className="h-11 flex-1 rounded-lg bg-chakra-500 px-4 text-sm font-bold text-shadow-950 transition hover:bg-chakra-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-900"
            >
              Show {resultCount.toLocaleString("en-US")} {resultCount === 1 ? "card" : "cards"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
