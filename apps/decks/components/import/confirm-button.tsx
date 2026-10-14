"use client";

import { cx } from "@naruto-tcg/ui";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { BUTTON_GHOST_SM, FOCUS_RING } from "./styles";

/**
 * A destructive button that asks first: the prompt replaces it with Confirm / Cancel, focus
 * moves to Cancel, and Escape or Cancel returns focus to the button.
 */
export function ConfirmButton({
  children,
  label,
  prompt,
  confirmLabel,
  onConfirm,
  className,
}: {
  children: ReactNode;
  /** Accessible name when the visible text is ambiguous ("Delete" in a list). */
  label?: string;
  prompt: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const promptId = useId();

  useEffect(() => {
    if (open) cancel.current?.focus();
    else if (restoreFocus.current) {
      restoreFocus.current = false;
      trigger.current?.focus();
    }
  }, [open]);

  const close = () => {
    restoreFocus.current = true;
    setOpen(false);
  };

  if (!open) {
    return (
      <button ref={trigger} type="button" aria-label={label} onClick={() => setOpen(true)} className={className ?? BUTTON_GHOST_SM}>
        {children}
      </button>
    );
  }
  return (
    <div
      role="group"
      aria-labelledby={promptId}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
      className="flex w-full flex-wrap items-center gap-2 rounded-md border border-blood-500/70 bg-shadow-950 px-3 py-2"
    >
      <span id={promptId} className="min-w-0 flex-1 basis-40 text-xs text-ash-200">
        {prompt}
      </span>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          onConfirm();
        }}
        className={cx("rounded-md bg-blood-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:brightness-110", FOCUS_RING)}
      >
        {confirmLabel}
      </button>
      <button ref={cancel} type="button" onClick={close} className={BUTTON_GHOST_SM}>
        Cancel
      </button>
    </div>
  );
}
