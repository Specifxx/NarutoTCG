"use client";

import { cx } from "@naruto-tcg/ui";
import { useId, useState, type Dispatch } from "react";
import { EmptyState } from "@/components/ui/badges";
import { getCard } from "@/lib/data/cards";
import { formatPercent, pluralize } from "@/lib/format";
import { RULES } from "@/lib/rules";
import { CardIdTile } from "./card-tile";
import { CheckIcon, CrossCircleIcon } from "./icons";
import { randomSeed } from "./random-seed";
import {
  canDrawNext,
  canMulligan,
  freeMulligansLeft,
  handCards,
  hasTarget,
  nextDrawTurn,
  type SampleHandAction,
  type SampleHandState,
} from "./sample-hand";
import { BUTTON_GHOST, BUTTON_GHOST_SM, BUTTON_PRIMARY } from "./styles";

const nameOf = (cardId: string) => getCard(cardId)?.name ?? cardId;

/** Draw / mulligan / draw-next controls, the current hand and a running keepable tally. */
export function SampleHandPanel({
  state,
  dispatch,
  expectedKeepable,
}: {
  state: SampleHandState;
  dispatch: Dispatch<SampleHandAction>;
  /** Exact P(an opening hand holds a mulligan target), for comparison with the tally. */
  expectedKeepable: number;
}) {
  const tallyId = useId();
  const [announcement, setAnnouncement] = useState("");
  const dealt = state.opening.length > 0;
  const keepable = hasTarget(state.opening, state.targets);
  const seen = handCards(state).length;
  const mulligansLeft = freeMulligansLeft(state);
  const nextTurn = nextDrawTurn(state);

  const describeHand = (hand: string[]) =>
    `${hand.map(nameOf).join(", ")}. ${state.targets.length === 0 ? "" : hasTarget(hand, state.targets) ? "Keepable." : "No mulligan target."}`;

  const deal = (type: "draw" | "mulligan") => {
    dispatch({ type, seed: randomSeed() });
    // The status line falls back to describing the new opening hand.
    setAnnouncement("");
  };

  const drawNext = () => {
    const card = state.library[0];
    dispatch({ type: "next" });
    if (card) setAnnouncement(`Turn ${nextTurn} draw: ${nameOf(card)}.`);
  };

  const tallyRate = state.tally.hands > 0 ? state.tally.keepable / state.tally.hands : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BUTTON_PRIMARY} onClick={() => deal("draw")}>
          {dealt ? "Draw new opening hand" : "Draw opening hand"}
        </button>
        <button type="button" className={BUTTON_GHOST} onClick={() => deal("mulligan")} disabled={!canMulligan(state)}>
          Mulligan
          <span className="text-xs font-medium text-ash-400">({pluralize(mulligansLeft, "free mulligan")} left)</span>
        </button>
        <button type="button" className={BUTTON_GHOST} onClick={drawNext} disabled={!canDrawNext(state)}>
          Draw next card
          {dealt && <span className="text-xs font-medium text-ash-400">(turn {nextTurn})</span>}
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement || (dealt ? `Opening hand${state.mulligansUsed > 0 ? " after mulligan" : ""}: ${describeHand(state.opening)}` : "")}
      </p>

      {dealt ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="font-semibold text-white">{state.turn === 0 ? "Opening hand" : `Turn ${state.turn}`}</span>
            <span className="text-ash-400">
              {pluralize(seen, "card")} seen · {pluralize(state.library.length, "card")} left in the deck
            </span>
            {state.mulligansUsed > 0 && <span className="text-ash-400">After {pluralize(state.mulligansUsed, "mulligan")}</span>}
            {state.targets.length > 0 && (
              <span
                className={cx(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
                  keepable ? "border-status-good/60 text-ash-100" : "border-status-warning/60 text-ash-100",
                )}
              >
                {keepable ? (
                  <CheckIcon className="h-3.5 w-3.5 text-status-good" />
                ) : (
                  <CrossCircleIcon className="h-3.5 w-3.5 text-status-warning" />
                )}
                {keepable ? "Keepable: has a mulligan target" : "No mulligan target"}
              </span>
            )}
          </div>
          {state.onThePlay && RULES.firstPlayerSkipsDraw && state.turn >= 2 && (
            <p className="text-xs text-ash-500">On the play: no draw on turn 1.</p>
          )}
          <ul className="grid grid-cols-3 gap-2 @md:grid-cols-4 @xl:grid-cols-5" aria-label="Cards in hand">
            {state.opening.map((cardId, index) => (
              <li key={`${state.tally.hands}-o${index}`}>
                <CardIdTile cardId={cardId} size="sm" note={index === 0 ? "Opening hand" : undefined} />
              </li>
            ))}
            {state.draws.map((draw, index) => (
              <li key={`${state.tally.hands}-d${index}`}>
                <CardIdTile cardId={draw.cardId} size="sm" note={`Turn ${draw.turn} draw`} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState title="No hand drawn yet">
          Draw {RULES.openingHandSize} cards from a freshly shuffled deck. Each click uses a new random shuffle.
        </EmptyState>
      )}

      <section aria-labelledby={tallyId} className="rounded-lg border border-shadow-700 bg-shadow-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id={tallyId} className="text-sm font-semibold text-white">
            Session tally
          </h3>
          <button
            type="button"
            className={BUTTON_GHOST_SM}
            onClick={() => dispatch({ type: "resetTally" })}
            disabled={state.tally.hands === 0}
          >
            Reset tally
          </button>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-ash-400">Hands drawn</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-white">{state.tally.hands}</dd>
          </div>
          <div>
            <dt className="text-xs text-ash-400">Keepable</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-white">
              {state.tally.keepable}
              <span className="ml-1 text-xs font-medium text-ash-400">{formatPercent(tallyRate, 0)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ash-400">Expected</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-white">{formatPercent(expectedKeepable, 0)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-ash-500">
          {state.targets.length > 0
            ? `Keepable = at least one of ${state.targets.map(nameOf).join(", ")}. Mulligan hands count as hands drawn; "Expected" is the exact chance per hand.`
            : "This list runs none of its archetype's mulligan targets, so no hand is counted as keepable."}
        </p>
      </section>
    </div>
  );
}
