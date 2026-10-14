"use client";

import { motion } from "framer-motion";
import { GameCard } from "@/components/game/game-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { CardCatalog } from "@/lib/game/types";

export interface HandEntry {
  cardId: string;
  /** nth copy of this card id in hand (stable keys for duplicates). */
  copy: number;
  playable: boolean;
}

/** Layout id shared by a hand card and the unit it becomes, so the card flies onto the board. */
export const handLayoutId = (cardId: string, copy: number) => `puzzle-hand-${cardId}-${copy}`;

export function HandTray({
  entries,
  cards,
  selectedKey,
  onSelect,
  locked,
  wide,
  coachCardId,
}: {
  entries: HandEntry[];
  cards: CardCatalog;
  selectedKey: string | null;
  onSelect: (entry: HandEntry) => void;
  locked: boolean;
  wide: boolean;
  coachCardId: string | null;
}) {
  // Phones get the full rules text of the selected (or walkthrough) card under the hand.
  const detailId = selectedKey?.split(":")[0] ?? coachCardId;
  const detail = !wide && detailId ? cards[detailId] : undefined;
  return (
    <section id="puzzle-hand" tabIndex={-1} aria-labelledby="puzzle-hand-title" className="panel relative p-4 focus:outline-none sm:p-5">
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.25rem]">
        <span className="absolute inset-x-10 -bottom-20 h-40 rounded-full bg-chakra-500/10 blur-3xl" />
      </span>
      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <h2 id="puzzle-hand-title" className="eyebrow flex items-center gap-2 text-chakra-300">
          <Icon name="hand" size={14} />
          Your hand
          <span className="rounded-full bg-white/[0.06] px-1.5 py-px text-[10px] tracking-normal text-ash-300">
            {entries.length}
          </span>
        </h2>
        <p className="text-[11px] text-ash-500">Select a card to see where it can go</p>
      </div>
      {entries.length === 0 ? (
        <p className="relative mt-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-ash-400">
          Your hand is empty. Reveal a hidden character or pass to score the missions.
        </p>
      ) : (
        <div className="relative mt-1">
          <ul className="flex flex-wrap items-end justify-center gap-x-3 gap-y-4 pb-1 pt-5" aria-label="Cards in hand">
            {entries.map((entry) => {
              const card = cards[entry.cardId];
              if (!card) return null;
              const key = `${entry.cardId}:${entry.copy}`;
              const selected = selectedKey === key;
              const coached = coachCardId === entry.cardId;
              return (
                <motion.li key={key} layout="position" className="relative flex flex-col items-center gap-1.5">
                  <GameCard
                    card={card}
                    size="md"
                    layoutId={handLayoutId(entry.cardId, entry.copy)}
                    selected={selected}
                    dimmed={!entry.playable && !selected}
                    highlight={coached ? "gold" : undefined}
                    onClick={() => onSelect(entry)}
                    disabled={locked}
                    label={`${card.name}, ${card.title}. Cost ${card.cost}, Power ${card.power}.${card.effects.length ? ` ${card.effects.map((e) => `${e.trigger.replace("_", " ")}: ${e.text}`).join(" ")}` : ""}${entry.playable ? "" : " No legal play right now."}`}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-semibold",
                      selected ? "text-chakra-200" : entry.playable ? "text-ash-500" : "text-blood-400/80",
                    )}
                  >
                    {selected ? "Selected" : entry.playable ? `Face-up ${card.cost} · Hidden 1` : "No legal play"}
                  </span>
                </motion.li>
              );
            })}
          </ul>
          {detail && (
            <div className="mt-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[12.5px] leading-snug" aria-hidden="true">
              <p className="font-bold text-white">
                {detail.name} <span className="font-semibold text-ash-400">· {detail.title}</span>
              </p>
              {detail.effects.length > 0 ? (
                detail.effects.map((e, i) => (
                  <p key={i} className="mt-1 text-ash-200">
                    <span className="font-black text-chakra-200">{e.trigger.replace("_", " ")}:</span> {e.text}
                  </p>
                ))
              ) : !detail.chakraBonus ? (
                <p className="mt-1 text-ash-400">No effect text.</p>
              ) : null}
              {detail.chakraBonus ? <p className="mt-1 text-ash-200">CHAKRA +{detail.chakraBonus} each Start phase.</p> : null}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
