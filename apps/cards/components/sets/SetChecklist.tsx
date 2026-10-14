"use client";

// Interactive checklist for one set. Rows are rendered on the server (with
// card art) and passed in as children; this component owns the collection
// state, filters, bulk actions and summary, and tells each row via context
// whether it is owned and visible.
import type { Rarity } from "@naruto-tcg/types";
import {
  createContext,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { RarityBadge } from "@/components/badges";
import { CheckIcon, SearchIcon } from "@/components/home/icons";
import { useCollection } from "@/lib/collection";
import { RARITIES, RARITY_META } from "@/lib/meta";
import {
  STATUS_FILTERS,
  countOwned,
  entryMatches,
  matchesQuery,
  normalizeSearch,
  tallyByRarity,
  type ChecklistFilter,
  type ChecklistIndexEntry,
  type StatusFilter,
} from "./checklist-model";
import { ProgressBar, percentLabel } from "./ProgressBar";
import styles from "./checklist.module.css";

interface ChecklistContextValue {
  owned: ReadonlySet<string>;
  visible: ReadonlySet<string>;
  toggle: (key: string) => void;
}

const ChecklistContext = createContext<ChecklistContextValue | null>(null);

function useChecklist(): ChecklistContextValue {
  const value = useContext(ChecklistContext);
  if (!value) throw new Error("<ChecklistRow> must be rendered inside <SetChecklist>");
  return value;
}

const STATUS_LABEL: Record<StatusFilter, string> = { all: "All", owned: "Owned", missing: "Missing" };

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-900";

export function SetChecklist({
  setLabel,
  index,
  children,
}: {
  /** Short set name used in accessible labels, e.g. "Starter Deck 01". */
  setLabel: string;
  index: readonly ChecklistIndexEntry[];
  /** `<ChecklistRow>` elements in collector-number order. */
  children: ReactNode;
}) {
  const { owned, toggle, setMany } = useCollection();
  const uid = useId();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [rarities, setRarities] = useState<readonly Rarity[]>([]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = useMemo(() => normalizeSearch(deferredQuery), [deferredQuery]);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [notice, setNotice] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const markRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef(false);

  const filter = useMemo<ChecklistFilter>(() => ({ status, rarities, query: deferredQuery }), [status, rarities, deferredQuery]);

  const allKeys = useMemo(() => index.map((entry) => entry.key), [index]);
  const ownedTotal = useMemo(() => countOwned(allKeys, owned), [allKeys, owned]);
  const rarityOrder = useMemo(() => [...RARITIES].sort((a, b) => RARITY_META[a].rank - RARITY_META[b].rank), []);
  const tallies = useMemo(() => tallyByRarity(index, owned, rarityOrder), [index, owned, rarityOrder]);

  const visibleKeys = useMemo(
    () => index.filter((entry) => entryMatches(entry, filter, normalizedQuery, owned)).map((entry) => entry.key),
    [index, filter, normalizedQuery, owned],
  );
  const visible = useMemo<ReadonlySet<string>>(() => new Set(visibleKeys), [visibleKeys]);
  const visibleOwned = useMemo(() => countOwned(visibleKeys, owned), [visibleKeys, owned]);

  // Faceted counts: each control counts what it would show under the other filters.
  const statusCounts = useMemo(() => {
    let all = 0;
    let ownedCount = 0;
    for (const entry of index) {
      if (rarities.length > 0 && !rarities.includes(entry.rarity)) continue;
      if (!matchesQuery(entry.search, normalizedQuery)) continue;
      all++;
      if (owned.has(entry.key)) ownedCount++;
    }
    return { all, owned: ownedCount, missing: all - ownedCount } satisfies Record<StatusFilter, number>;
  }, [index, rarities, normalizedQuery, owned]);

  const rarityCounts = useMemo(() => {
    const counts = new Map<Rarity, number>();
    for (const entry of index) {
      if (!entryMatches(entry, { status, rarities: [], query: "" }, normalizedQuery, owned)) continue;
      counts.set(entry.rarity, (counts.get(entry.rarity) ?? 0) + 1);
    }
    return counts;
  }, [index, status, normalizedQuery, owned]);

  const filtersActive = status !== "all" || rarities.length > 0 || normalizedQuery !== "";

  const toggleRarity = (rarity: Rarity) =>
    setRarities((current) => (current.includes(rarity) ? current.filter((r) => r !== rarity) : [...current, rarity]));

  const resetFilters = () => {
    setStatus("all");
    setRarities([]);
    setQuery("");
  };

  const markVisible = () => {
    const toMark = visibleKeys.filter((key) => !owned.has(key));
    setMany(toMark, true);
    setNotice(`Marked ${toMark.length} ${toMark.length === 1 ? "printing" : "printings"} as owned.`);
  };

  const clearVisible = () => {
    const toClear = visibleKeys.filter((key) => owned.has(key));
    setMany(toClear, false);
    setNotice(`Removed ${toClear.length} ${toClear.length === 1 ? "printing" : "printings"} from your collection.`);
    restoreFocus.current = true;
    setConfirmingClear(false);
  };

  const cancelClear = () => {
    restoreFocus.current = true;
    setConfirmingClear(false);
  };

  useEffect(() => {
    if (confirmingClear) confirmRef.current?.focus();
    else if (restoreFocus.current) {
      restoreFocus.current = false;
      // After clearing, "Clear visible" is usually disabled; fall back to an enabled control.
      const target = [clearRef.current, markRef.current].find((button) => button && !button.disabled);
      (target ?? searchRef.current)?.focus();
    }
  }, [confirmingClear]);

  // Any filter change makes the pending confirmation (and last notice) stale.
  useEffect(() => {
    setConfirmingClear(false);
    setNotice("");
  }, [status, rarities, normalizedQuery]);

  const contextValue = useMemo<ChecklistContextValue>(() => ({ owned, visible, toggle }), [owned, visible, toggle]);
  const total = index.length;
  const allVisibleOwned = visibleKeys.length > 0 && visibleOwned === visibleKeys.length;

  return (
    <ChecklistContext.Provider value={contextValue}>
      {/* Summary */}
      <section
        aria-labelledby={`${uid}-progress`}
        className={`${styles.noPrint} grid gap-5 rounded-2xl border border-shadow-700 bg-shadow-900/80 p-4 shadow-lg shadow-black/20 sm:p-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-8`}
      >
        <div>
          <h2 id={`${uid}-progress`} className="text-xs font-semibold uppercase tracking-[0.16em] text-ash-400">
            Your collection
          </h2>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tight text-white">{percentLabel(ownedTotal, total)}</span>
            <span className="text-sm text-ash-400">complete</span>
          </p>
          <p className="mt-1 text-sm text-ash-200">
            <span className="font-semibold text-white">{ownedTotal}</span> of {total} {total === 1 ? "printing" : "printings"} owned
          </p>
          <ProgressBar
            value={ownedTotal}
            max={total}
            tone="owned"
            size="lg"
            label={`${setLabel} collection progress`}
            valueText={`${ownedTotal} of ${total} printings owned`}
            className="mt-3"
          />
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-ash-400">By rarity</h3>
          <ul className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 xl:grid-cols-3">
            {tallies.map((tally) => (
              <li key={tally.rarity} className="rounded-xl border border-shadow-700 bg-shadow-950/60 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <RarityBadge rarity={tally.rarity} />
                  <span className="text-sm tabular-nums text-ash-200">
                    <span className="font-semibold text-white">{tally.owned}</span>
                    <span className="text-ash-400"> / {tally.total}</span>
                  </span>
                </div>
                <ProgressBar
                  value={tally.owned}
                  max={tally.total}
                  tone={tally.owned === tally.total ? "owned" : "chakra"}
                  size="sm"
                  label={`${RARITY_META[tally.rarity].label} owned`}
                  valueText={`${tally.owned} of ${tally.total}`}
                  className="mt-2"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Controls */}
      <div
        role="group"
        aria-label="Checklist filters and actions"
        className={`${styles.noPrint} mt-6 flex flex-col gap-4 rounded-2xl border border-shadow-700 bg-shadow-900/80 p-4`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <fieldset className="shrink-0">
            <legend className="sr-only">Show</legend>
            <div className="inline-flex rounded-lg border border-shadow-700 bg-shadow-950 p-1">
              {STATUS_FILTERS.map((value) => (
                <label key={value} className="relative">
                  <input
                    type="radio"
                    name={`${uid}-status`}
                    value={value}
                    checked={status === value}
                    onChange={() => setStatus(value)}
                    className="peer sr-only"
                  />
                  <span className="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-ash-400 transition hover:text-ash-200 peer-checked:bg-shadow-700 peer-checked:text-white peer-checked:shadow peer-focus-visible:ring-2 peer-focus-visible:ring-chakra-400">
                    {STATUS_LABEL[value]}
                    <span className="text-xs font-medium tabular-nums text-ash-400">{statusCounts[value]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="relative min-w-0 flex-1">
            <label htmlFor={`${uid}-search`} className="sr-only">
              Search this set
            </label>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-400" />
            <input
              ref={searchRef}
              id={`${uid}-search`}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this set by name or number"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-shadow-700 bg-shadow-950 py-2 pl-9 pr-3 text-sm text-white placeholder:text-ash-400 transition hover:border-shadow-500 focus-visible:border-chakra-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Filter by rarity" className="flex flex-wrap gap-1.5">
            {tallies.map(({ rarity }) => {
              const pressed = rarities.includes(rarity);
              return (
                <button
                  key={rarity}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => toggleRarity(rarity)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition ${FOCUS_RING} ${
                    pressed
                      ? "border-chakra-500/70 bg-chakra-500/15 text-white"
                      : "border-shadow-700 bg-shadow-950 text-ash-400 hover:border-shadow-500 hover:text-ash-200"
                  }`}
                >
                  {pressed && <CheckIcon className="h-3.5 w-3.5 text-chakra-400" />}
                  {RARITY_META[rarity].label}
                  <span className="text-xs tabular-nums text-ash-400">{rarityCounts.get(rarity) ?? 0}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              ref={markRef}
              type="button"
              onClick={markVisible}
              disabled={visibleKeys.length === 0 || allVisibleOwned}
              className={`rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/40 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            >
              Mark all visible owned
            </button>
            {confirmingClear ? (
              <div
                role="group"
                aria-label="Confirm clearing visible printings"
                className="flex flex-wrap items-center gap-2 rounded-lg border border-blood-500/50 bg-blood-500/10 px-2 py-1"
                onKeyDown={(event) => {
                  if (event.key === "Escape") cancelClear();
                }}
              >
                <span className="px-1 text-sm text-red-200">
                  Unmark {visibleOwned} visible {visibleOwned === 1 ? "printing" : "printings"}?
                </span>
                <button
                  ref={confirmRef}
                  type="button"
                  onClick={clearVisible}
                  className={`rounded-md bg-blood-500 px-2.5 py-1 text-sm font-semibold text-white transition hover:bg-red-600 ${FOCUS_RING}`}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={cancelClear}
                  className={`rounded-md px-2.5 py-1 text-sm font-semibold text-ash-200 transition hover:text-white ${FOCUS_RING}`}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                ref={clearRef}
                type="button"
                onClick={() => setConfirmingClear(true)}
                disabled={visibleOwned === 0}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-ash-200 ring-1 ring-inset ring-shadow-500 transition hover:text-white hover:ring-blood-500/70 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
              >
                Clear visible
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-shadow-800 pt-3 text-sm">
          <p role="status" aria-live="polite" className="text-ash-400">
            Showing <span className="font-semibold text-white">{visibleKeys.length}</span> of {total}{" "}
            {total === 1 ? "printing" : "printings"} · {visibleOwned} owned
            {notice && <span className="text-ash-200"> · {notice}</span>}
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className={`rounded-md px-2 py-1 font-semibold text-chakra-400 transition hover:text-chakra-500 ${FOCUS_RING}`}
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className={`${styles.list} mt-4 rounded-2xl border border-shadow-700 bg-shadow-900/50`}>
        <div
          aria-hidden="true"
          className={`${styles.header} border-b border-shadow-700 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ash-400 sm:px-4`}
        >
          <span className={`${styles.cellCheck} text-center`}>Own</span>
          <span className={styles.cellNum}>No.</span>
          <span className={styles.cellThumb} />
          <span className={styles.cellName}>Card</span>
          <span className={styles.cellType}>Type</span>
          <span className={styles.cellElement}>Element</span>
          <span className={styles.cellRarity}>Rarity</span>
          <span className={styles.cellVariant}>Variant</span>
        </div>
        <ul aria-label={`${setLabel} checklist`} className="divide-y divide-shadow-800">
          {children}
        </ul>
        {visibleKeys.length === 0 && (
          <div className={`${styles.noPrint} px-6 py-12 text-center`}>
            <p className="font-semibold text-white">No printings match these filters</p>
            <p className="mt-1 text-sm text-ash-400">
              {status === "owned" && statusCounts.owned === 0
                ? "You haven't marked any of these as owned yet."
                : "Try a different rarity or search term."}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className={`mt-4 rounded-md bg-chakra-500 px-4 py-2 text-sm font-semibold text-shadow-950 transition hover:bg-chakra-400 ${FOCUS_RING}`}
            >
              Show every printing
            </button>
          </div>
        )}
      </div>
    </ChecklistContext.Provider>
  );
}

/** One printing row. Server-rendered cells arrive as children. */
export function ChecklistRow({
  entryKey,
  label,
  children,
}: {
  entryKey: string;
  /** Accessible checkbox label, e.g. "Naruto Uzumaki, ST01-001, Standard". */
  label: string;
  children: ReactNode;
}) {
  const { owned, visible, toggle } = useChecklist();
  const isOwned = owned.has(entryKey);
  return (
    <li
      hidden={!visible.has(entryKey)}
      data-owned={isOwned}
      className={`${styles.row} px-3 py-2.5 transition-colors sm:px-4 ${
        isOwned ? "bg-emerald-500/[0.06] hover:bg-emerald-500/10" : "hover:bg-shadow-800/60"
      }`}
    >
      <label className={`${styles.cellCheck} -m-2 flex cursor-pointer items-center justify-center p-2`}>
        <span className="relative inline-flex">
          <input
            type="checkbox"
            checked={isOwned}
            onChange={() => toggle(entryKey)}
            aria-label={`Owned: ${label}`}
            className={`${styles.checkbox} peer h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border-2 border-shadow-500 bg-shadow-950 transition checked:border-emerald-400 checked:bg-emerald-500 hover:border-emerald-400 ${FOCUS_RING}`}
          />
          <CheckIcon className="pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 text-shadow-950 opacity-0 transition-opacity peer-checked:opacity-100" />
        </span>
      </label>
      {children}
    </li>
  );
}
