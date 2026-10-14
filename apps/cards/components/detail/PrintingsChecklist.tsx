"use client";

import type { PrintingVariant, Rarity, SetKind } from "@naruto-tcg/types";
import Link from "next/link";
import { useMemo } from "react";
import { RarityBadge } from "@/components/badges";
import { useCollection } from "@/lib/collection";
import { RARITY_META, SET_KIND_LABEL, VARIANT_LABEL, formatDate, setHref } from "@/lib/meta";

/** One printing, pre-resolved on the server so this component never touches lib/data. */
export interface PrintingRow {
  /** `printingKey()` of the printing; the collection-tracking key. */
  key: string;
  setId: string;
  setName: string;
  setShortName: string;
  setKind: SetKind | undefined;
  number: string;
  rarity: Rarity;
  variant: PrintingVariant;
  releaseDate: string | undefined;
  /** Set not released yet (evaluated on the server so markup never differs at hydration). */
  upcoming: boolean;
}

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400";

function UpcomingTag() {
  return (
    <span className="inline-flex items-center rounded-full border border-sky-400/45 bg-sky-400/10 px-2 py-px text-[10px] font-bold uppercase tracking-wider text-sky-300">
      Upcoming
    </span>
  );
}

/** Printings table with per-printing "owned" tracking stored in this browser. */
export function PrintingsChecklist({ cardName, rows }: { cardName: string; rows: readonly PrintingRow[] }) {
  const { owned, toggle, setMany } = useCollection();
  const keys = useMemo(() => rows.map((row) => row.key), [rows]);
  const ownedCount = useMemo(() => keys.filter((key) => owned.has(key)).length, [keys, owned]);
  const total = rows.length;
  const allOwned = total > 0 && ownedCount === total;
  const percent = total === 0 ? 0 : Math.round((ownedCount / total) * 100);

  return (
    <div className="overflow-hidden rounded-2xl border border-shadow-700 bg-shadow-900/60">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-shadow-700 px-4 py-3 sm:px-5">
        <p aria-live="polite" className="text-sm text-ash-200">
          <span className="font-bold tabular-nums text-white">{ownedCount}</span> of{" "}
          <span className="tabular-nums">{total}</span> {total === 1 ? "printing" : "printings"} owned
        </p>
        <div
          aria-hidden="true"
          className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-shadow-700 sm:max-w-40"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-chakra-600 to-chakra-400 transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
        <button
          type="button"
          onClick={() => setMany(keys, !allOwned)}
          disabled={total === 0}
          className={`ml-auto rounded-md border border-shadow-500 px-3 py-1.5 text-xs font-semibold text-ash-200 transition hover:border-chakra-400 hover:text-white disabled:opacity-50 ${FOCUS}`}
        >
          {allOwned ? "Clear all" : "Mark all owned"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
          <caption className="sr-only">Printings of {cardName} and whether you own them</caption>
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-ash-400">
              <th scope="col" className="w-14 px-4 py-2.5 font-semibold sm:px-5">
                Owned
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Set
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                No.
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Rarity
              </th>
              <th scope="col" className="hidden px-3 py-2.5 font-semibold md:table-cell">
                Variant
              </th>
              <th scope="col" className="hidden px-3 py-2.5 pr-5 font-semibold sm:table-cell">
                Release
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-shadow-800 border-t border-shadow-800">
            {rows.map((row) => {
              const isOwned = owned.has(row.key);
              const kind = row.setKind ? SET_KIND_LABEL[row.setKind] : undefined;
              return (
                <tr
                  key={row.key}
                  className={`transition-colors ${isOwned ? "bg-chakra-500/[0.06]" : "hover:bg-shadow-800/50"}`}
                >
                  <td className="px-2 py-1 sm:px-3">
                    <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md">
                      <input
                        type="checkbox"
                        checked={isOwned}
                        onChange={() => toggle(row.key)}
                        className={`h-[18px] w-[18px] cursor-pointer rounded accent-chakra-500 ${FOCUS} focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-900`}
                      />
                      <span className="sr-only">
                        Owned: {row.setShortName} {row.number}, {RARITY_META[row.rarity].label},{" "}
                        {VARIANT_LABEL[row.variant]}
                      </span>
                    </label>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={setHref(row.setId)}
                      className={`rounded-sm font-semibold text-white underline decoration-transparent underline-offset-4 transition hover:decoration-chakra-400 ${FOCUS}`}
                    >
                      {row.setName}
                    </Link>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ash-400">
                      {kind && <span>{kind}</span>}
                      {row.releaseDate && (
                        <span className="sm:hidden">
                          <time dateTime={row.releaseDate}>{formatDate(row.releaseDate)}</time>
                        </span>
                      )}
                      <span className="md:hidden">{VARIANT_LABEL[row.variant]}</span>
                      {row.upcoming && (
                        <span className="sm:hidden">
                          <UpcomingTag />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-white">{row.number}</td>
                  <td className="px-3 py-3">
                    <span className="sm:hidden">
                      <RarityBadge rarity={row.rarity} compact />
                    </span>
                    <span className="hidden sm:inline">
                      <RarityBadge rarity={row.rarity} />
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 text-ash-200 md:table-cell">{VARIANT_LABEL[row.variant]}</td>
                  <td className="hidden whitespace-nowrap px-3 py-3 pr-5 text-ash-200 sm:table-cell">
                    <span className="flex flex-wrap items-center gap-2">
                      {row.releaseDate ? <time dateTime={row.releaseDate}>{formatDate(row.releaseDate)}</time> : "—"}
                      {row.upcoming && <UpcomingTag />}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
