"use client";

import type { Decklist } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getCard } from "@/lib/data/cards";
import { cardCounts } from "@/lib/decks/deck-utils";
import { formatNumber, formatPercent, pluralize } from "@/lib/format";
import { resolveConditionGroups } from "@/lib/probability/conditions";
import {
  CONDITION_KIND_LABELS,
  CONDITION_TYPE_LABELS,
  MAX_HORIZON_TURN,
  SIMULATION_TRIALS,
  describeCondition,
  drawsForHorizon,
  exactResult,
  horizonLabel,
  intervalMargin,
  newConditionRow,
  normalizeMin,
  rowToCondition,
  rowsToConditions,
  simulatedResult,
  type ConditionCardType,
  type ConditionKind,
  type ConditionResult,
  type ConditionRow,
} from "./condition-rows";
import { randomSeed } from "./random-seed";
import { BUTTON_GHOST, BUTTON_GHOST_SM, FIELD, FIELD_LABEL, PANEL } from "./styles";

const MAX_ROWS = 6;
const nameOf = (cardId: string) => getCard(cardId)?.name ?? cardId;

interface CardOption {
  id: string;
  name: string;
  copies: number;
}

function RowEditor({
  row,
  index,
  options,
  decklist,
  canRemove,
  autoFocus,
  onChange,
  onRemove,
}: {
  row: ConditionRow;
  index: number;
  options: CardOption[];
  decklist: Decklist;
  canRemove: boolean;
  /** Focus the first field on mount (a newly added row). */
  autoFocus: boolean;
  onChange: (patch: Partial<ConditionRow>) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const minRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) minRef.current?.focus();
  }, [autoFocus]);
  const condition = rowToCondition(row, nameOf);
  const matching = condition ? resolveConditionGroups(decklist, [condition])[0].size : 0;
  const label = `Condition ${index + 1}`;

  return (
    <fieldset className="flex min-w-0 flex-col gap-3 rounded-md border border-shadow-700 bg-shadow-950/40 p-3">
      <legend className="px-1 text-xs font-semibold text-ash-300">{label}</legend>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-min`} className={FIELD_LABEL}>
            At least
          </label>
          <input
            ref={minRef}
            id={`${id}-min`}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={row.min}
            onChange={(event) => onChange({ min: event.target.value })}
            onBlur={() => onChange({ min: String(normalizeMin(row.min)) })}
            className={cx(FIELD, "w-20")}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-kind`} className={FIELD_LABEL}>
            Match
          </label>
          <select
            id={`${id}-kind`}
            value={row.kind}
            onChange={(event) => onChange({ kind: event.target.value as ConditionKind })}
            className={cx(FIELD, "max-w-full")}
          >
            {(Object.keys(CONDITION_KIND_LABELS) as ConditionKind[]).map((kind) => (
              <option key={kind} value={kind}>
                {CONDITION_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </div>
        {row.kind === "card" && (
          <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
            <label htmlFor={`${id}-card`} className={FIELD_LABEL}>
              Card
            </label>
            <select
              id={`${id}-card`}
              value={row.cardId}
              onChange={(event) => onChange({ cardId: event.target.value })}
              className={cx(FIELD, "w-full min-w-0")}
            >
              <option value="">Choose a card…</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} (×{option.copies})
                </option>
              ))}
            </select>
          </div>
        )}
        {row.kind === "type" && (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-type`} className={FIELD_LABEL}>
                Type
              </label>
              <select
                id={`${id}-type`}
                value={row.cardType}
                onChange={(event) => onChange({ cardType: event.target.value as ConditionCardType })}
                className={FIELD}
              >
                {(Object.keys(CONDITION_TYPE_LABELS) as ConditionCardType[]).map((type) => (
                  <option key={type} value={type}>
                    {CONDITION_TYPE_LABELS[type].one}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-cost`} className={FIELD_LABEL}>
                Max cost
              </label>
              <input
                id={`${id}-cost`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="Any"
                value={row.maxCost}
                onChange={(event) => onChange({ maxCost: event.target.value })}
                className={cx(FIELD, "w-20")}
              />
            </div>
          </>
        )}
        <button type="button" onClick={onRemove} disabled={!canRemove} className={cx(BUTTON_GHOST_SM, "ml-auto h-9")} aria-label={`Remove ${label.toLowerCase()}`}>
          Remove
        </button>
      </div>
      {row.kind === "cards" && (
        <fieldset className="min-w-0">
          <legend className={FIELD_LABEL}>Any of these cards</legend>
          <div className="mt-1 grid max-h-44 grid-cols-1 gap-x-3 gap-y-1 overflow-y-auto rounded-md border border-shadow-700 p-2 @md:grid-cols-2">
            {options.map((option) => {
              const checked = row.cardIds.includes(option.id);
              return (
                <label key={option.id} className="flex min-w-0 cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-ash-200 hover:bg-shadow-800">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange({ cardIds: checked ? row.cardIds.filter((cardId) => cardId !== option.id) : [...row.cardIds, option.id] })
                    }
                    className="h-4 w-4 shrink-0 accent-chakra-500"
                  />
                  <span className="truncate">{option.name}</span>
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-ash-500">×{option.copies}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      <p className="text-xs text-ash-400">
        {condition
          ? `${describeCondition(condition, nameOf)} · ${pluralize(matching, "matching card")} in the deck`
          : row.kind === "card"
            ? "Choose a card to include this condition."
            : "Tick at least one card to include this condition."}
      </p>
    </fieldset>
  );
}

function ResultCard({ result, pending, empty, horizon, onThePlay, onResimulate }: {
  result: ConditionResult | null;
  pending: boolean;
  empty: boolean;
  horizon: number;
  onThePlay: boolean;
  onResimulate: () => void;
}) {
  const draws = drawsForHorizon(horizon, onThePlay);
  return (
    <div className={cx(PANEL, "flex flex-col gap-2 p-4")}>
      <div role="status" aria-live="polite" aria-atomic="true">
        {empty ? (
          <p className="text-sm text-ash-400">Add a complete condition to see its odds.</p>
        ) : result && !pending ? (
          <>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-semibold tabular-nums text-white">{formatPercent(result.probability)}</span>
              {result.method === "simulated" && (
                <span className="text-sm tabular-nums text-ash-300">± {(intervalMargin(result.interval) * 100).toFixed(1)} pts</span>
              )}
            </p>
            <p className="mt-1 text-xs text-ash-400">
              Chance every condition holds · {horizonLabel(horizon)} ({pluralize(draws, "card")} seen, {onThePlay ? "on the play" : "on the draw"})
            </p>
          </>
        ) : (
          <p className="text-sm text-ash-400">Simulating {formatNumber(SIMULATION_TRIALS)} hands…</p>
        )}
      </div>
      {!empty && result && !pending && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-shadow-500 px-2 py-0.5 font-semibold text-ash-100">
            {result.method === "exact" ? "Exact" : `Simulated · ${formatNumber(result.trials)} hands`}
          </span>
          <span className="text-ash-500">
            {result.method === "exact"
              ? "Hypergeometric math over the disjoint card groups."
              : `Conditions share cards, so the exact formula does not apply. 95% interval ${formatPercent(result.interval[0])}–${formatPercent(result.interval[1])}.`}
          </span>
          {result.method === "simulated" && (
            <button type="button" className={BUTTON_GHOST_SM} onClick={onResimulate}>
              Simulate again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Builds hand conditions row by row and prices them for a chosen horizon: exact when the rows'
 * card groups are disjoint, otherwise a {@link SIMULATION_TRIALS}-hand simulation run in an effect.
 */
export function ConditionBuilder({ decklist, targetIds, onThePlay }: { decklist: Decklist; targetIds: string[]; onThePlay: boolean }) {
  const id = useId();
  const options = useMemo<CardOption[]>(
    () =>
      [...cardCounts(decklist)]
        .filter(([cardId]) => getCard(cardId))
        .map(([cardId, copies]) => ({ id: cardId, name: nameOf(cardId), copies }))
        .sort((a, b) => a.name.localeCompare(b.name, "en")),
    [decklist],
  );
  const nextRowId = useRef(2);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [rows, setRows] = useState<ConditionRow[]>(() => [
    targetIds.length > 0 ? newConditionRow("r1", { kind: "cards", cardIds: targetIds }) : newConditionRow("r1"),
  ]);
  const [horizon, setHorizon] = useState(0);
  const [runs, setRuns] = useState(0);
  const [focusRowId, setFocusRowId] = useState<string | null>(null);

  const conditions = useMemo(() => rowsToConditions(rows, nameOf), [rows]);
  const draws = drawsForHorizon(horizon, onThePlay);
  const exact = useMemo(() => (conditions.length > 0 ? exactResult(decklist, conditions, draws) : null), [decklist, conditions, draws]);
  const needsSimulation = conditions.length > 0 && exact === null;
  const keyFor = (run: number) => `${JSON.stringify(conditions)}|${draws}|${run}`;
  const simulationKey = keyFor(runs);
  const [simulation, setSimulation] = useState<{ key: string; result: ConditionResult } | null>(null);
  const simulated = simulation?.key === simulationKey ? simulation.result : null;

  useEffect(() => {
    if (!needsSimulation || simulated) return;
    // Debounced so typing a count does not run a simulation per keystroke.
    const timer = window.setTimeout(() => {
      setSimulation({ key: simulationKey, result: simulatedResult(decklist, conditions, draws, randomSeed()) });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [needsSimulation, simulated, simulationKey, decklist, conditions, draws]);

  const result = exact ?? simulated;

  // Re-run in the handler, not the effect: a pending state would unmount the focused button.
  const resimulate = () => {
    const next = runs + 1;
    setRuns(next);
    setSimulation({ key: keyFor(next), result: simulatedResult(decklist, conditions, draws, randomSeed()) });
  };

  const update = (rowId: string, patch: Partial<ConditionRow>) =>
    setRows((previous) => previous.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  // The new row takes focus, so the button disabling itself at the row limit never strands it.
  const addRow = () => {
    const rowId = `r${nextRowId.current++}`;
    setRows((previous) => [...previous, newConditionRow(rowId)]);
    setFocusRowId(rowId);
  };

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <div>
        <h3 id={`${id}-title`} className="text-base font-semibold text-white">
          Condition builder
        </h3>
        <p className="mt-1 text-xs text-ash-400">
          Combine requirements, e.g. a specific card plus two cheap Jutsus, and get the chance of seeing all of them by a given turn.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-horizon`} className={FIELD_LABEL}>
          Horizon
        </label>
        <select
          id={`${id}-horizon`}
          value={horizon}
          onChange={(event) => setHorizon(Number(event.target.value))}
          className={cx(FIELD, "w-full max-w-xs")}
        >
          {Array.from({ length: MAX_HORIZON_TURN + 1 }, (_, turn) => (
            <option key={turn} value={turn}>
              {horizonLabel(turn)} ({pluralize(drawsForHorizon(turn, onThePlay), "card")})
            </option>
          ))}
        </select>
      </div>
      {rows.map((row, index) => (
        <RowEditor
          key={row.id}
          row={row}
          index={index}
          options={options}
          decklist={decklist}
          canRemove={rows.length > 1}
          autoFocus={row.id === focusRowId}
          onChange={(patch) => update(row.id, patch)}
          onRemove={() => {
            setRows((previous) => previous.filter((r) => r.id !== row.id));
            // The removed row took the focused button with it; keep focus in the builder.
            requestAnimationFrame(() => addButtonRef.current?.focus());
          }}
        />
      ))}
      <div>
        <button ref={addButtonRef} type="button" className={BUTTON_GHOST} onClick={addRow} disabled={rows.length >= MAX_ROWS}>
          Add condition
        </button>
      </div>
      <ResultCard
        result={result}
        pending={needsSimulation && simulated === null}
        empty={conditions.length === 0}
        horizon={horizon}
        onThePlay={onThePlay}
        onResimulate={resimulate}
      />
    </section>
  );
}
