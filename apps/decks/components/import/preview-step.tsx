"use client";

import type { Tournament } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type Dispatch } from "react";
import { seriesColor } from "@/components/charts/chart-theme";
import { ArchetypeBadge, EmptyState, EventTierBadge, PlacementTag } from "@/components/ui/badges";
import { DataTable, Td, Th, THead, Tr } from "@/components/ui/table";
import { formatDate, formatLocation, formatNumber, formatPercent, pluralize } from "@/lib/format";
import { hasErrors } from "@/lib/ingest/types";
import { saveImportedTournament, useImportedTournaments } from "@/lib/storage/imports";
import { CheckCircleIcon, CopyIcon, DownloadIcon } from "./icons";
import {
  archetypeBreakdown,
  cliCommand,
  normalizedFileName,
  normalizedJson,
  previewPlayers,
  seedTwinOf,
  STANDINGS_PREVIEW_LIMIT,
  type BreakdownRow,
  type PreviewPlayer,
  type SeedEventRef,
} from "./preview";
import { SeverityIcon } from "./status";
import { BUTTON_DANGER, BUTTON_GHOST, BUTTON_GHOST_SM, BUTTON_PRIMARY, FOCUS_RING, HINT, INLINE_LINK, PANEL } from "./styles";
import type { WizardAction, WizardState } from "./wizard-state";

function downloadJson(tournament: Tournament) {
  const blob = new Blob([normalizedJson(tournament)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = normalizedFileName(tournament.id);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const eventHref = (id: string) => `/tournaments/${encodeURIComponent(id)}`;

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ash-400">{label}</dt>
      <dd className="truncate text-sm font-semibold text-white">{value}</dd>
    </div>
  );
}

function EventSummary({ tournament }: { tournament: Tournament }) {
  const matches = tournament.matches.filter((m) => m.player2Id !== null).length;
  return (
    <div className={cx(PANEL, "flex flex-col gap-4 p-4")}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <EventTierBadge tier={tournament.tier} />
          <span className="text-xs text-ash-400">
            {formatDate(tournament.date)} · {formatLocation(tournament.location)}
          </span>
        </div>
        <h3 className="break-words text-lg font-bold text-white">{tournament.name}</h3>
        {tournament.organizer && <p className="text-sm text-ash-400">Organized by {tournament.organizer}</p>}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Players" value={formatNumber(tournament.players.length)} />
        <Fact label="Matches" value={formatNumber(matches)} />
        <Fact label="Swiss rounds" value={formatNumber(tournament.swissRounds)} />
        <Fact label="Top cut" value={tournament.topCutSize > 0 ? `Top ${tournament.topCutSize}` : "None"} />
        <Fact label="Match length" value={`Best of ${tournament.bestOf}`} />
        <Fact label="Format" value={tournament.format || "—"} />
      </dl>
    </div>
  );
}

function StandingsPreview({ tournament, players }: { tournament: Tournament; players: PreviewPlayer[] }) {
  const shown = players.slice(0, STANDINGS_PREVIEW_LIMIT);
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} className="text-base font-bold text-white">
          Standings
        </h3>
        <p className={HINT}>
          {players.length > shown.length ? `Top ${shown.length} of ${formatNumber(players.length)} players` : pluralize(players.length, "player")}
        </p>
      </div>
      <DataTable label="Standings preview">
        <THead>
          <tr>
            <Th>Place</Th>
            <Th>Player</Th>
            <Th>Deck</Th>
            <Th numeric>Record</Th>
            <Th>List</Th>
          </tr>
        </THead>
        <tbody>
          {shown.map((player) => (
            <Tr key={player.id}>
              <Td>
                <PlacementTag placement={player.placement} topCutSize={tournament.topCutSize} />
              </Td>
              <Td>
                <span className="font-medium text-white">{player.name}</span>
                {player.country && <span className="ml-2 text-xs text-ash-500">{player.country}</span>}
                {player.dropped && (
                  <span className="ml-2 rounded border border-shadow-500 px-1 text-[10px] font-semibold uppercase text-ash-400">Drop</span>
                )}
              </Td>
              <Td>
                <ArchetypeBadge archetypeId={player.archetypeId} />
              </Td>
              <Td numeric>{player.record}</Td>
              <Td className="text-ash-300">{player.hasDecklist ? "Yes" : <span className="text-ash-500">—</span>}</Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>
    </section>
  );
}

/** Field share per chart series as a table with CSS bars; the numbers are always printed. */
function ArchetypeBreakdown({ rows, topCutSize }: { rows: BreakdownRow[]; topCutSize: number }) {
  const headingId = useId();
  const max = Math.max(...rows.map((row) => row.share), 0);
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
      <h3 id={headingId} className="text-base font-bold text-white">
        Archetype breakdown
      </h3>
      <DataTable label="Archetype breakdown">
        <THead>
          <tr>
            <Th>Archetype</Th>
            <Th numeric>Players</Th>
            <Th numeric>Share</Th>
            {topCutSize > 0 && <Th numeric>Top cut</Th>}
            <Th className="w-40">
              <span className="sr-only">Share bar</span>
            </Th>
          </tr>
        </THead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.seriesId}>
              <Td>
                <span className="flex items-center gap-2 font-medium text-ash-100">
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seriesColor(row.seriesId) }} />
                  {row.label}
                </span>
                {row.members.length > 1 || row.members[0]?.archetypeId !== row.seriesId ? (
                  <span className="mt-0.5 block max-w-64 whitespace-normal pl-4.5 text-xs text-ash-400">
                    {row.members.map((member) => `${member.label} (${member.players})`).join(" · ")}
                  </span>
                ) : null}
              </Td>
              <Td numeric>
                {formatNumber(row.players)}
              </Td>
              <Td numeric>
                {formatPercent(row.share)}
              </Td>
              {topCutSize > 0 && (
                <Td numeric>
                  {formatNumber(row.topCut)}
                </Td>
              )}
              <Td>
                <div aria-hidden="true" className="flex h-5 w-40 items-center border-l border-shadow-500">
                  <div
                    className="h-3 rounded-r-[4px]"
                    style={{ width: `${max > 0 ? (row.share / max) * 100 : 0}%`, backgroundColor: seriesColor(row.seriesId) }}
                  />
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>
      <p className={HINT}>Archetypes without a chart color, rogue included, are grouped as Other.</p>
    </section>
  );
}

