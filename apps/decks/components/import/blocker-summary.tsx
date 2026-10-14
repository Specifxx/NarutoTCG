"use client";

import { useEffect, useId, useRef, type MouseEvent } from "react";
import { SeverityIcon } from "./status";
import { INLINE_LINK } from "./styles";
import type { Blocker } from "./wizard-state";

function focusTarget(event: MouseEvent<HTMLAnchorElement>, target: string) {
  const element = document.getElementById(target);
  if (!element) return;
  event.preventDefault();
  element.scrollIntoView({ block: "center" });
  element.focus({ preventScroll: true });
}

/**
 * What keeps the user on this step, shown after a blocked Next. Takes focus on every blocked
 * attempt; each entry links to the control that fixes it.
 */
export function BlockerSummary({ blockers, attempts }: { blockers: Blocker[]; attempts: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    ref.current?.focus();
  }, [attempts]);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby={titleId}
      className="mt-6 rounded-md border border-status-critical/60 bg-shadow-800 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
    >
      <p id={titleId} className="flex items-center gap-2 text-sm font-semibold text-white">
        <SeverityIcon severity="error" />
        Before you continue
      </p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-10 text-sm text-ash-200">
        {blockers.map((blocker) => (
          <li key={blocker.message}>
            {blocker.target ? (
              <a href={`#${blocker.target}`} onClick={(event) => focusTarget(event, blocker.target!)} className={INLINE_LINK}>
                {blocker.message}
              </a>
            ) : (
              blocker.message
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
