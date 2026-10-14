"use client";

import type { MatchRecord, TournamentPlayer } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { Fragment, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArchetypeDot } from "@/components/ui/badges";
import { DataTable, Td, Th, THead, Tr } from "@/components/ui/table";
import { formatNumber, pluralize } from "@/lib/format";
import { archetypeName } from "./archetype-name";
import { normalizeQuery } from "./directory";
import { pairingsForRound, type RoundInfo } from "./rounds";
import { BUTTON_GHOST_SM, FIELD, FOCUS_RING, playerHref } from "./styles";

/** Pairings shown before "Show all" in big rounds; smaller rounds always show every table. */
const INITIAL_ROWS = 32;
const SHOW_ALL_BELOW = 48;

function PlayerCell({ playerId, player, won }: { playerId: string; player: TournamentPlayer | undefined; won: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {player && (
        <span title={archetypeName(player.archetypeId)} className="flex">
          <ArchetypeDot archetypeId={player.archetypeId} />
        </span>
      )}
      <Link
        href={playerHref(playerId)}
        prefetch={false}
        className={cx("rounded-sm hover:text-chakra-400", FOCUS_RING, won ? "font-bold text-white" : "text-ash-300")}
      >
        {player?.name ?? playerId}
      </Link>
      {won && <span className="sr-only">(won)</span>}
    </span>
  );
}

/** Round-by-round pairings behind a tablist (arrow keys, Home and End move between rounds). */
export function PairingsTabs({
  rounds,
  matches,
  players,
}: {
  rounds: RoundInfo[];
  matches: readonly MatchRecord[];
  players: ReadonlyMap<string, TournamentPlayer>;
}) {
  const id = useId();
  const [selected, setSelected] = useState(rounds[0]?.round ?? 0);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = rounds.find((r) => r.round === selected) ?? rounds[0];

  const rows = useMemo(() => (current ? pairingsForRound(matches, current.round) : []), [matches, current]);
  const visible = useMemo(() => {
    const terms = normalizeQuery(query).split(" ").filter(Boolean);
    if (terms.length === 0) return rows;
    const text = (playerId: string | null) => (playerId ? ` ${normalizeQuery(players.get(playerId)?.name ?? playerId)}` : "");
    return rows.filter((row) => {
      const haystack = `${text(row.player1Id)} ${text(row.player2Id)}`;
      return terms.every((term) => haystack.includes(` ${term}`));
    });
  }, [rows, query, players]);

  if (!current) return null;

  const collapsible = rows.length > SHOW_ALL_BELOW && normalizeQuery(query) === "";
  const shown = collapsible && !expanded ? visible.slice(0, INITIAL_ROWS) : visible;

  const select = (index: number) => {
    const round = rounds[(index + rounds.length) % rounds.length]!;
    setSelected(round.round);
    tabs.current[(index + rounds.length) % rounds.length]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: rounds.length - 1 };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  };

  const tabId = (round: number) => `${id}-tab-${round}`;
  const panelId = `${id}-panel`;

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Rounds" className="flex gap-1 relative overflow-x-auto border-b border-shadow-700 pb-px">
        {rounds.map((round, index) => {
          const active = round.round === current.round;
          const firstCut = round.stage === "top-cut" && rounds[index - 1]?.stage === "swiss";
          return (
            <Fragment key={round.round}>
              {firstCut && <span aria-hidden="true" className="mx-1 my-2 w-px shrink-0 bg-shadow-600" />}
              <button
                ref={(el) => {
                  tabs.current[index] = el;
                }}
                type="button"
                role="tab"
                id={tabId(round.round)}
                aria-selected={active}
                aria-controls={panelId}
                tabIndex={active ? 0 : -1}
                title={round.label}
                onClick={() => setSelected(round.round)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={cx(
                  "relative shrink-0 whitespace-nowrap rounded-t-md px-3 py-2 text-sm font-medium transition focus-visible:ring-inset",
                  FOCUS_RING,
                  active
                    ? "text-white after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-chakra-400"
                    : "text-ash-400 hover:text-white",
                )}
              >
                {round.shortLabel}
              </button>
            </Fragment>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={tabId(current.round)} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ash-400">
            <span className="font-semibold text-ash-100">{current.label}</span>
            {current.stage === "top-cut" ? " · Top cut" : " · Swiss"} · {pluralize(rows.length, "pairing")}
          </p>
          <div className="min-w-0 flex-1 sm:max-w-xs sm:flex-none">
            <label htmlFor={`${id}-find`} className="sr-only">
              Find a player in this round
            </label>
            <input
              id={`${id}-find`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a player"
              autoComplete="off"
              className={cx(FIELD, "w-full sm:w-64")}
            />
          </div>
        </div>

        <DataTable id={`${id}-table`}>
          <caption className="sr-only">{current.label} pairings; results read from player 1's side</caption>
          <THead>
            <tr>
              <Th numeric className="w-16">
                Table
              </Th>
              <Th>Player 1</Th>
              <Th className="text-center">Result</Th>
              <Th>Player 2</Th>
            </tr>
          </THead>
          <tbody>
            {shown.map((row) => (
              <Tr key={row.key}>
                <Td numeric className="text-ash-400">
                  {row.table ?? "—"}
                </Td>
                <Td>
                  <PlayerCell playerId={row.player1Id} player={players.get(row.player1Id)} won={row.winner === "p1"} />
                </Td>
                <Td className="text-center font-semibold tabular-nums text-ash-100">{row.result}</Td>
                <Td>
                  {row.player2Id === null ? (
                    <span className="text-ash-500">—</span>
                  ) : (
                    <PlayerCell playerId={row.player2Id} player={players.get(row.player2Id)} won={row.winner === "p2"} />
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
        {collapsible && (
          <div>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={`${id}-table`}
              onClick={() => setExpanded((v) => !v)}
              className={BUTTON_GHOST_SM}
            >
              {expanded ? `Show the first ${INITIAL_ROWS} tables only` : `Show all ${formatNumber(rows.length)} pairings`}
            </button>
          </div>
        )}
        {visible.length === 0 && (
          <p className="text-sm text-ash-400">
            No {current.label} pairing matches “{query}” ({formatNumber(rows.length)} in total).
          </p>
        )}
      </div>
    </div>
  );
}