function TopCutList({ tournament, players }: { tournament: Tournament; players: PreviewPlayer[] }) {
  const headingId = useId();
  const cut = players.filter((player) => player.placement <= tournament.topCutSize);
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3">
      <h3 id={headingId} className="text-base font-bold text-white">
        Top cut
      </h3>
      {cut.length === 0 ? (
        <EmptyState title="No top cut">This event ended after Swiss; placements follow the Swiss standings.</EmptyState>
      ) : (
        <ol className={cx(PANEL, "divide-y divide-shadow-700")}>
          {cut.map((player) => (
            <li key={player.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
              <PlacementTag placement={player.placement} topCutSize={tournament.topCutSize} />
              <span className="min-w-0 flex-1 truncate font-medium text-white">{player.name}</span>
              <ArchetypeBadge archetypeId={player.archetypeId} short />
              <span className="w-14 text-right text-sm tabular-nums text-ash-300">{player.record}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CliSnippet({ fileName }: { fileName: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const command = cliCommand(fileName);
  const headingId = useId();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    window.setTimeout(() => setStatus("idle"), 2500);
  };
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2">
      <h3 id={headingId} className="text-base font-bold text-white">
        Publish it for everyone
      </h3>
      <p className="text-sm text-ash-400">
        Saving keeps the event in this browser only. To add it to the site&apos;s data, download the normalized JSON and run the
        importer from the repository root:
      </p>
      <div className="flex min-w-0 items-stretch overflow-hidden rounded-md border border-shadow-600 bg-shadow-950">
        {/* Wraps instead of scrolling, so no keyboard user has to scroll it; copying keeps it on one line. */}
        <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all px-3 py-2.5 text-xs text-ash-100">
          <code>{command}</code>
        </pre>
        <button
          type="button"
          onClick={() => void copy()}
          className={cx("flex shrink-0 items-center gap-1.5 border-l border-shadow-600 px-3 text-xs font-semibold text-ash-200 hover:text-white", FOCUS_RING)}
        >
          <CopyIcon className="h-4 w-4" />
          {status === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <p aria-live="polite" className="text-xs text-ash-400">
        {status === "copied" ? "Command copied to the clipboard." : status === "failed" ? "Couldn't copy: select the command and copy it by hand." : ""}
      </p>
    </section>
  );
}

function SavedPanel({ id, name, onReset }: { id: string; name: string; onReset: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const headingId = useId();
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-lg border border-status-good/50 bg-shadow-800 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
    >
      <h3 id={headingId} className="flex items-center gap-2 text-base font-bold text-white">
        <CheckCircleIcon className="h-5 w-5 shrink-0 text-status-good" />
        Saved to this browser
      </h3>
      <p className="text-sm text-ash-300">
        <span className="font-semibold text-white">{name}</span> now appears with the tournaments, decks and (when you opt in) the meta
        on this device. Nothing was uploaded; clearing this site&apos;s data removes it.
      </p>
      <ul className="flex flex-col gap-1.5 text-sm text-ash-300">
        <li>
          <Link href={eventHref(id)} className={INLINE_LINK}>
            View the event page
          </Link>{" "}
          for standings, bracket and pairings.
        </li>
        <li>
          <Link href="/meta?imports=1" className={INLINE_LINK}>
            Open the meta with your imports
          </Link>{" "}
          to fold it into the tier list and charts. This link turns on{" "}
          <span className="font-semibold text-ash-100">Include my imported events</span>; you can switch it off there.
        </li>
        <li>
          <Link href="/decks" className={INLINE_LINK}>
            Browse decks
          </Link>{" "}
          to find the published lists from this event.
        </li>
      </ul>
      <button type="button" onClick={onReset} className={cx(BUTTON_GHOST_SM, "self-start")}>
        Import another event
      </button>
    </div>
  );
}

export function PreviewStep({
  state,
  dispatch,
  seedEvents = [],
}: {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
  /** Tracked events, to warn when the import is a copy of one. */
  seedEvents?: readonly SeedEventRef[];
}) {
  const imported = useImportedTournaments();
  const [confirming, setConfirming] = useState(false);
  const saveRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const confirmId = useId();

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (restoreFocus.current) {
      restoreFocus.current = false;
      saveRef.current?.focus();
    }
  }, [confirming]);

  const result = state.result;
  const tournament = result?.tournament;
  if (!result || !tournament) {
    return <EmptyState title="Nothing to preview">Go back and validate the import first.</EmptyState>;
  }

  const blocked = hasErrors(result.issues);
  const existing = imported.find((t) => t.id === tournament.id);
  const twin = seedTwinOf(tournament, seedEvents);
  const players = previewPlayers(tournament);
  const fileName = normalizedFileName(tournament.id);

  const save = () => {
    if (blocked) return;
    saveImportedTournament(tournament);
    setConfirming(false);
    dispatch({ type: "saved", id: tournament.id, name: tournament.name });
  };
  const requestSave = () => {
    if (existing) setConfirming(true);
    else save();
  };
  const cancel = () => {
    restoreFocus.current = true;
    setConfirming(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <EventSummary tournament={tournament} />

      {state.saved?.id === tournament.id ? (
        <SavedPanel id={tournament.id} name={tournament.name} onReset={() => dispatch({ type: "reset" })} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button ref={saveRef} type="button" onClick={requestSave} disabled={blocked || confirming} className={BUTTON_PRIMARY}>
              Save to this browser
            </button>
            <button type="button" onClick={() => downloadJson(tournament)} className={BUTTON_GHOST}>
              <DownloadIcon className="h-4 w-4" />
              Download normalized JSON
            </button>
          </div>
          {blocked && (
            <p className="flex items-center gap-2 text-sm text-ash-200">
              <SeverityIcon severity="error" />
              Errors remain; go back to Validate.
            </p>
          )}
          {twin && (
            <p className="flex items-start gap-2 text-sm text-ash-300">
              <SeverityIcon severity="warning" className="mt-0.5" />
              <span>
                <span className="font-semibold text-ash-100">Warning:</span> This looks like{" "}
                <Link href={eventHref(twin.id)} className={INLINE_LINK}>
                  {twin.name}
                </Link>
                , which is already tracked; saving adds a second copy.
              </span>
            </p>
          )}
          {existing && !confirming && !blocked && (
            <p className="flex items-start gap-2 text-sm text-ash-300">
              <SeverityIcon severity="warning" className="mt-0.5" />
              <span>
                <span className="font-semibold text-ash-100">Warning:</span> an event with this id is already saved in this browser.
                Saving will replace it.
              </span>
            </p>
          )}
          {confirming && existing && (
            <div
              role="group"
              aria-labelledby={confirmId}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancel();
                }
              }}
              className="flex flex-col gap-3 rounded-lg border border-status-warning/50 bg-shadow-800 p-4"
            >
              <p id={confirmId} className="flex items-start gap-2 text-sm text-ash-200">
                <SeverityIcon severity="warning" className="mt-0.5" />
                <span>
                  <span className="font-semibold text-white">Replace the saved copy?</span> &ldquo;{existing.name}&rdquo; is already saved
                  in this browser under the same id
                  {existing.importedAt ? ` (imported ${formatDate(existing.importedAt)})` : ""}. Saving replaces it.
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={save} className={BUTTON_DANGER}>
                  Replace it
                </button>
                <button ref={cancelRef} type="button" onClick={cancel} className={BUTTON_GHOST}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <StandingsPreview tournament={tournament} players={players} />
      <div className="grid grid-cols-1 min-w-0 gap-8 xl:grid-cols-2">
        <ArchetypeBreakdown rows={archetypeBreakdown(tournament)} topCutSize={tournament.topCutSize} />
        <TopCutList tournament={tournament} players={players} />
      </div>
      <CliSnippet fileName={fileName} />
    </div>
  );
}
