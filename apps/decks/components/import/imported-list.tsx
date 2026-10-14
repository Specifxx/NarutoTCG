"use client";

import type { Tournament } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { useId, useRef } from "react";
import { EVENT_TIER_SHORT, formatDate, pluralize } from "@/lib/format";
import { clearImportedTournaments, removeImportedTournament, useImportedTournaments } from "@/lib/storage/imports";
import { useHydrated } from "@/lib/storage/local-store";
import { ConfirmButton } from "./confirm-button";
import { BUTTON_GHOST_SM, FOCUS_RING, HINT, PANEL } from "./styles";

const eventHref = (id: string) => `/tournaments/${encodeURIComponent(id)}`;

function ImportedRow({ tournament, onDelete }: { tournament: Tournament; onDelete: () => void }) {
  const players = Array.isArray(tournament.players) ? tournament.players.length : 0;
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="min-w-0">
        <Link
          href={eventHref(tournament.id)}
          className={cx("block break-words rounded-sm text-sm font-semibold text-white hover:text-chakra-300", FOCUS_RING)}
        >
          {tournament.name}
        </Link>
        <p className="mt-0.5 text-xs text-ash-400">
          {EVENT_TIER_SHORT[tournament.tier] ?? "Event"} · {formatDate(tournament.date)} · {pluralize(players, "player")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={eventHref(tournament.id)} className={BUTTON_GHOST_SM}>
          View
        </Link>
        <ConfirmButton
          label={`Delete ${tournament.name}`}
          prompt={<>Delete &ldquo;{tournament.name}&rdquo; from this browser? This can&apos;t be undone.</>}
          confirmLabel="Delete"
          onConfirm={onDelete}
        >
          Delete
        </ConfirmButton>
      </div>
    </li>
  );
}

/** Events saved by the wizard in this browser, with view links and confirmed deletes. */
export function ImportedList() {
  const hydrated = useHydrated();
  const imported = useImportedTournaments();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  const afterDelete = () => headingRef.current?.focus();

  return (
    <section aria-labelledby={headingId} className={cx(PANEL, "p-4")}>
      <div className="flex items-start justify-between gap-2">
        <h2 ref={headingRef} id={headingId} tabIndex={-1} className="text-base font-bold text-white focus:outline-none">
          Imported in this browser
        </h2>
        {hydrated && imported.length > 0 && <span className="text-xs tabular-nums text-ash-400">{imported.length}</span>}
      </div>
      <p className={cx(HINT, "mt-1")}>Stored on this device only. Other visitors don&apos;t see them.</p>
      {!hydrated ? (
        <p role="status" className="mt-4 text-sm text-ash-400">
          Checking this browser…
        </p>
      ) : imported.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-shadow-600 px-3 py-4 text-center text-sm text-ash-400">
          Nothing imported yet. Saved events will be listed here.
        </p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-shadow-700">
            {imported.map((tournament) => (
              <ImportedRow
                key={tournament.id}
                tournament={tournament}
                onDelete={() => {
                  removeImportedTournament(tournament.id);
                  afterDelete();
                }}
              />
            ))}
          </ul>
          {imported.length > 1 && (
            <div className="mt-3 border-t border-shadow-700 pt-3">
              <ConfirmButton
                prompt={`Delete all ${imported.length} imported events from this browser? This can't be undone.`}
                confirmLabel="Delete all"
                onConfirm={() => {
                  clearImportedTournaments();
                  afterDelete();
                }}
              >
                Delete all
              </ConfirmButton>
            </div>
          )}
        </>
      )}
    </section>
  );
}
