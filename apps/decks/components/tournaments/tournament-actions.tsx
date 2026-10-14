"use client";

import type { Tournament } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { removeImportedTournament } from "@/lib/storage/imports";
import { tournamentFileName } from "./event";
import { BUTTON_GHOST, FOCUS_RING } from "./styles";

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M9.25 3h1.5v7.19l2.47-2.47 1.06 1.06L10 13.06 5.72 8.78l1.06-1.06 2.47 2.47V3ZM4 14.5h1.5V16h9v-1.5H16V17.5H4v-3Z" />
    </svg>
  );
}

function downloadJson(tournament: Tournament) {
  const blob = new Blob([JSON.stringify(tournament, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = tournamentFileName(tournament.id);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Header actions: JSON download for every event; delete (with a confirm step) for imported ones. */
export function TournamentActions({ tournament }: { tournament: Tournament }) {
  const router = useRouter();
  const id = useId();
  const [confirming, setConfirming] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (confirming) cancel.current?.focus();
    else if (restoreFocus.current) {
      restoreFocus.current = false;
      trigger.current?.focus();
    }
  }, [confirming]);

  const close = () => {
    restoreFocus.current = true;
    setConfirming(false);
  };

  const remove = () => {
    removeImportedTournament(tournament.id);
    router.push("/tournaments");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => downloadJson(tournament)} className={BUTTON_GHOST}>
        <DownloadIcon className="h-4 w-4" />
        Download JSON
      </button>
      {tournament.source === "import" &&
        (confirming ? (
          <div
            role="group"
            aria-labelledby={`${id}-confirm`}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                close();
              }
            }}
            className="flex flex-wrap items-center gap-2 rounded-md border border-blood-500/70 bg-shadow-900 px-3 py-2"
          >
            <span id={`${id}-confirm`} className="text-sm text-ash-200">
              Delete this event from this browser? This cannot be undone.
            </span>
            <button
              type="button"
              onClick={remove}
              className={cx("rounded-md bg-blood-500 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110", FOCUS_RING)}
            >
              Delete event
            </button>
            <button ref={cancel} type="button" onClick={close} className={BUTTON_GHOST}>
              Cancel
            </button>
          </div>
        ) : (
          <button ref={trigger} type="button" onClick={() => setConfirming(true)} className={BUTTON_GHOST}>
            Delete from this browser
          </button>
        ))}
    </div>
  );
}
