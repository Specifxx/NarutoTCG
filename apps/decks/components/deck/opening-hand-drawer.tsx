"use client";

import type { Decklist } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import { useEffect, useId, useMemo, useReducer, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { expandDecklist } from "@/lib/decks/deck-utils";
import { pluralize } from "@/lib/format";
import { keepableHandOdds } from "@/lib/probability/conditions";
import { RULES } from "@/lib/rules";
import { CloseIcon } from "./icons";
import { OddsPanel } from "./odds-panel";
import { createSampleHand, sampleHandReducer, type MulliganTargets } from "./sample-hand";
import { SampleHandPanel } from "./sample-hand-panel";
import { FOCUS_RING, SEGMENTED, segmentClass } from "./styles";

type Tab = "hand" | "odds";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "hand", label: "Sample hand" },
  { id: "odds", label: "Odds" },
];

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusableIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0 && !el.closest("[hidden]"));
}

/**
 * Opening-hand playtest drawer: a modal dialog that slides in from the right (full width on
 * phones). Escape and the overlay close it, Tab is trapped inside, the page behind is inert, and
 * focus returns to `returnFocusRef` (or whatever had focus when it opened). Content mounts on first
 * open and keeps its state between openings.
 */
export function OpeningHandDrawer({
  id,
  open,
  onClose,
  returnFocusRef,
  deckName,
  decklist,
  targets,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  /** The trigger; Safari never focuses clicked buttons, so the active element is not enough. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  deckName: string;
  decklist: Decklist;
  targets: MulliganTargets;
}) {
  const titleId = useId();
  const tabsId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ hand: null, odds: null });
  const onCloseRef = useRef(onClose);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [tab, setTab] = useState<Tab>("hand");
  const deck = useMemo(() => expandDecklist(decklist), [decklist]);
  const [hand, dispatch] = useReducer(sampleHandReducer, { deck, targets: targets.cardIds }, createSampleHand);
  const expectedKeepable = useMemo(() => keepableHandOdds(decklist, targets.cardIds).pOpening, [decklist, targets.cardIds]);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Mount closed, then slide in on the next frame; slide out before going invisible.
  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    setMounted(true);
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // While shown: lock page scroll, make the page behind inert, focus the close button, and undo
  // all of it on the way out (inert first, so focus can return to the trigger).
  useEffect(() => {
    if (!shown) return;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const returnTo = returnFocusRef?.current ?? active;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const background = [...document.body.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== rootRef.current && !el.inert,
    );
    background.forEach((el) => (el.inert = true));
    closeRef.current?.focus();
    return () => {
      background.forEach((el) => (el.inert = false));
      document.body.style.overflow = overflow;
      returnTo?.focus();
    };
  }, [shown, returnFocusRef]);

  // Escape and the Tab trap listen on the window, not the panel: a control that disables itself
  // when pressed (the last free mulligan, for one) drops focus to <body>, outside the panel.
  // Escape handled inside (an open card's text) stops propagation and never gets here.
  useEffect(() => {
    if (!shown) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel || event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusableIn(panel);
      const active = document.activeElement;
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shown]);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = TABS.findIndex((t) => t.id === tab);
    const target =
      event.key === "ArrowRight"
        ? TABS[(index + 1) % TABS.length]
        : event.key === "ArrowLeft"
          ? TABS[(index - 1 + TABS.length) % TABS.length]
          : event.key === "Home"
            ? TABS[0]
            : event.key === "End"
              ? TABS[TABS.length - 1]
              : null;
    if (!target) return;
    event.preventDefault();
    setTab(target.id);
    tabRefs.current[target.id]?.focus();
  };

  if (!mounted) return null;

  return createPortal(
    <div
      ref={rootRef}
      // Visibility transitions only on the way out (so the panel stays visible while it slides away).
      // On the way in it must flip at once: a transitioning `visibility` is still `hidden` in the frame
      // where the effect focuses the close button, and the focus would be lost to <body>.
      className={cx("fixed inset-0 z-[60]", shown ? "visible" : "invisible transition-[visibility] duration-200 motion-reduce:transition-none")}
      inert={!shown}
    >
      <div
        aria-hidden="true"
        onClick={() => onCloseRef.current()}
        className={cx("absolute inset-0 bg-shadow-950/75 transition-opacity duration-200 motion-reduce:transition-none", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          "absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-shadow-700 bg-shadow-950 shadow-2xl shadow-black/70 outline-none transition-transform duration-200 ease-out motion-reduce:transition-none",
          shown ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-shadow-700 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-white">
              Playtest opening hands
            </h2>
            <p className="truncate text-xs text-ash-400">
              {deckName} · {pluralize(deck.length, "card")} · {RULES.openingHandSize}-card hands, {pluralize(RULES.freeMulligans, "free mulligan")}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Close playtest"
            className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-md text-ash-300 hover:bg-shadow-800 hover:text-white", FOCUS_RING)}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-shadow-700 px-4 py-3 sm:px-6">
          <span id={`${tabsId}-turn-order`} className="text-xs font-medium text-ash-400">
            Turn order
          </span>
          <div role="group" aria-labelledby={`${tabsId}-turn-order`} className={SEGMENTED}>
            {[true, false].map((onThePlay) => (
              <button
                key={String(onThePlay)}
                type="button"
                aria-pressed={hand.onThePlay === onThePlay}
                onClick={() => dispatch({ type: "setOnThePlay", onThePlay })}
                className={segmentClass(hand.onThePlay === onThePlay)}
              >
                {onThePlay ? "On the play" : "On the draw"}
              </button>
            ))}
          </div>
          <span className="text-xs text-ash-500">
            {hand.onThePlay && RULES.firstPlayerSkipsDraw ? "Going first: no draw on turn 1." : "Draw a card every turn."}
          </span>
        </div>

        <div role="tablist" aria-label="Playtest tools" className="flex gap-1 border-b border-shadow-700 px-4 sm:px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              id={`${tabsId}-${t.id}-tab`}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`${tabsId}-${t.id}-panel`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={onTabKeyDown}
              className={cx(
                "relative -mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition",
                FOCUS_RING,
                tab === t.id ? "border-chakra-400 text-white" : "border-transparent text-ash-400 hover:text-white",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="@container min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {TABS.map((t) => (
            <div
              key={t.id}
              id={`${tabsId}-${t.id}-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-${t.id}-tab`}
              tabIndex={0}
              hidden={tab !== t.id}
              className={cx("rounded-md", FOCUS_RING)}
            >
              {t.id === "hand" ? (
                <SampleHandPanel state={hand} dispatch={dispatch} expectedKeepable={expectedKeepable} />
              ) : (
                <OddsPanel decklist={decklist} targets={targets} onThePlay={hand.onThePlay} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
