"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FACTION_STYLES } from "@/components/game/game-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { RichText } from "@/components/ui/rich-text";
import { PRACTICE_MISSIONS, type PracticeMissionId } from "@/lib/game/cards";
import { cn } from "@/lib/cn";
import {
  CARD_IDS,
  cardOf,
  COPY_LIMIT,
  DECK_MIN,
  MISSION_IDS,
  MISSIONS_NEEDED,
  STEPPER_MAX,
  versionCode,
  type DeckCheck,
  sharedNames,
} from "./data";

/* ------------------------------------------------------------------ */
/* Checklist                                                           */
/* ------------------------------------------------------------------ */

function CheckIcon({ ok }: { ok: boolean }) {
  return (
    <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={ok ? "ok" : "bad"}
          initial={{ scale: 0.3, rotate: ok ? -90 : 90, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.3, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full",
            ok
              ? "bg-gradient-to-br from-leaf-300 to-leaf-600 text-shadow-950 shadow-[0_0_14px_rgba(74,222,128,0.55)]"
              : "bg-blood-500/15 text-blood-400 ring-1 ring-blood-400/50",
          )}
        >
          <Icon name={ok ? "check" : "x"} size={14} strokeWidth={3} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function CheckItem({ ok, title, detail, value }: { ok: boolean; title: string; detail: string; value?: string }) {
  return (
    <li className="flex gap-3">
      <CheckIcon ok={ok} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className={cn("text-[13.5px] font-bold", ok ? "text-white" : "text-ash-200")}>
            {title}
            <span className="sr-only">{ok ? ": done" : ": not yet"}</span>
          </span>
          {value && (
            <span className={cn("text-[12px] font-black tabular-nums", ok ? "text-leaf-300" : "text-blood-400")}>
              {value}
            </span>
          )}
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={detail}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.16 }}
            className="mt-0.5 text-[12px] leading-snug text-ash-400"
          >
            {detail}
          </motion.p>
        </AnimatePresence>
      </div>
    </li>
  );
}

/** 30 slots that light up as the deck grows; overflow shows as a bonus pill. */
function DeckMeter({ total }: { total: number }) {
  const full = total >= DECK_MIN;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="eyebrow !text-[10px] text-ash-400">Deck size</span>
        <span className="flex items-baseline gap-1">
          <AnimatedNumber
            value={total}
            className={cn("text-2xl font-black tabular-nums", full ? "text-leaf-300" : "text-white")}
          />
          <span className="text-sm font-bold text-ash-500">/ {DECK_MIN}</span>
          <AnimatePresence>
            {total > DECK_MIN && (
              <motion.span
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                className="ml-1 rounded-full bg-gold-400/15 px-1.5 py-0.5 text-[10.5px] font-black text-gold-200"
              >
                +{total - DECK_MIN}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </div>
      <div
        className="mt-2 flex gap-[3px]"
        role="meter"
        aria-label="Deck size"
        aria-valuemin={0}
        aria-valuemax={DECK_MIN}
        aria-valuenow={Math.min(total, DECK_MIN)}
        aria-valuetext={`${total} of at least ${DECK_MIN} cards`}
      >
        {Array.from({ length: DECK_MIN }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-3 flex-1 rounded-[3px] transition-[background-color,box-shadow,transform] duration-300",
              i < total
                ? full
                  ? "bg-gradient-to-b from-leaf-300 to-leaf-500 shadow-[0_0_6px_rgba(74,222,128,0.6)]"
                  : "bg-gradient-to-b from-chakra-300 to-chakra-500 shadow-[0_0_6px_rgba(255,122,26,0.5)]"
                : "bg-white/[0.07]",
              i % 5 === 4 && "mr-[2px]",
            )}
            style={{ transitionDelay: `${i * 12}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function DeckChecklist({
  check,
  counts,
  missionCount,
}: {
  check: DeckCheck;
  counts: Readonly<Record<string, number>>;
  missionCount: number;
}) {
  const shortBy = DECK_MIN - check.total;
  const overNames = check.over.map((id) => `${cardOf(id).name} · ${cardOf(id).title} (${counts[id]})`);
  return (
    <div className="space-y-4">
      <DeckMeter total={check.total} />
      <ul className="space-y-3" aria-live="polite">
        <CheckItem
          ok={check.sizeOk}
          title={`At least ${DECK_MIN} cards`}
          value={`${check.total}/${DECK_MIN}`}
          detail={
            check.sizeOk
              ? check.total > DECK_MIN
                ? `${check.total} cards. More than ${DECK_MIN} is fine.`
                : `Exactly ${DECK_MIN}. That's the minimum.`
              : `Add ${shortBy} more: raise a version to ${COPY_LIMIT} copies, or add a new version.`
          }
        />
        <CheckItem
          ok={check.copiesOk}
          title={`Max ${COPY_LIMIT} copies per version`}
          detail={check.copiesOk ? "Every version is within the limit." : `Too many copies of ${overNames.join(", ")}.`}
        />
        <CheckItem
          ok={check.missionsOk}
          title={`${MISSIONS_NEEDED} different Missions`}
          value={`${missionCount}/${MISSIONS_NEEDED}`}
          detail={
            check.missionsOk
              ? "Set. They wait outside your deck for setup."
              : `Choose ${MISSIONS_NEEDED - missionCount} more below. Missions never count toward your ${DECK_MIN}.`
          }
        />
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Decklist rows                                                       */
/* ------------------------------------------------------------------ */

function Stepper({ id, count, onChange }: { id: string; count: number; onChange: (id: string, next: number) => void }) {
  const card = cardOf(id);
  const label = `${card.name}, ${card.title}`;
  const minusRef = useRef<HTMLButtonElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  // Keep keyboard focus inside the stepper when a button disables itself.
  const step = (next: number) => {
    onChange(id, next);
    if (next <= 0) requestAnimationFrame(() => plusRef.current?.focus());
    else if (next >= STEPPER_MAX) requestAnimationFrame(() => minusRef.current?.focus());
  };
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-ash-100 transition hover:border-white/25 hover:bg-white/10 active:scale-90 disabled:pointer-events-none disabled:opacity-30";
  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`Copies of ${label}`}>
      <button
        ref={minusRef}
        type="button"
        className={btn}
        onClick={() => step(count - 1)}
        disabled={count <= 0}
        aria-label={`Remove a copy of ${label}`}
      >
        <Icon name="minus" size={14} strokeWidth={2.6} />
      </button>
      <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden">
        <span className="sr-only">{count} copies</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={count}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 30 }}
            aria-hidden="true"
            className={cn(
              "text-base font-black tabular-nums",
              count > COPY_LIMIT ? "text-blood-400" : count === 0 ? "text-ash-500" : "text-white",
            )}
          >
            ×{count}
          </motion.span>
        </AnimatePresence>
      </span>
      <button
        ref={plusRef}
        type="button"
        className={btn}
        data-add-id={id}
        onClick={() => step(count + 1)}
        disabled={count >= STEPPER_MAX}
        aria-label={`Add a copy of ${label}`}
      >
        <Icon name="plus" size={14} strokeWidth={2.6} />
      </button>
    </div>
  );
}

