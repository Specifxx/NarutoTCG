"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cx } from "@naruto-tcg/ui";
import { formatCount } from "@/lib/market/format";
import { ChevronDownIcon } from "./icons";

export interface MultiSelectOption {
  value: string;
  label: string;
  count: number;
  /** Secondary text under the label, e.g. a set code. */
  hint?: string;
}

/**
 * Facet filter: a button that opens a non-modal popover of checkboxes. Changes apply
 * immediately. Closes on Escape (focus returns to the button), on an outside click,
 * and when focus tabs out. On narrow screens the popover spans the nearest positioned
 * ancestor (the filter row) instead of hanging off the button.
 */
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = `${useId()}-panel`;
  const count = selected.length;

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLInputElement>("input[type=checkbox]")?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  /** Keeps facet order in the URL regardless of click order; unknown values (from a hand-edited URL) are kept last. */
  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    const known = options.map((o) => o.value);
    onChange([...known.filter((v) => next.has(v)), ...[...next].filter((v) => !known.includes(v))]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const boxes = [...(panelRef.current?.querySelectorAll<HTMLInputElement>("input[type=checkbox]") ?? [])];
    const index = boxes.findIndex((box) => box === document.activeElement);
    if (index === -1) return;
    event.preventDefault();
    const last = boxes.length - 1;
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? last
          : event.key === "ArrowDown"
            ? Math.min(last, index + 1)
            : Math.max(0, index - 1);
    boxes[nextIndex]?.focus();
  };

  return (
    <div
      ref={rootRef}
      className={cx("sm:relative", className)}
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        // relatedTarget is null when focus goes nowhere (e.g. Safari clicks); outside clicks are handled separately.
        const to = event.relatedTarget;
        if (open && to instanceof Node && !event.currentTarget.contains(to)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={cx(
          "inline-flex h-10 w-full items-center justify-between gap-1.5 rounded-lg border px-2.5 text-sm font-medium whitespace-nowrap sm:gap-2 sm:px-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 sm:w-auto",
          count > 0 || open
            ? "border-chakra-600 bg-shadow-800 text-white"
            : "border-shadow-700 bg-shadow-900 text-ash-200 hover:border-shadow-500 hover:bg-shadow-800",
        )}
      >
        <span>{label}</span>
        <span className="flex items-center gap-1.5">
          {count > 0 && (
            <span className="min-w-5 rounded-full bg-chakra-500 px-1.5 text-center text-xs leading-5 font-bold text-shadow-950 tabular-nums">
              {count}
              <span className="sr-only"> selected</span>
            </span>
          )}
          {/* Phone-width buttons are a third of the row: the count badge replaces the chevron there. */}
          <ChevronDownIcon
            className={cx(
              "size-4 text-ash-400 transition-transform",
              open && "rotate-180",
              count > 0 && "max-sm:hidden",
            )}
          />
        </span>
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={`Filter by ${label.toLowerCase()}`}
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-shadow-700 bg-shadow-900 shadow-2xl shadow-black/60 sm:right-auto sm:w-72"
        >
          <fieldset>
            <legend className="sr-only">{label}</legend>
            <ul className="max-h-80 overflow-y-auto overscroll-contain p-1.5">
              {options.map((option) => {
                const checked = selected.includes(option.value);
                return (
                  <li key={option.value}>
                    <label
                      className={cx(
                        "flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-shadow-800 has-focus-visible:ring-2 has-focus-visible:ring-chakra-400",
                        checked && "bg-shadow-800/60",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(option.value)}
                        className="size-4 shrink-0 cursor-pointer accent-chakra-500 focus:outline-none"
                      />
                      <span className="min-w-0 flex-1">
                        <span className={cx("block truncate", checked ? "text-white" : "text-ash-200")}>
                          {option.label}
                        </span>
                        {option.hint && <span className="block text-xs text-ash-400">{option.hint}</span>}
                      </span>
                      <span className="text-xs text-ash-400 tabular-nums">{formatCount(option.count)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          <div className="flex items-center justify-between gap-3 border-t border-shadow-700 px-3 py-1.5">
            <span className="text-xs text-ash-400 tabular-nums">{count === 0 ? "Any" : `${count} selected`}</span>
            <button
              type="button"
              onClick={() => {
                onChange([]);
                // The button disables itself once nothing is selected; keep focus inside the popover.
                panelRef.current?.querySelector<HTMLInputElement>("input[type=checkbox]")?.focus();
              }}
              disabled={count === 0}
              className="h-9 rounded-md px-2.5 text-sm font-medium text-chakra-400 hover:bg-shadow-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 disabled:cursor-not-allowed disabled:text-ash-400 disabled:hover:bg-transparent"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
