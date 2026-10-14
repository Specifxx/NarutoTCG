"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { Button } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import type { PracticeMissionId } from "@/lib/game/cards";
import { cn } from "@/lib/cn";
import {
  CARD_IDS,
  checkDeck,
  DECK_MIN,
  expandDeck,
  INITIAL_COUNTS,
  INITIAL_MISSIONS,
  INITIAL_ROWS,
  MISSIONS_NEEDED,
  SAMPLE_COUNTS,
  SAMPLE_MISSIONS,
  STEPPER_MAX,
} from "./deck-forge/data";
import { DeckChecklist, Decklist, MissionPicker } from "./deck-forge/decklist-editor";
import { SetupRitual } from "./deck-forge/setup-ritual";
import type { WidgetProps } from "./types";

type View = "forge" | "ritual";

interface RitualSnapshot {
  key: number;
  deck: string[];
  missions: PracticeMissionId[];
  sample: boolean;
}

function PartTab({
  id,
  index,
  title,
  selected,
  locked,
  done,
  badge,
  onSelect,
  onKeyDown,
  tabRef,
}: {
  id: View;
  index: number;
  title: string;
  selected: boolean;
  locked: boolean;
  done: boolean;
  badge?: string;
  onSelect: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  tabRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={tabRef}
      type="button"
      role="tab"
      id={`deck-forge-tab-${id}`}
      aria-controls={`deck-forge-panel-${id}`}
      aria-selected={selected}
      aria-disabled={locked || undefined}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        "relative flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors sm:flex-none sm:px-3.5",
        selected ? "text-white" : "text-ash-400 hover:text-ash-200",
        locked && "cursor-not-allowed opacity-55",
      )}
    >
      {selected && (
        <motion.span
          layoutId="deck-forge-tab"
          className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.07]"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <span
        className={cn(
          "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black",
          done
            ? "bg-gradient-to-br from-leaf-300 to-leaf-600 text-shadow-950"
            : selected
              ? "bg-gradient-to-br from-gold-200 to-gold-500 text-shadow-950"
              : "border border-white/15",
        )}
        aria-hidden="true"
      >
        {done ? <Icon name="check" size={12} strokeWidth={3} /> : locked ? <Icon name="lock" size={11} /> : index}
      </span>
      <span className="relative min-w-0">
        <span className="block truncate text-[13px] font-bold">{title}</span>
        {badge && <span className="block truncate text-[10.5px] font-semibold text-ash-500">{badge}</span>}
      </span>
    </button>
  );
}

/**
 * Deck Forge: fix an illegal decklist (Part A), then run the setup ritual
 * before Round 1 (Part B): toss for the Edge, seed the Mission deck, draw 5
 * and decide on a mulligan.
 */
