"use client";

import type { NarutoCard } from "@naruto-tcg/types";
import Link from "next/link";
import { memo, useId } from "react";
import { CardImage } from "@/components/CardImage";
import { ElementBadge, RarityBadge, TypeBadge } from "@/components/badges";
import { cardHref, cardRarities, cardSetIds, formatCost, formatPower } from "@/lib/meta";
import type { SearchHit } from "@/lib/search";
import { Highlight } from "./Highlight";
import styles from "./browser.module.css";

const TH = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-ash-400";

/**
 * Accessible results table. Each row's name links to the card; the link's
 * overlay makes the whole row clickable without nesting interactive content.
 * The wrapper scrolls horizontally on narrow screens and is keyboard focusable.
 */
export function CardTable({
  hits,
  tokens,
  total,
  eagerCount,
}: {
  hits: readonly SearchHit[];
  tokens: readonly string[];
  /** Total results, which may exceed the rows rendered so far. */
  total: number;
  eagerCount: number;
}) {
  const captionId = useId();
  return (
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      className="overflow-x-auto rounded-xl border border-shadow-700 bg-shadow-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
    >
      <table className="w-full min-w-[54rem] border-collapse text-sm">
        <caption id={captionId} className="sr-only">
          Card search results: {total.toLocaleString("en-US")} {total === 1 ? "card" : "cards"}
          {hits.length < total ? `, showing the first ${hits.length}` : ""}
        </caption>
        <thead className="border-b border-shadow-700 bg-shadow-900">
          <tr>
            <th scope="col" className={`${TH} w-16`}>
              <span className="sr-only">Artwork</span>
            </th>
            <th scope="col" className={TH}>
              Card
            </th>
            <th scope="col" className={TH}>
              ID
            </th>
            <th scope="col" className={TH}>
              Type
            </th>
            <th scope="col" className={TH}>
              Element
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Cost
            </th>
            <th scope="col" className={`${TH} text-right`}>
              Power
            </th>
            <th scope="col" className={TH}>
              Rarity
            </th>
            <th scope="col" className={TH}>
              Sets
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-shadow-800">
          {hits.map((hit, i) => (
            <CardRow key={hit.card.id} card={hit.card} tokens={tokens} priority={i < eagerCount} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NoValue() {
  return (
    <>
      <span aria-hidden="true" className="text-ash-400">
        —
      </span>
      <span className="sr-only">None</span>
    </>
  );
}

const CardRow = memo(function CardRow({
  card,
  tokens,
  priority,
}: {
  card: NarutoCard;
  tokens: readonly string[];
  priority: boolean;
}) {
  return (
    <tr className={`${styles.row} group transition-colors hover:bg-shadow-800/70 focus-within:bg-shadow-800/70`}>
      <td className="py-2 pl-3 pr-1 align-middle">
        {/* Decorative here: the name column carries the same information. */}
        <div aria-hidden="true" className={`${styles.thumb} w-10`}>
          <CardImage card={card} priority={priority} className="rounded-[3px] shadow-md shadow-black/50" />
        </div>
      </td>
      <th scope="row" className="max-w-[18rem] px-3 py-2 text-left align-middle font-normal">
        <Link
          href={cardHref(card.id)}
          prefetch={false}
          className="block truncate font-semibold text-white outline-none transition-colors after:absolute after:inset-0 after:rounded-sm group-hover:text-chakra-400 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-chakra-400"
        >
          <Highlight text={card.name} tokens={tokens} />
        </Link>
        {card.title && (
          <span className="block truncate text-xs text-ash-400">
            <Highlight text={card.title} tokens={tokens} />
          </span>
        )}
      </th>
      <td className="whitespace-nowrap px-3 py-2 align-middle font-mono text-xs text-ash-200">{card.id}</td>
      <td className="px-3 py-2 align-middle">
        <TypeBadge type={card.type} className="text-[10px]!" />
      </td>
      <td className="px-3 py-2 align-middle">
        <ElementBadge element={card.element} />
      </td>
      <td className="px-3 py-2 text-right align-middle font-semibold tabular-nums text-white">
        {card.cost === undefined ? <NoValue /> : formatCost(card.cost)}
      </td>
      <td className="px-3 py-2 text-right align-middle tabular-nums text-ash-200">
        {card.power === undefined ? <NoValue /> : formatPower(card.power)}
      </td>
      <td className="px-3 py-2 align-middle">
        <div className="flex flex-wrap gap-1">
          {cardRarities(card).map((rarity) => (
            <RarityBadge key={rarity} rarity={rarity} compact />
          ))}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-middle font-mono text-xs text-ash-400">
        {cardSetIds(card).join(" · ")}
      </td>
    </tr>
  );
});
