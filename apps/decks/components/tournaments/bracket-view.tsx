import type { TournamentPlayer } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import Link from "next/link";
import { ArchetypeDot } from "@/components/ui/badges";
import { archetypeName } from "./archetype-name";
import type { BracketMatch, BracketRound, BracketSlot } from "./bracket";
import { FOCUS_RING, playerHref } from "./styles";

function SlotRow({ slot, player, divided }: { slot: BracketSlot; player: TournamentPlayer | undefined; divided: boolean }) {
  return (
    <div className={cx("flex items-center gap-2 px-2.5 py-1.5", divided && "border-t border-shadow-700", slot.won ? "text-white" : "text-ash-400")}>
      <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-ash-400">
        {slot.seed !== null && (
          <>
            <span className="sr-only">Seed </span>
            {slot.seed}
          </>
        )}
      </span>
      {slot.playerId === null ? (
        <span className="flex-1 text-xs italic text-ash-400">Bye</span>
      ) : (
        <>
          {player && (
            <span title={archetypeName(player.archetypeId)} className="flex">
              <ArchetypeDot archetypeId={player.archetypeId} />
            </span>
          )}
          <Link
            href={playerHref(slot.playerId)}
            prefetch={false}
            className={cx("min-w-0 flex-1 truncate rounded-sm hover:text-chakra-400", FOCUS_RING, slot.won && "font-bold")}
          >
            {player?.name ?? slot.playerId}
          </Link>
          {slot.won && <span className="sr-only">(winner)</span>}
        </>
      )}
      <span className={cx("w-4 shrink-0 text-right tabular-nums", slot.won && "font-bold")}>
        {slot.games ?? ""}
        {slot.games !== null && <span className="sr-only">{slot.games === 1 ? " game" : " games"}</span>}
      </span>
    </div>
  );
}

function MatchBox({ match, players }: { match: BracketMatch; players: ReadonlyMap<string, TournamentPlayer> }) {
  return (
    <div className="overflow-hidden rounded-md border border-shadow-600 bg-shadow-900 text-sm shadow-md shadow-black/30">
      {match.slots.map((slot, index) => (
        <SlotRow
          key={index}
          slot={slot}
          player={slot.playerId === null ? undefined : players.get(slot.playerId)}
          divided={index === 1}
        />
      ))}
    </div>
  );
}

/**
 * Single-elimination bracket, one column per round. Columns share a height and space their
 * matches evenly, so each match sits midway between the two that feed it. Scrolls inside its
 * own container on narrow screens.
 */
export function BracketView({ rounds, players }: { rounds: BracketRound[]; players: ReadonlyMap<string, TournamentPlayer> }) {
  return (
    <div
      role="region"
      aria-label="Top cut bracket"
      tabIndex={0}
      className={cx("overflow-x-auto rounded-lg border border-shadow-700 bg-shadow-950 p-4", FOCUS_RING)}
    >
      <ol className="flex min-w-max gap-6">
        {rounds.map((round) => (
          <li key={round.round} className="flex w-56 flex-col sm:w-60">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ash-400">
              {round.label}
              <span className="ml-1.5 font-normal normal-case tracking-normal text-ash-400">· Round {round.round}</span>
            </h3>
            <ol className="flex flex-1 flex-col justify-around gap-3">
              {round.matches.map((match) => (
                <li key={match.key}>
                  <MatchBox match={match} players={players} />
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}
