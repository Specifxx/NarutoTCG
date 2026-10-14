"use client";

import { ELEMENT_META, fullName, RARITY_META, TYPE_META } from "@/lib/cards/meta";
import type { SimCard } from "@/lib/cards/types";
import { CardFace } from "./CardFace";
import { CardText } from "./CardText";

/** Large card with full rules text and metadata (deck builder preview, playmat inspector). */
export function CardDetail({ card, extra, compact = false }: { card: SimCard; extra?: React.ReactNode; compact?: boolean }) {
  const meta = ELEMENT_META[card.element];
  const rarity = RARITY_META[card.rarity];
  const header = (
    <>
      <div>
        <p className="font-display text-base font-bold leading-tight text-ash-50">{fullName(card)}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] uppercase tracking-wider text-ash-400">
          <span style={{ color: meta.color }}>
            {meta.kanji} {meta.label}
          </span>
          <span>{TYPE_META[card.type].label}</span>
          {card.village && <span>{card.village}</span>}
          <span style={{ color: rarity.color }}>{rarity.label}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {card.type !== "leader" && card.type !== "mission" && <Stat label="Cost" value={card.cost} />}
        {card.type === "character" && <Stat label="Power" value={card.power} />}
        {card.type === "mission" && <Stat label="Points" value={card.points} />}
        <Stat label="No." value={`${card.set} ${card.number}`} />
      </div>
      {card.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.keywords.map((k) => (
            <span key={k} className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ash-300">
              {k}
            </span>
          ))}
        </div>
      )}
    </>
  );
  const body = (
    <>
      <div className="rounded-lg border border-white/5 bg-shadow-950/60 p-2.5">
        <CardText card={card} showAutomation />
      </div>
      {card.flavor && <p className="text-xs italic text-ash-500">“{card.flavor}”</p>}
      {extra}
    </>
  );

  if (compact) {
    return (
      <div className="space-y-2.5">
        <div className="flex gap-3">
          <CardFace card={card} size="md" />
          <div className="min-w-0 flex-1 space-y-2">{header}</div>
        </div>
        {body}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <CardFace card={card} size="lg" />
      <div className="w-full min-w-0 space-y-2">
        {header}
        {body}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="rounded-md border border-white/8 bg-shadow-800/70 px-2 py-0.5">
      <span className="text-ash-500">{label} </span>
      <span className="font-display font-semibold text-ash-100">{value}</span>
    </span>
  );
}
