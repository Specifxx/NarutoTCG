"use client";

import type { Decklist } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import { useId, useMemo, useState } from "react";
import { StatTile } from "@/components/ui/stat-tile";
import { DataTable, THead, Td, Th, Tr } from "@/components/ui/table";
import { getCard } from "@/lib/data/cards";
import { formatPercent } from "@/lib/format";
import { keepableHandOdds, probabilityTable } from "@/lib/probability/conditions";
import { RULES } from "@/lib/rules";
import { ConditionBuilder } from "./condition-builder";
import { SortIcon } from "./icons";
import { DEFAULT_ODDS_SORT, ODDS_TABLE_TURNS, sortOddsRows, toggleOddsSort, turnKey, type OddsSort, type OddsSortKey } from "./odds-table";
import type { MulliganTargets } from "./sample-hand";
import { FOCUS_RING } from "./styles";

const nameOf = (cardId: string) => getCard(cardId)?.name ?? cardId;

function SortHeader({
  label,
  column,
  sort,
  onSort,
  numeric = true,
  sticky = false,
}: {
  label: string;
  column: OddsSortKey;
  sort: OddsSort;
  onSort: (key: OddsSortKey) => void;
  numeric?: boolean;
  sticky?: boolean;
}) {
  const active = sort.key === column;
  return (
    <Th numeric={numeric} aria-sort={active ? sort.direction : undefined} className={cx(sticky && "sticky left-0 z-10 bg-shadow-800")}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cx("inline-flex items-center gap-1 rounded-sm uppercase tracking-wide hover:text-white", FOCUS_RING, active && "text-white")}
      >
        {label}
        <SortIcon direction={active ? sort.direction : "none"} />
      </button>
    </Th>
  );
}

/** Exact keepable-hand odds, per-card draw odds by turn, and the condition builder. */
export function OddsPanel({ decklist, targets, onThePlay }: { decklist: Decklist; targets: MulliganTargets; onThePlay: boolean }) {
  const id = useId();
  const keepable = useMemo(() => keepableHandOdds(decklist, targets.cardIds), [decklist, targets.cardIds]);
  const rows = useMemo(() => probabilityTable(decklist, { onThePlay, turns: ODDS_TABLE_TURNS }), [decklist, onThePlay]);
  const [sort, setSort] = useState<OddsSort>(DEFAULT_ODDS_SORT);
  const sorted = useMemo(() => sortOddsRows(rows, sort, nameOf), [rows, sort]);
  const onSort = (key: OddsSortKey) => setSort((current) => toggleOddsSort(current, key));
  const targetNames = targets.cardIds.map(nameOf).join(", ");

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby={`${id}-keep`} className="flex flex-col gap-3">
        <div>
          <h3 id={`${id}-keep`} className="text-base font-semibold text-white">
            Keepable opening hands
          </h3>
          <p className="mt-1 text-xs text-ash-400">
            {targets.cardIds.length > 0
              ? `Chance that ${RULES.openingHandSize} cards hold at least one of ${targetNames}${targets.source === "key-cards" ? " (this list's key cards, since it runs none of the archetype's usual targets)" : ""}.`
              : "This list runs none of its archetype's mulligan targets."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Opening hand" value={formatPercent(keepable.pOpening)} detail={`${RULES.openingHandSize} cards, no mulligan`} />
          <StatTile
            label="With free mulligan"
            value={formatPercent(keepable.pWithMulligan)}
            detail={`Up to ${RULES.freeMulligans} full redraw${RULES.freeMulligans === 1 ? "" : "s"}`}
          />
        </div>
      </section>

      <section aria-labelledby={`${id}-table`} className="flex flex-col gap-3">
        <div>
          <h3 id={`${id}-table`} className="text-base font-semibold text-white">
            Card draw odds
          </h3>
          <p className="mt-1 text-xs text-ash-400">
            Chance to have seen at least one copy, {onThePlay ? "on the play (no draw on turn 1)" : "on the draw"}. Select a column to sort.
          </p>
        </div>
        <DataTable>
          <caption className="sr-only">
            Chance of at least one copy of each card in the opening hand and by turns 1 to 5, {onThePlay ? "on the play" : "on the draw"}
          </caption>
          <THead>
            <tr>
              <SortHeader label="Card" column="card" sort={sort} onSort={onSort} numeric={false} sticky />
              <SortHeader label="Copies" column="copies" sort={sort} onSort={onSort} />
              <SortHeader label="Opening" column="opening" sort={sort} onSort={onSort} />
              {ODDS_TABLE_TURNS.map((turn) => (
                <SortHeader key={turn} label={`T${turn}`} column={turnKey(turn)} sort={sort} onSort={onSort} />
              ))}
            </tr>
          </THead>
          <tbody>
            {sorted.map((row) => (
              <Tr key={row.cardId}>
                <th scope="row" className="sticky left-0 z-10 max-w-48 truncate bg-shadow-900 px-3 py-2 text-left font-medium text-ash-100">
                  {nameOf(row.cardId)}
                </th>
                <Td numeric>{row.copies}</Td>
                <Td numeric className="font-semibold text-white">
                  {formatPercent(row.pOpening, 0)}
                </Td>
                {row.pByTurn.map((p, index) => (
                  <Td key={ODDS_TABLE_TURNS[index]} numeric>
                    {formatPercent(p, 0)}
                  </Td>
                ))}
              </Tr>
            ))}
          </tbody>
        </DataTable>
        <p className="text-xs text-ash-500">T1–T5: by the end of your draw on that turn.</p>
      </section>

      <ConditionBuilder decklist={decklist} targetIds={targets.cardIds} onThePlay={onThePlay} />
    </div>
  );
}
