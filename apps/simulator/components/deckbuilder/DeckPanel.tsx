"use client";

import type { Deck } from "@naruto-tcg/types";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Crown, Flag, Minus, Plus, ShieldAlert, XCircle } from "lucide-react";
import { useMemo } from "react";
import { compareByCost, ELEMENT_META, TYPE_META } from "@/lib/cards/meta";
import type { CardDb, SimCard } from "@/lib/cards/types";
import { classifyArchetype, costCurve, deckStats } from "@/lib/deck/analytics";
import { addBlocker, splitDeck } from "@/lib/deck/deck";
import { validateDeck } from "@/lib/deck/validate";
import { FORMAT } from "@/lib/game-engine/format";
import { CardFace } from "../cards/CardFace";
import { hoverProps } from "../cards/HoverPreview";
import { cx } from "../ui/Button";
import { ArchetypePanel } from "./ArchetypePanel";
import { CostCurveChart } from "./CostCurveChart";

export function DeckPanel({
  deck,
  db,
  readOnly,
  onAdd,
  onRemove,
}: {
  deck: Deck;
  db: CardDb;
  readOnly: boolean;
  onAdd: (card: SimCard) => void;
  onRemove: (card: SimCard, all?: boolean) => void;
}) {
  const parts = useMemo(() => splitDeck(deck, db), [deck, db]);
  const validation = useMemo(() => validateDeck(deck, db), [deck, db]);
  const curve = useMemo(() => costCurve(deck, db), [deck, db]);
  const archetype = useMemo(() => classifyArchetype(deck, db), [deck, db]);
  const stats = useMemo(() => deckStats(deck, db), [deck, db]);
  const leader = parts.leaders[0]?.card ?? null;
  const groups = (["character", "jutsu", "item"] as const).map((type) => ({
    type,
    rows: parts.main.filter((r) => r.card.type === type).sort((a, b) => compareByCost(a.card, b.card)),
  }));

  return (
    <div className="space-y-4">
      <div className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="panel-title">Validator</span>
          <span
            className={cx(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wider",
              validation.legal ? "bg-jade-400/10 text-jade-400" : "bg-blood-500/10 text-blood-400",
            )}
          >
            {validation.legal ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            {validation.legal ? "Legal" : "Not legal"}
          </span>
        </div>
        <ul className="space-y-1.5">
          {validation.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-xs">
              {c.ok ? <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-jade-400" /> : <XCircle className="mt-px h-3.5 w-3.5 shrink-0 text-blood-400" />}
              <span className="text-ash-200">{c.label}</span>
              <span className={cx("ml-auto text-right", c.ok ? "text-ash-500" : "text-blood-400")}>{c.detail}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5" aria-hidden>
          <motion.div
            className={cx("h-full rounded-full", validation.counts.main > FORMAT.mainDeckSize ? "bg-blood-500" : "bg-gradient-to-r from-chakra-500 to-chakra-300")}
            initial={false}
            animate={{ width: `${Math.min(100, (validation.counts.main / FORMAT.mainDeckSize) * 100)}%` }}
          />
        </div>
      </div>

      <div className="panel grid grid-cols-[auto_1fr] gap-4 p-4">
        <div>
          <p className="panel-title mb-2 flex items-center gap-1.5">
            <Crown className="h-3 w-3 text-edge-400" /> Leader
          </p>
          {leader ? (
            <button type="button" {...hoverProps(leader)} onClick={() => !readOnly && onRemove(leader, true)} title={readOnly ? undefined : "Remove Leader"} className="block">
              <CardFace card={leader} size="sm" />
            </button>
          ) : (
            <EmptySlot label="Add a Leader" />
          )}
        </div>
        <div className="min-w-0">
          <p className="panel-title mb-2 flex items-center gap-1.5">
            <Flag className="h-3 w-3 text-chakra-300" /> Missions ({validation.counts.missions}/{FORMAT.missionCount})
          </p>
          <div className="flex gap-2">
            {Array.from({ length: FORMAT.missionCount }, (_, i) => {
              const m = parts.missions[i]?.card;
              return m ? (
                <button key={m.id} type="button" {...hoverProps(m)} onClick={() => !readOnly && onRemove(m, true)} title={readOnly ? undefined : "Remove mission"}>
                  <CardFace card={m} size="sm" />
                </button>
              ) : (
                <EmptySlot key={i} label="Mission" />
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="panel-title">Main deck</span>
          <span className="font-display text-sm font-bold text-ash-100">
            {validation.counts.main}
            <span className="text-ash-500">/{FORMAT.mainDeckSize}</span>
          </span>
        </div>
        {parts.main.length === 0 && <p className="py-6 text-center text-xs text-ash-500">Click cards on the left to add them.</p>}
        {groups.map(({ type, rows }) =>
          rows.length ? (
            <div key={type} className="mt-3 first:mt-0">
              <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-ash-500">
                {TYPE_META[type].plural} · {rows.reduce((n, r) => n + r.quantity, 0)}
              </p>
              <ul>
                <AnimatePresence initial={false}>
                  {rows.map(({ card, quantity }) => (
                    <motion.li
                      key={card.id}
                      layout
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      {...hoverProps(card)}
                      className={cx(
                        "group flex items-center gap-2 rounded-md py-1 pl-1 pr-1.5 hover:bg-white/[0.04]",
                        validation.overLimit.includes(card.id) && "bg-blood-500/10",
                      )}
                      style={{ boxShadow: `inset 2px 0 0 ${ELEMENT_META[card.element].color}` }}
                    >
                      <span className="ml-1.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-to-br from-chakra-300 to-chakra-500 font-display text-[10px] font-bold text-shadow-950">
                        {card.cost}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-ash-100">
                        {card.name}
                        {card.title && <span className="text-ash-500"> — {card.title}</span>}
                      </span>
                      {card.type === "character" && <span className="font-display text-[10px] text-ash-400">{card.power}P</span>}
                      {!readOnly && (
                        <span className="flex items-center opacity-60 transition-opacity group-hover:opacity-100">
                          <button type="button" aria-label={`Remove one ${card.name}`} onClick={() => onRemove(card)} className="grid h-5 w-5 place-items-center rounded text-ash-400 hover:bg-white/10 hover:text-ash-50">
                            <Minus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Add one ${card.name}`}
                            disabled={addBlocker(deck, db, card) !== null}
                            onClick={() => onAdd(card)}
                            className="grid h-5 w-5 place-items-center rounded text-ash-400 hover:bg-white/10 hover:text-ash-50 disabled:opacity-30"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </span>
                      )}
                      <span className="w-6 text-right font-display text-xs font-bold text-chakra-300">×{quantity}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          ) : null,
        )}
      </div>

      <div className="panel p-4">
        <CostCurveChart curve={curve} />
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Metric label="Characters" value={stats.characters} />
          <Metric label="Avg power" value={stats.averagePower.toFixed(1)} />
          <Metric label="Power / Chakra" value={stats.powerPerChakra.toFixed(2)} />
        </dl>
        {stats.elements.length > 0 && (
          <div className="mt-4">
            <p className="panel-title mb-1.5">Elements</p>
            <div className="flex h-2 gap-[2px] overflow-hidden rounded-full">
              {stats.elements.map((e) => (
                <div
                  key={e.element}
                  title={`${ELEMENT_META[e.element].label}: ${e.count}`}
                  style={{ flex: e.count, background: ELEMENT_META[e.element].color }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-ash-400">
              {stats.elements.map((e) => (
                <span key={e.element}>
                  <span style={{ color: ELEMENT_META[e.element].color }}>{ELEMENT_META[e.element].kanji}</span> {ELEMENT_META[e.element].label} {e.count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="panel p-4">
        <ArchetypePanel report={archetype} />
      </div>
    </div>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <div className="grid h-[104px] w-[74px] place-items-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-1 text-center text-[10px] uppercase tracking-wider text-ash-500">
      {label}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/5 bg-shadow-950/50 px-2 py-2">
      <dd className="font-display text-base font-bold text-ash-50">{value}</dd>
      <dt className="text-[10px] uppercase tracking-wider text-ash-500">{label}</dt>
    </div>
  );
}