export default function DeckForge({ onComplete, completed }: WidgetProps) {
  const [counts, setCounts] = useState<Record<string, number>>(() => ({ ...INITIAL_COUNTS }));
  const [rows, setRows] = useState<string[]>(() => [...INITIAL_ROWS]);
  const [missions, setMissions] = useState<PracticeMissionId[]>(() => [...INITIAL_MISSIONS]);
  const [view, setView] = useState<View>("forge");
  const [cleared, setCleared] = useState(false);
  const [burst, setBurst] = useState(0);
  const [ritual, setRitual] = useState<RitualSnapshot | null>(null);
  const [ritualDone, setRitualDone] = useState(false);
  const tabs = useRef<Record<View, HTMLButtonElement | null>>({ forge: null, ritual: null });

  const check = checkDeck(counts, missions);
  const ritualUnlocked = check.legal || cleared || completed;

  useEffect(() => {
    if (check.legal && !cleared) {
      setCleared(true);
      setBurst((b) => b + 1);
    }
  }, [check.legal, cleared]);

  useEffect(() => {
    if (ritualDone && cleared) onComplete();
  }, [ritualDone, cleared, onComplete]);

  const snapshot = (key: number): RitualSnapshot =>
    check.legal
      ? { key, deck: expandDeck(counts), missions: [...missions], sample: false }
      : { key, deck: expandDeck(SAMPLE_COUNTS), missions: [...SAMPLE_MISSIONS], sample: true };

  const openRitual = () => {
    if (!ritualUnlocked) return;
    if (!ritual) setRitual(snapshot(1));
    setView("ritual");
  };

  const select = (next: View) => {
    if (next === "ritual") openRitual();
    else setView("forge");
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next: View = view === "forge" ? "ritual" : "forge";
    if (next === "ritual" && !ritualUnlocked) return;
    select(next);
    tabs.current[next]?.focus();
  };

  const setCount = (id: string, next: number) =>
    setCounts((c) => ({ ...c, [id]: Math.max(0, Math.min(STEPPER_MAX, next)) }));
  const addVersion = (id: string) => {
    setRows((r) => (r.includes(id) ? r : [...r, id]));
    setCounts((c) => ({ ...c, [id]: Math.max(1, c[id] ?? 0) }));
  };
  const toggleMission = (id: PracticeMissionId) =>
    setMissions((m) => (m.includes(id) ? m.filter((x) => x !== id) : m.length >= MISSIONS_NEEDED ? m : [...m, id]));

  const onRitualDone = useCallback(() => setRitualDone(true), []);
  /** The pressed button disappears (hidden panel / unmounted card), so land on the ritual's first action. */
  const focusRitualAction = () =>
    window.setTimeout(() => {
      const panel = document.getElementById("deck-forge-panel-ritual");
      const target =
        Array.from(panel?.querySelectorAll<HTMLElement>("[data-ritual-actions] button:not([disabled])") ?? []).find(
          (b) => b.offsetParent !== null,
        ) ?? panel?.querySelector<HTMLElement>("[data-ritual-heading]");
      target?.focus({ preventScroll: true });
    }, 80);
  const beginRitual = () => {
    openRitual();
    focusRitualAction();
  };
  const replayRitual = () => {
    setRitual((r) => snapshot((r?.key ?? 0) + 1));
    setRitualDone(false);
    focusRitualAction();
  };

  const reset = () => {
    setCounts({ ...INITIAL_COUNTS });
    setRows([...INITIAL_ROWS]);
    setMissions([...INITIAL_MISSIONS]);
    setView("forge");
    setCleared(false);
    setRitual(null);
    setRitualDone(false);
  };

  // Keep the decklist rows in set order so new versions slot into place.
  const orderedRows = CARD_IDS.filter((id) => rows.includes(id));

  return (
    <div className="panel relative overflow-clip p-4 sm:p-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-chakra-500/10 blur-3xl"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Deck Forge"
          className="flex w-full gap-1 rounded-2xl border border-white/[0.07] bg-black/30 p-1 sm:w-auto"
        >
          <PartTab
            id="forge"
            index={1}
            title="Fix the decklist"
            selected={view === "forge"}
            locked={false}
            done={cleared}
            badge={check.legal ? "Legal" : `${check.problems} rule${check.problems === 1 ? "" : "s"} broken`}
            onSelect={() => select("forge")}
            onKeyDown={onTabKey}
            tabRef={(el) => {
              tabs.current.forge = el;
            }}
          />
          <PartTab
            id="ritual"
            index={2}
            title="Setup ritual"
            selected={view === "ritual"}
            locked={!ritualUnlocked}
            done={ritualDone}
            badge={ritualUnlocked ? (ritualDone ? "Ready" : "Before Round 1") : "Fix the deck first"}
            onSelect={() => select("ritual")}
            onKeyDown={onTabKey}
            tabRef={(el) => {
              tabs.current.ritual = el;
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          {completed && (
            <span className="flex items-center gap-1 rounded-full border border-leaf-400/40 bg-leaf-500/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-leaf-300">
              <Icon name="check" size={12} strokeWidth={3} />
              Cleared
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={reset}>
            <Icon name="undo" size={14} />
            Reset
          </Button>
        </div>
      </div>

      {/* Part A */}
      <div
        role="tabpanel"
        id="deck-forge-panel-forge"
        aria-labelledby="deck-forge-tab-forge"
        hidden={view !== "forge"}
        className="relative mt-5"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-black/20 p-4 lg:col-start-2 lg:row-start-1">
            <p className="eyebrow mb-3 flex items-center gap-1.5 text-ash-300">
              <Icon name="shield" size={13} />
              Deck rules
            </p>
            <DeckChecklist check={check} counts={counts} missionCount={missions.length} />
          </div>
          <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <Decklist rows={orderedRows} counts={counts} onChange={setCount} onAdd={addVersion} />
          </div>
          <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-black/20 p-4 lg:col-start-2 lg:row-start-2 lg:self-start">
            <MissionPicker selected={missions} onToggle={toggleMission} />
          </div>
        </div>

        {/* Live status bar: sticks to the bottom of the viewport while you edit. */}
        <div className="sticky bottom-3 z-30 mt-5">
          <motion.div
            layout
            className={cn(
              "relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md transition-colors duration-500",
              check.legal
                ? "border-leaf-400/45 bg-shadow-900/90 shadow-[0_0_40px_-10px_rgba(74,222,128,0.6)]"
                : "border-white/10 bg-shadow-900/90 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)]",
            )}
          >
            <ParticleBurst fire={burst} palette="leaf" shape="mixed" count={32} spread={150} />
            <p className="flex min-w-0 items-center gap-2.5 text-sm" aria-live="polite">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  check.legal
                    ? "bg-gradient-to-br from-leaf-300 to-leaf-600 text-shadow-950"
                    : "bg-blood-500/15 text-blood-400 ring-1 ring-blood-400/40",
                )}
                aria-hidden="true"
              >
                {check.legal ? (
                  <Icon name="check" size={16} strokeWidth={3} />
                ) : (
                  <span className="text-[13px] font-black">{check.problems}</span>
                )}
              </span>
              <span className="min-w-0">
                {check.legal ? (
                  <>
                    <span className="font-black text-leaf-300">Deck legal!</span>{" "}
                    <span className="text-ash-300">
                      {check.total} cards, every version within the limit, {MISSIONS_NEEDED} Missions.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-white">
                      {check.problems} rule{check.problems === 1 ? "" : "s"} broken.
                    </span>{" "}
                    <span className="text-ash-400">
                      {!check.copiesOk ? "Too many copies of one version. " : ""}
                      {!check.sizeOk ? `${check.total}/${DECK_MIN} cards. ` : ""}
                      {!check.missionsOk ? `${missions.length}/${MISSIONS_NEEDED} Missions.` : ""}
                    </span>
                  </>
                )}
              </span>
            </p>
            <AnimatePresence>
              {check.legal && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Button variant="success" onClick={beginRitual}>
                    Begin the setup ritual
                    <Icon name="arrow-right" size={15} />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Part B: mounted on first visit, then kept alive while you flip between tabs. */}
      <div
        role="tabpanel"
        id="deck-forge-panel-ritual"
        aria-labelledby="deck-forge-tab-ritual"
        hidden={view !== "ritual"}
        className="relative mt-5"
      >
        {ritual ? (
          <SetupRitual
            key={ritual.key}
            deck={ritual.deck}
            missions={ritual.missions}
            sample={ritual.sample}
            onDone={onRitualDone}
            onReplay={replayRitual}
          />
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-ash-400">
            <Emblem name="seal" size={32} className="text-ash-500" />
            <p className="text-sm">Make your deck legal to begin the setup ritual.</p>
          </div>
        )}
      </div>
    </div>
  );
}
