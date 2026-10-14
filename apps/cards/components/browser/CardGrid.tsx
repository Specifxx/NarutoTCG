"use client";

import type { NarutoCard } from "@naruto-tcg/types";
import Link from "next/link";
import { memo, useId, type CSSProperties } from "react";
import { CardImage } from "@/components/CardImage";
import { ElementBadge, RarityBadge } from "@/components/badges";
import { ELEMENT_META, RARITY_META, TYPE_META, cardHref, formatPower, primaryPrinting } from "@/lib/meta";
import type { SearchHit } from "@/lib/search";
import { Highlight } from "./Highlight";
import { CostIcon, PowerIcon } from "./icons";
import styles from "./browser.module.css";

type TileStyle = CSSProperties & Record<`--${string}`, string>;

/** Responsive card grid: 2 columns on phones up to 6 on wide screens. */
export function CardGrid({
  hits,
  tokens,
  eagerCount,
  newIds,
}: {
  hits: readonly SearchHit[];
  tokens: readonly string[];
  /** Leading tiles that load eagerly (above the fold). */
  eagerCount: number;
  /** Cards to flag as new reveals. */
  newIds: ReadonlySet<string>;
}) {
  const idPrefix = useId();
  return (
    <ul
      role="list"
      className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 xl:grid-cols-6"
    >
      {hits.map((hit, i) => (
        <CardTile
          key={hit.card.id}
          card={hit.card}
          isNew={newIds.has(hit.card.id)}
          tokens={tokens}
          priority={i < eagerCount}
          idPrefix={idPrefix}
        />
      ))}
    </ul>
  );
}

// Props are the card object (stable across searches) plus primitives, so memo
// skips tiles whose card and highlight tokens are unchanged.
const CardTile = memo(function CardTile({
  card,
  isNew,
  tokens,
  priority,
  idPrefix,
}: {
  card: NarutoCard;
  isNew: boolean;
  tokens: readonly string[];
  priority: boolean;
  idPrefix: string;
}) {
  const nameId = `${idPrefix}${card.id}-name`;
  const metaId = `${idPrefix}${card.id}-meta`;
  const style: TileStyle = { "--el": ELEMENT_META[card.element].hex };
  // Badge and foil describe the printing whose art is shown.
  const rarity = primaryPrinting(card).rarity;

  return (
    <li className={styles.cell}>
      <Link
        href={cardHref(card.id)}
        prefetch={false}
        aria-labelledby={nameId}
        aria-describedby={metaId}
        data-foil={RARITY_META[rarity].foil}
        style={style}
        className={`${styles.tile} group flex h-full flex-col rounded-[6px]`}
      >
        <div className={styles.art}>
          {/* The name, number and rarity are in the tile text right below. */}
          <CardImage card={card} priority={priority} alt="" />
          {/* Tabs pinned above the art's top corners never cover the printed cost, name or element. */}
          {card.type === "leader" && (
            // The type is already announced with the ID below.
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-2 left-2 z-10 rounded-full border border-chakra-400/50 bg-shadow-950 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-[0.14em] text-chakra-400"
            >
              Leader
            </span>
          )}
          {isNew && (
            <span
              aria-hidden="true"
              className={`${styles.newBadge} pointer-events-none absolute -top-2 right-2 z-10 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase leading-none tracking-[0.14em] text-shadow-950`}
            >
              New
            </span>
          )}
        </div>

        <div className="mt-2.5 flex flex-1 flex-col px-0.5">
          <h3 id={nameId} className="min-w-0">
            <span
              className="block truncate text-sm font-semibold leading-snug text-white transition-colors group-hover:text-chakra-400"
              title={card.name}
            >
              <Highlight text={card.name} tokens={tokens} />
            </span>
            {card.title && (
              <span className="block truncate text-xs leading-snug text-ash-400" title={card.title}>
                <span className="sr-only">, </span>
                <Highlight text={card.title} tokens={tokens} />
              </span>
            )}
          </h3>

          <div id={metaId} className="mt-auto pt-2">
            {isNew && <span className="sr-only">New reveal, </span>}
            <div className="flex items-center gap-2 text-[11px] text-ash-400">
              <span className="font-mono tracking-tight">
                <span className="sr-only">{TYPE_META[card.type].label} </span>
                {card.id}
              </span>
              <span className="ml-auto flex items-center gap-2 tabular-nums text-ash-200">
                {card.cost !== undefined && (
                  <span className="inline-flex items-center gap-0.5" title="Cost">
                    <CostIcon className="h-3 w-3 text-chakra-400" />
                    <span className="sr-only">, cost </span>
                    {card.cost}
                  </span>
                )}
                {card.power !== undefined && (
                  <span className="inline-flex items-center gap-0.5" title="Power">
                    <PowerIcon className="h-3 w-3 text-ash-400" />
                    <span className="sr-only">, power </span>
                    {formatPower(card.power)}
                  </span>
                )}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <ElementBadge element={card.element} className="px-1.5! text-[11px]!" />
              <RarityBadge rarity={rarity} compact className="px-1.5! text-[11px]!" />
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
});