function DeckRow({
  id,
  count,
  sharesName,
  onChange,
}: {
  id: string;
  count: number;
  sharesName: boolean;
  onChange: (id: string, next: number) => void;
}) {
  const card = cardOf(id);
  const faction = FACTION_STYLES[card.faction];
  const over = count > COPY_LIMIT;
  return (
    <motion.li
      layout
      className="min-w-0"
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
    >
      <motion.div
        animate={over ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors sm:gap-3",
          over
            ? "border-blood-400/55 bg-blood-500/10 shadow-[0_0_24px_-10px_rgba(239,64,96,0.8)]"
            : count === 0
              ? "border-white/[0.05] bg-transparent opacity-60"
              : "border-white/[0.07] bg-white/[0.025] hover:border-white/15",
        )}
      >
        <span
          className={cn("relative h-11 w-8 shrink-0 rounded-md bg-gradient-to-br p-[1.5px]", faction.frame)}
          aria-hidden="true"
        >
          <span
            className={cn(
              "flex h-full w-full items-center justify-center rounded-[5px] bg-gradient-to-br",
              faction.art,
            )}
          >
            <Emblem name={card.emblem} size={16} className={faction.emblem} />
          </span>
          <span className="absolute -left-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-energy-300 to-energy-600 text-[10px] font-black text-white ring-1 ring-shadow-950">
            {card.cost}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-bold leading-tight text-white">{card.name}</p>
          <p className="truncate text-[11.5px] leading-tight text-ash-400">
            {card.title}
            <span className="text-ash-500"> · {versionCode(id)}</span>
          </p>
          {sharesName && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-mist-500/15 px-1.5 py-px text-[10px] font-bold text-mist-300">
              <Icon name="layers" size={10} />
              <span className="sm:hidden">Same name</span>
              <span className="hidden sm:inline">Same name, different version</span>
            </span>
          )}
        </div>
        <Stepper id={id} count={count} onChange={onChange} />
      </motion.div>
      <AnimatePresence initial={false}>
        {over && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 overflow-hidden px-2 pt-1 text-[12px] font-semibold text-blood-400"
          >
            <Icon name="x" size={12} strokeWidth={3} className="shrink-0" />
            {count} copies of this exact version. The limit is {COPY_LIMIT}.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export function Decklist({
  rows,
  counts,
  onChange,
  onAdd,
}: {
  rows: readonly string[];
  counts: Readonly<Record<string, number>>;
  onChange: (id: string, next: number) => void;
  onAdd: (id: string) => void;
}) {
  const shared = sharedNames(counts);
  const sharedSet = new Set(shared.map((g) => g.name));
  const pool = CARD_IDS.filter((id) => !rows.includes(id));
  const rootRef = useRef<HTMLDivElement>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => {
    if (!focusId) return;
    const el = rootRef.current?.querySelector<HTMLButtonElement>(`[data-add-id="${focusId}"]`);
    (el && !el.disabled ? el : el?.parentElement?.querySelector<HTMLButtonElement>("button"))?.focus();
    setFocusId(null);
  }, [focusId]);
  return (
    <div ref={rootRef}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="eyebrow flex items-center gap-1.5 text-chakra-300">
          <Icon name="layers" size={13} />
          Decklist
        </p>
        <p className="text-[11.5px] text-ash-500">Version = set + number</p>
      </div>

      {shared.map((group) => (
        <div
          key={group.name}
          className="mt-3 flex gap-2.5 rounded-xl border border-mist-400/25 bg-mist-500/[0.07] px-3 py-2.5 text-[12.5px] leading-relaxed text-ash-300"
        >
          <Icon name="info" size={15} className="mt-0.5 shrink-0 text-mist-300" />
          <p>
            <span className="font-bold text-white">{group.name}</span> appears as {group.versions.length} versions (
            {group.versions.map((v, i) => (
              <span key={v.id}>
                {i > 0 && " + "}
                <span className={cn("font-semibold", v.count > COPY_LIMIT ? "text-blood-400" : "text-mist-200")}>
                  {v.count}× {cardOf(v.id).title}
                </span>
              </span>
            ))}
            ). Same-name characters are unlimited; only each version is capped at {COPY_LIMIT}.
          </p>
        </div>
      ))}

      <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2 xl:grid-cols-2">
        {rows.map((id) => (
          <DeckRow
            key={id}
            id={id}
            count={counts[id] ?? 0}
            sharesName={sharedSet.has(cardOf(id).name)}
            onChange={onChange}
          />
        ))}
      </ul>

      {pool.length > 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 p-3">
          <p className="text-[12px] font-bold text-ash-300">Add another version</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {pool.map((id) => {
              const card = cardOf(id);
              return (
                <motion.button
                  key={id}
                  type="button"
                  layout
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onAdd(id);
                    setFocusId(id);
                  }}
                  className="flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1.5 pr-3 text-left text-[12px] font-semibold text-ash-200 transition-colors hover:border-chakra-400/50 hover:bg-chakra-500/10 hover:text-white"
                  aria-label={`Add ${card.name}, ${card.title} to the deck`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-chakra-500/20 text-chakra-300">
                    <Icon name="plus" size={12} strokeWidth={2.8} />
                  </span>
                  <span className="truncate">
                    {card.name} <span className="text-ash-500">· {card.title}</span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Missions                                                            */
/* ------------------------------------------------------------------ */

export function MissionPicker({
  selected,
  onToggle,
}: {
  selected: readonly PracticeMissionId[];
  onToggle: (id: PracticeMissionId) => void;
}) {
  const [nudge, setNudge] = useState(0);
  const full = selected.length >= MISSIONS_NEEDED;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="eyebrow flex items-center gap-1.5 text-gold-300">
          <Emblem name="scroll" size={13} />
          Your 3 Missions
        </p>
        <p className="text-[11.5px] text-ash-500">Kept outside the deck</p>
      </div>
      <RichText
        as="p"
        text="Each player brings **3 different** Missions. A Mission's [[rank]] isn't printed: it's set by the Round it enters play."
        className="mt-1.5 text-[12.5px] leading-relaxed text-ash-400"
      />
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {MISSION_IDS.map((id) => {
          const def = PRACTICE_MISSIONS[id];
          const index = selected.indexOf(id);
          const on = index >= 0;
          return (
            <li key={id}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                aria-pressed={on}
                onClick={() => {
                  if (!on && full) {
                    setNudge((n) => n + 1);
                    return;
                  }
                  onToggle(id);
                }}
                className={cn(
                  "relative flex h-full w-full flex-col items-start gap-1 rounded-xl border px-2.5 py-2 text-left transition-colors",
                  on
                    ? "border-gold-400/60 bg-gradient-to-br from-gold-400/15 to-transparent shadow-[0_0_20px_-8px_rgba(245,197,66,0.7)]"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
                  !on && full && "opacity-55",
                )}
              >
                <span className="flex w-full items-center justify-between gap-1">
                  <span
                    className="flex h-5 items-center rounded bg-white/[0.06] px-1.5 text-[10px] font-black text-ash-300"
                    aria-hidden="true"
                  >
                    ?-rank
                  </span>
                  <AnimatePresence>
                    {on && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-gold-200 to-gold-500 text-[10px] font-black text-shadow-950"
                      >
                        {index + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className="text-[12px] font-bold leading-tight text-white">{def.name}</span>
                <span className="text-[11px] text-ash-400">Base {def.basePoints} pts</span>
              </motion.button>
            </li>
          );
        })}
      </ul>
      <AnimatePresence>
        {nudge > 0 && full && (
          <motion.p
            key={nudge}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: [0, -4, 4, 0] }}
            exit={{ opacity: 0 }}
            className="mt-2 text-[12px] font-semibold text-gold-200"
            role="status"
          >
            You already have 3. Deselect one to swap it out.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
