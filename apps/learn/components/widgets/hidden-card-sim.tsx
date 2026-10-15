"use client";

import { AnimatePresence, motion, useAnimate, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { useParticleFlight } from "@/components/fx/particle-flight";
import { ChakraPool } from "@/components/game/chakra-pool";
import { EdgeToken } from "@/components/game/edge-token";
import { GameCard, type CardSize } from "@/components/game/game-card";
import { MissionCard } from "@/components/game/mission-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";
import { Icon, type IconName } from "@/components/ui/icon";
import { RichText } from "@/components/ui/rich-text";
import { cn } from "@/lib/cn";
import { PRACTICE_CARDS } from "@/lib/game/cards";
import { applyAction, sidePower, unitPower } from "@/lib/game/engine";
import { RANK_BONUS, type GameAction, type GameEvent, type GameState, type MissionOutcome } from "@/lib/game/types";
import { AmbushTitle } from "./hidden-card-sim/ambush-title";
import { PathCompare, type PlayPath } from "./hidden-card-sim/path-compare";
import {
  AMBUSH_SCENARIOS,
  addTokens,
  cardOf,
  comparePaths,
  initialState,
  opponentTurn,
  passAndScore,
  removeUnit,
  scenarioById,
  setHidden,
  type AmbushScenario,
  type AmbushScenarioId,
} from "./hidden-card-sim/scenarios";
import { StepTrack, type StepStatus, type TrackStep } from "./hidden-card-sim/step-track";
import { useMediaQuery, useScheduler } from "./hidden-card-sim/use-scheduler";
import type { WidgetProps } from "./types";

type Phase = "ready" | "placing" | "opp-turn" | "armed" | "revealing" | "won" | "lost";
type Tone = "neutral" | "mist" | "energy" | "danger" | "success";
interface Note {
  tone: Tone;
  text: string;
}
type BurstKey = "slot" | "reveal" | "token" | "enemy" | "win" | "pass";

const NOTE_STYLES: Record<Tone, { box: string; icon: IconName; iconClass: string }> = {
  neutral: { box: "border-white/[0.08] bg-white/[0.03]", icon: "info", iconClass: "text-ash-300" },
  mist: { box: "border-mist-400/30 bg-mist-500/[0.08]", icon: "eye-off", iconClass: "text-mist-300" },
  energy: { box: "border-energy-400/30 bg-energy-500/[0.07]", icon: "bolt", iconClass: "text-energy-300" },
  danger: { box: "border-blood-400/40 bg-blood-500/[0.09]", icon: "x", iconClass: "text-blood-400" },
  success: { box: "border-leaf-400/40 bg-leaf-500/[0.09]", icon: "trophy", iconClass: "text-leaf-300" },
};

const NO_BURSTS: Record<BurstKey, number> = { slot: 0, reveal: 0, token: 0, enemy: 0, win: 0, pass: 0 };

const firstName = (name: string) => name.split(" ")[0] ?? name;

function trackSteps(phase: Phase, path: PlayPath | null, heroCost: number): TrackStep[] {
  const base = [
    { id: "hide", title: "Hide", text: "Play the card face-down for 1 Chakra" },
    { id: "bluff", title: "Bluff", text: "Your opponent sees 0 Power and passes" },
    { id: "ambush", title: "Ambush", text: `Reveal it for its printed ${heroCost} Chakra` },
    { id: "score", title: "Score", text: "Win the mission in evaluation" },
  ];
  let statuses: StepStatus[];
  if (path === "faceup") {
    const bluff: StepStatus = phase === "opp-turn" ? "current" : phase === "lost" ? "done" : "todo";
    statuses = ["missed", bluff, "missed", phase === "lost" ? "missed" : "todo"];
  } else {
    const current =
      phase === "ready" || phase === "placing" ? 0 : phase === "opp-turn" ? 1 : phase === "armed" || phase === "revealing" ? 2 : 4;
    statuses = base.map((_, i) => (i < current ? "done" : i === current ? "current" : "todo"));
  }
  return base.map((s, i) => ({ ...s, status: statuses[i]! }));
}

/** Power readout and tug bar for the single mission. */
function ClashMeter({ you, opp }: { you: number; opp: number }) {
  const total = you + opp;
  const share = total === 0 ? 50 : (you / total) * 100;
  const spring = { type: "spring", stiffness: 140, damping: 20 } as const;
  return (
    <div className="mt-3" role="group" aria-label={`Power on this mission: you ${you}, opponent ${opp}`}>
      <div className="flex items-center gap-2.5">
        <span className="flex w-10 shrink-0 flex-col items-start">
          <span className="eyebrow !text-[9px] text-energy-300">You</span>
          <span className="text-2xl font-black leading-none tabular-nums text-white">
            <AnimatedNumber value={you} />
          </span>
        </span>
        <div className="relative h-3 min-w-0 flex-1 rounded-full bg-white/[0.05] ring-1 ring-white/10">
          <div className={cn("absolute inset-0 overflow-hidden rounded-full transition-opacity", total === 0 && "opacity-25")}>
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-energy-600 via-energy-400 to-energy-200"
              initial={false}
              animate={{ width: `${share}%` }}
              transition={spring}
            />
            <motion.div
              className="absolute inset-y-0 right-0 bg-gradient-to-l from-blood-600 via-blood-500 to-blood-400"
              initial={false}
              animate={{ width: `${100 - share}%` }}
              transition={spring}
            />
          </div>
          <motion.span
            aria-hidden="true"
            className="absolute -inset-y-1 w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.7)]"
            initial={false}
            animate={{ left: `${share}%` }}
            transition={spring}
          />
        </div>
        <span className="flex w-10 shrink-0 flex-col items-end">
          <span className="eyebrow !text-[9px] text-blood-400">Opp</span>
          <span className="text-2xl font-black leading-none tabular-nums text-white">
            <AnimatedNumber value={opp} />
          </span>
        </span>
      </div>
    </div>
  );
}

function PowerCaption({ hidden, power, tone }: { hidden: boolean; power: number; tone: "you" | "opp" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-bold",
        hidden
          ? "border-mist-400/40 bg-mist-500/15 text-mist-200"
          : tone === "you"
            ? "border-energy-400/30 bg-energy-500/10 text-energy-200"
            : "border-blood-400/30 bg-blood-500/10 text-blood-400",
      )}
    >
      {hidden && <Icon name="eye-off" size={11} />}
      {hidden ? `Hidden · ${power} Power` : `${power} Power`}
    </span>
  );
}

export default function HiddenCardSim({ onComplete, completed }: WidgetProps) {
  const reduce = useReducedMotion() ?? false;
  const uid = useId();
  const isWide = useMediaQuery("(min-width: 640px)");
  const cardSize: CardSize = isWide ? "md" : "sm";
  const { emit, layer } = useParticleFlight();
  const { schedule, clear } = useScheduler();
  const [boardScope, animateBoard] = useAnimate<HTMLDivElement>();
  const [poolScope, animatePool] = useAnimate<HTMLDivElement>();
  const poolRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  /** Bumped on reset so stray particle callbacks from an old run do nothing. */
  const gen = useRef(0);
  const phaseRef = useRef<Phase>("ready");

  const [scenarioId, setScenarioId] = useState<AmbushScenarioId>("kakashi");
  const scenario = scenarioById(scenarioId);
  const hero = cardOf(scenario.heroId);
  const enemy = cardOf(scenario.enemyId);
  const paths = useMemo(() => comparePaths(scenario), [scenario]);

  const [game, setGame] = useState<GameState>(() => initialState(scenario));
  const [board, setBoard] = useState<GameState>(game);
  const [chakra, setChakra] = useState(scenario.chakra);
  const [phase, setPhaseState] = useState<Phase>("ready");
  const [path, setPath] = useState<PlayPath | null>(null);
  const [note, setNote] = useState<Note>({ tone: "neutral", text: scenario.intro });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [flipHold, setFlipHold] = useState(false);
  const [titleOn, setTitleOn] = useState(false);
  const [outcome, setOutcome] = useState<MissionOutcome | null>(null);
  const [wonOnce, setWonOnce] = useState(false);
  const [bursts, setBursts] = useState(NO_BURSTS);

  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);
  const fire = useCallback((k: BurstKey) => setBursts((b) => ({ ...b, [k]: b[k] + 1 })), []);

  const mission = board.missions[0]!;
  const yourUnit = mission.units.find((u) => u.side === "you") ?? null;
  const enemyUnit = mission.units.find((u) => u.side === "opp") ?? null;
  const power = { you: sidePower(mission, "you", PRACTICE_CARDS), opp: sidePower(mission, "opp", PRACTICE_CARDS) };
  const heroInHand = board.hands.you.includes(hero.id);
  const armed = phase === "armed";
  const busy = phase === "placing" || phase === "opp-turn" || phase === "revealing";
  const showCompleted = completed || wonOnce;
  const bonusUnlocked = completed || wonOnce;
  const heroLayoutId = `${uid}-${scenario.id}-hero`;

  const reset = useCallback(
    (id: AmbushScenarioId = scenarioId) => {
      gen.current += 1;
      clear();
      const s: AmbushScenario = scenarioById(id);
      const st = initialState(s);
      setScenarioId(id);
      setGame(st);
      setBoard(st);
      setChakra(s.chakra);
      go("ready");
      setPath(null);
      setConfirmOpen(false);
      setFlipHold(false);
      setTitleOn(false);
      setOutcome(null);
      setNote({ tone: "neutral", text: s.intro });
    },
    [clear, go, scenarioId],
  );

  const fail = useCallback(
    (reason: string) => {
      setNote({ tone: "danger", text: reason });
      if (!reduce && poolScope.current) {
        void animatePool(poolScope.current, { x: [0, -9, 8, -6, 5, -2, 0] }, { duration: 0.45 });
      }
    },
    [animatePool, poolScope, reduce],
  );

  const shake = useCallback(() => {
    if (reduce || !boardScope.current) return;
    void animateBoard(
      boardScope.current,
      { x: [0, -11, 10, -7, 5, -2, 0], y: [0, 4, -3, 2, -1, 0, 0] },
      { duration: 0.5, ease: "easeOut" },
    );
  }, [animateBoard, boardScope, reduce]);

  /** You pass with nothing left to do, and the mission is scored by the engine. */
  const finishRound = useCallback(
    (state: GameState) => {
      const { state: end, outcome: o } = passAndScore(state);
      setGame(end);
      setBoard(end);
      setOutcome(o);
      const m = end.missions[0]!.def;
      if (o.winner === "you") {
        go("won");
        setWonOnce(true);
        fire("win");
        setNote({
          tone: "success",
          text: `**Mission secured, ${o.power.you}–${o.power.opp}.** With nothing left to play you [[pass]], and in [[Mission evaluation]] ${m.name} (${m.rank}-rank) pays ${m.basePoints} + ${RANK_BONUS[m.rank]} = **${o.points} Mission points**.`,
        });
        onComplete();
      } else {
        go("lost");
        setNote({
          tone: "danger",
          text: `**${enemy.name} holds the mission, ${o.power.opp}–${o.power.you}.** Played face-up, ${firstName(hero.name)} never springs his [[AMBUSH]]. Rewind and try the hidden line.`,
        });
      }
    },
    [enemy.name, fire, go, hero.name, onComplete],
  );

  /** The opponent's turn: they look at the board and pass. */
  const opponentPasses = useCallback(
    (state: GameState, hidden: boolean) => {
      go("opp-turn");
      setNote({ tone: "neutral", text: "Opponent's turn…" });
      schedule(
        () => {
          const next = opponentTurn(state);
          const m = next.missions[0]!;
          const oppPower = sidePower(m, "opp", PRACTICE_CARDS);
          const yourPower = sidePower(m, "you", PRACTICE_CARDS);
          setGame(next);
          setBoard(next);
          fire("pass");
          if (hidden) {
            go("armed");
            setNote({
              tone: "mist",
              text: `Your opponent sees **${oppPower} Power against ${yourPower}** and [[passes]], keeping the [[Edge token|Edge]]. Once they've passed, you take turn after turn until you pass. **Click your face-down card** to spring the trap.`,
            });
          } else {
            setNote({
              tone: "neutral",
              text: `Your opponent sees **${oppPower} Power against ${yourPower}** and [[passes]], keeping the [[Edge token|Edge]]. You have ${next.chakra.you} Chakra and nothing left to play…`,
            });
            schedule(() => finishRound(next), reduce ? 500 : 1900);
          }
        },
        reduce ? 600 : 1500,
      );
    },
    [finishRound, fire, go, reduce, schedule],
  );

  const play = useCallback(
    (hidden: boolean) => {
      if (phaseRef.current !== "ready") return;
      const missionId = game.missions[0]!.def.id;
      const action: GameAction = { type: "play", side: "you", cardId: hero.id, missionId, hidden };
      const result = applyAction(game, action, PRACTICE_CARDS);
      if (!result.ok) {
        fail(result.reason);
        return;
      }
      const g = gen.current;
      const cost = game.chakra.you - result.state.chakra.you;
      go("placing");
      setPath(hidden ? "hidden" : "faceup");
      setNote({
        tone: hidden ? "mist" : "energy",
        text: hidden
          ? `Paying **1 Chakra** to play ${firstName(hero.name)} face-down. Hidden plays cost 1, whatever the printed cost.`
          : `Paying the printed **${cost} Chakra** to play ${firstName(hero.name)} face-up.`,
      });
      emit(poolRef.current, slotRef.current, {
        count: cost,
        palette: "energy",
        size: 13,
        duration: 0.55,
        stagger: 0.09,
        onArrive: () => {
          if (gen.current === g) setChakra((c) => c - 1);
        },
        onDone: () => {
          if (gen.current !== g) return;
          setGame(result.state);
          setBoard(result.state);
          setChakra(result.state.chakra.you);
          fire("slot");
          if (hidden) {
            // Mount face-up for a beat so the card visibly flips face-down as it lands.
            setFlipHold(true);
            schedule(() => setFlipHold(false), 120);
          }
          setNote({ tone: hidden ? "mist" : "energy", text: hidden ? scenario.hiddenNote : scenario.faceUpNote });
          schedule(() => opponentPasses(result.state, hidden), reduce ? 700 : 2400);
        },
      });
    },
    [emit, fail, fire, game, go, hero, opponentPasses, reduce, scenario.faceUpNote, scenario.hiddenNote, schedule],
  );

  /** Step the board through the reveal's effect events, then sync to the engine. */
  const springAmbush = useCallback(
    (state: GameState, events: GameEvent[], unitId: string) => {
      setChakra(state.chakra.you);
      setBoard((b) => setHidden(b, unitId, false));
      fire("reveal");
      shake();
      setTitleOn(true);
      setNote({
        tone: "mist",
        text: `**AMBUSH!** ${firstName(hero.name)} flips face-up. A reveal resolves the card's [[MAIN]] and [[AMBUSH]] effects.`,
      });
      schedule(() => setTitleOn(false), reduce ? 900 : 1600);

      let t = reduce ? 400 : 1300;
      const step = reduce ? 150 : 520;
      let noted = false;
      for (const ev of events) {
        const announce = () => {
          if (noted) return;
          noted = true;
          setNote({ tone: "mist", text: scenario.effectNote });
        };
        if (ev.type === "powerup") {
          for (let k = 0; k < ev.amount; k++) {
            schedule(() => {
              announce();
              setBoard((b) => addTokens(b, ev.uid, 1));
              fire("token");
            }, t);
            t += step;
          }
        } else if (ev.type === "hid") {
          schedule(() => {
            announce();
            setBoard((b) => setHidden(b, ev.uid, true));
            fire("enemy");
          }, t);
          t += step * 1.4;
        } else if (ev.type === "defeated") {
          schedule(() => {
            announce();
            setBoard((b) => removeUnit(b, ev.uid));
            fire("enemy");
          }, t);
          t += step * 1.4;
        }
      }
      schedule(
        () => {
          setGame(state);
          setBoard(state);
          finishRound(state);
        },
        t + (reduce ? 300 : 1100),
      );
    },
    [finishRound, fire, hero.name, reduce, scenario.effectNote, schedule, shake],
  );

  const reveal = useCallback(() => {
    if (phaseRef.current !== "armed") return;
    setConfirmOpen(false);
    const unit = game.missions[0]!.units.find((u) => u.side === "you");
    if (!unit) return;
    const result = applyAction(game, { type: "reveal", side: "you", uid: unit.uid }, PRACTICE_CARDS);
    if (!result.ok) {
      fail(result.reason);
      return;
    }
    const g = gen.current;
    const cost = game.chakra.you - result.state.chakra.you;
    go("revealing");
    setNote({ tone: "mist", text: `Paying ${firstName(hero.name)}'s printed **${cost} Chakra** to reveal…` });
    emit(poolRef.current, slotRef.current, {
      count: cost,
      palette: "energy",
      size: 13,
      duration: 0.6,
      stagger: 0.12,
      onArrive: () => {
        if (gen.current === g) setChakra((c) => c - 1);
      },
      onDone: () => {
        if (gen.current === g) springAmbush(result.state, result.events, unit.uid);
      },
    });
  }, [emit, fail, game, go, hero.name, springAmbush]);

  const askReveal = useCallback(() => {
    if (phaseRef.current === "armed") setConfirmOpen(true);
  }, []);

  /** Close the reveal prompt and hand focus back to the face-down card. */
  const closeConfirm = useCallback(() => {
    setConfirmOpen(false);
    slotRef.current?.querySelector<HTMLElement>('[role="button"]')?.focus();
  }, []);

  /* Outside click/tap closes the reveal prompt; focus Reveal each time it opens. */
  const popRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!confirmOpen) return;
    const raf = requestAnimationFrame(() => popRef.current?.querySelector<HTMLElement>("[data-reveal]")?.focus());
    const onDown = (e: PointerEvent) => {
      if (!slotRef.current?.contains(e.target as Node)) setConfirmOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [confirmOpen]);

  /* The pressed control usually unmounts: move focus to the next primary control. */
  const rootRef = useRef<HTMLDivElement>(null);
  const seenPhase = useRef(phase);
  useEffect(() => {
    if (seenPhase.current === phase) return;
    seenPhase.current = phase;
    if (phase !== "ready" && phase !== "armed" && phase !== "won" && phase !== "lost") return;
    const t = window.setTimeout(() => {
      const a = document.activeElement;
      if (a && a !== document.body) return;
      const target =
        phase === "armed"
          ? slotRef.current?.querySelector<HTMLElement>('[role="button"]')
          : rootRef.current?.querySelector<HTMLElement>("[data-sim-primary]");
      target?.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(t);
  }, [phase]);

  const steps = trackSteps(phase, path, hero.cost);
  const noteStyle = NOTE_STYLES[note.tone];
  const turn =
    phase === "opp-turn"
      ? { label: "Opponent's turn", cls: "border-blood-400/40 bg-blood-500/10 text-blood-400" }
      : phase === "won" || phase === "lost"
        ? { label: "Mission evaluation", cls: "border-gold-400/40 bg-gold-400/10 text-gold-200" }
        : phase === "armed" || phase === "revealing"
          ? { label: "Your turn again", cls: "border-energy-400/40 bg-energy-500/10 text-energy-200" }
          : { label: "Your turn", cls: "border-energy-400/40 bg-energy-500/10 text-energy-200" };
  const oppStatus = board.passed.opp
    ? { label: "Passed", icon: "flag" as const }
    : phase === "opp-turn"
      ? { label: "Thinking", icon: null }
      : { label: `Opened with ${firstName(enemy.name)}`, icon: "hand" as const };
  const cardWidth = cardSize === "md" ? "w-[136px]" : "w-[92px]";
  const narration = (
    <div
      aria-live="polite"
      className={cn("mt-3 flex items-start gap-3 rounded-2xl border px-4 py-3 transition-colors duration-300", noteStyle.box)}
    >
      <span className={cn("mt-0.5 shrink-0", noteStyle.iconClass)}>
        <Icon name={noteStyle.icon} size={18} />
      </span>
      <motion.div
        key={note.text}
        initial={{ opacity: 0.2, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="min-w-0"
      >
        <RichText as="p" text={note.text} className="text-[14px] leading-relaxed text-ash-200" />
      </motion.div>
    </div>
  );

  return (
    <div ref={rootRef} className="panel relative overflow-x-clip p-3 sm:p-5">
      {layer}

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center">
          <div role="group" aria-label="Scenario" className="flex rounded-xl border border-white/[0.08] bg-black/25 p-1">
            {AMBUSH_SCENARIOS.map((s) => {
              const locked = s.id === "shikamaru" && !bonusUnlocked;
              const active = s.id === scenarioId;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  disabled={locked}
                  title={locked ? "Win the Kakashi round to unlock" : undefined}
                  onClick={() => !active && reset(s.id)}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition focus-visible:ring-2 focus-visible:ring-chakra-300 focus:outline-none sm:px-3",
                    active ? "text-white" : "text-ash-400 hover:text-white",
                    locked && "cursor-not-allowed opacity-50 hover:text-ash-400",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={`${uid}-tab`}
                      className="absolute inset-0 rounded-lg bg-gradient-to-b from-mist-500/40 to-mist-600/30 ring-1 ring-mist-400/40"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    {locked ? <Icon name="lock" size={12} /> : <Emblem name={cardOf(s.heroId).emblem} size={13} />}
                    {s.label}
                    {s.id === "shikamaru" && (
                      <span className="rounded bg-gold-400/20 px-1 text-[9px] font-black uppercase tracking-wider text-gold-200">
                        Bonus
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showCompleted && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-leaf-400/30 bg-leaf-500/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-leaf-300">
              <Icon name="check" size={12} strokeWidth={3} />
              Completed
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => reset()} aria-label="Reset the simulator">
            <Icon name="refresh" size={14} />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {/* Board */}
          <div ref={boardScope} className="relative rounded-3xl border border-white/[0.07] bg-shadow-900/70 p-3 sm:p-5">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-blood-500/[0.07] to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-energy-500/[0.07] to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(139,92,246,0.13),transparent_62%)]" />
              <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:28px_28px]" />
              <span className="absolute -right-10 top-1/2 -translate-y-1/2 text-white/[0.025]">
                <Emblem name="spiral" size={260} />
              </span>
            </div>
            <AmbushTitle show={titleOn} subtitle={`${hero.name} · ${scenario.effectLabel}`} />

            {/* Opponent strip */}
            <div className="relative flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blood-500/15 text-blood-400 ring-1 ring-blood-400/40">
                  <Emblem name="mask" size={20} />
                </span>
                <div>
                  <p className="eyebrow !text-[10px] text-blood-400">Opponent</p>
                  <p className="text-[12px] text-ash-400">
                    {board.chakra.opp} Chakra · {board.hands.opp.length} cards in hand
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={oppStatus.label}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ type: "spring", stiffness: 500, damping: 26 }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
                        board.passed.opp
                          ? "border-blood-400/50 bg-blood-500/15 text-blood-400"
                          : "border-white/10 bg-white/[0.04] text-ash-300",
                      )}
                    >
                      {oppStatus.icon && <Icon name={oppStatus.icon} size={12} />}
                      {oppStatus.label}
                      {oppStatus.icon === null && (
                        <span className="flex gap-0.5" aria-hidden="true">
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              className="h-1 w-1 rounded-full bg-current"
                              animate={reduce ? undefined : { opacity: [0.2, 1, 0.2] }}
                              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                            />
                          ))}
                        </span>
                      )}
                    </motion.span>
                  </AnimatePresence>
                  <ParticleBurst fire={bursts.pass} palette="blood" count={14} spread={48} ring={false} />
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-gold-400/10 py-0.5 pl-0.5 pr-2.5"
                  title="The Edge holder took the first turn and wins tied missions"
                >
                  <EdgeToken size={24} spin={!reduce} />
                  <span className="text-[11px] font-black text-gold-200">Edge</span>
                </span>
              </div>
            </div>

            {/* Arena */}
            <div className="relative mt-4 grid grid-cols-2 items-start gap-x-3 gap-y-4 sm:mt-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-x-5">
              {/* Your side */}
              <div className="order-1 flex flex-col items-center gap-2">
                <p className="eyebrow !text-[10px] text-energy-300">Your side</p>
                <div ref={slotRef} className="relative">
                  {yourUnit ? (
                    <motion.div
                      className="relative"
                      animate={armed && !reduce ? { scale: [1, 1.045, 1] } : { scale: 1 }}
                      transition={armed && !reduce ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                    >
                      {armed && (
                        <span aria-hidden="true" className="absolute -inset-3 animate-pulse-glow rounded-3xl bg-mist-500/50" />
                      )}
                      <GameCard
                        card={hero}
                        size={cardSize}
                        layoutId={heroLayoutId}
                        faceDown={yourUnit.hidden && !flipHold}
                        power={unitPower(yourUnit, mission, PRACTICE_CARDS)}
                        powerTokens={yourUnit.powerTokens}
                        highlight={armed ? "mist" : phase === "won" ? "leaf" : undefined}
                        onClick={armed ? askReveal : undefined}
                        label={
                          yourUnit.hidden
                            ? `Your hidden ${hero.name}. ${armed ? `Reveal for ${hero.cost} Chakra.` : "0 Power."}`
                            : undefined
                        }
                      />
                      {bursts.token > 0 && !reduce && (
                        <motion.span
                          key={bursts.token}
                          aria-hidden="true"
                          className="pointer-events-none absolute -bottom-2 -right-2 z-20 h-6 w-6 rounded-full bg-gradient-to-br from-gold-200 to-gold-500 ring-2 ring-shadow-950 shadow-[0_0_16px_rgba(245,197,66,0.9)]"
                          initial={{ y: -150, x: -40, opacity: 0, scale: 1.5, rotate: -90 }}
                          animate={{ y: 0, x: 0, opacity: [0, 1, 1, 0], scale: 1, rotate: 0 }}
                          transition={{ duration: 0.42, ease: [0.5, 0, 0.9, 0.6] }}
                        />
                      )}
                      <span className="absolute -bottom-2 -right-2 h-6 w-6">
                        <ParticleBurst fire={bursts.token} palette="gold" shape="star" count={14} spread={64} ring={false} />
                      </span>
                    </motion.div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => play(true)}
                      disabled={phase !== "ready"}
                      aria-label={`Play ${hero.name} hidden on ${mission.def.name} for 1 Chakra`}
                      className={cn(
                        "group relative flex aspect-[5/7] flex-col items-center justify-center gap-1 rounded-[11px] border-2 border-dashed px-1 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mist-300",
                        cardWidth,
                        phase === "ready"
                          ? "cursor-pointer border-mist-400/60 bg-mist-500/10 text-mist-200 hover:border-mist-300 hover:bg-mist-500/20"
                          : "border-white/10 bg-white/[0.02] text-ash-500",
                      )}
                    >
                      {phase === "ready" && !reduce && (
                        <span aria-hidden="true" className="absolute inset-0 animate-pulse rounded-[9px] bg-mist-500/10" />
                      )}
                      <Icon name="eye-off" size={cardSize === "md" ? 24 : 18} className="relative" />
                      <span className="relative text-[10px] font-black uppercase leading-tight tracking-wider">Play hidden</span>
                      <span className="relative text-[10px] font-semibold text-mist-300">1 Chakra</span>
                    </button>
                  )}
                  <ParticleBurst fire={bursts.slot} palette="mist" shape="mixed" count={26} spread={95} />
                  <ParticleBurst fire={bursts.reveal} palette="mist" shape="mixed" count={44} spread={175} duration={1.1} />

                  <AnimatePresence>
                    {confirmOpen && (
                      <motion.div
                        ref={popRef}
                        role="dialog"
                        aria-labelledby={`${uid}-confirm`}
                        initial={{ opacity: 0, y: -6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") closeConfirm();
                        }}
                        className="absolute left-0 top-full z-40 mt-3 w-56 rounded-2xl border border-mist-400/40 bg-shadow-900/95 p-3 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.85),0_0_30px_-8px_rgba(139,92,246,0.6)] backdrop-blur"
                      >
                        <p id={`${uid}-confirm`} className="text-sm font-bold text-white">
                          Reveal {firstName(hero.name)} for {hero.cost} Chakra?
                        </p>
                        <p className="mt-1 text-[12px] leading-snug text-ash-400">
                          You have {chakra}. Revealing pays the printed cost and fires MAIN and AMBUSH effects.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button variant="mist" size="sm" onClick={reveal} data-reveal>
                            <Icon name="eye" size={14} />
                            Reveal · {hero.cost}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={closeConfirm}>
                            Not yet
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {yourUnit ? (
                  armed ? (
                    <span className="inline-flex animate-pulse items-center gap-1 whitespace-nowrap rounded-full bg-mist-500 px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wider text-white shadow-[0_0_14px_rgba(139,92,246,0.7)]">
                      <Icon name="hand" size={11} />
                      Tap to reveal
                    </span>
                  ) : (
                    <PowerCaption hidden={yourUnit.hidden} power={unitPower(yourUnit, mission, PRACTICE_CARDS)} tone="you" />
                  )
                ) : (
                  <span className="text-[10.5px] font-semibold text-ash-500">Empty</span>
                )}
              </div>

              {/* Mission + clash */}
              <div className="relative order-3 col-span-2 mx-auto w-full max-w-sm sm:order-2 sm:col-span-1">
                <div className="mb-2.5 flex flex-wrap items-center justify-center gap-2">
                  <span className="eyebrow !text-[10px] text-ash-500">Round 1</span>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={turn.label}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wider",
                        turn.cls,
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                      {turn.label}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <MissionCard mission={mission.def} highlight={phase === "won"} />
                <ClashMeter you={power.you} opp={power.opp} />
                <ParticleBurst fire={bursts.win} palette="leaf" shape="mixed" count={36} spread={150} />
                <AnimatePresence>
                  {(phase === "won" || phase === "lost") && outcome && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 20 }}
                      className={cn(
                        "mt-3 flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-center text-[13px] font-black uppercase tracking-wider",
                        phase === "won"
                          ? "border-leaf-400/50 bg-leaf-500/15 text-leaf-300 shadow-[0_0_30px_-8px_rgba(74,222,128,0.7)]"
                          : "border-blood-400/50 bg-blood-500/15 text-blood-400",
                      )}
                    >
                      <Icon name={phase === "won" ? "trophy" : "x"} size={16} strokeWidth={2.4} />
                      {phase === "won" ? `Mission secured · +${outcome.points} pts` : "Mission lost"}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Opponent side */}
              <div className="order-2 flex flex-col items-center gap-2 sm:order-3">
                <p className="eyebrow !text-[10px] text-blood-400">Their side</p>
                <div className="relative">
                  {enemyUnit ? (
                    <GameCard
                      card={enemy}
                      size={cardSize}
                      faceDown={enemyUnit.hidden}
                      power={unitPower(enemyUnit, mission, PRACTICE_CARDS)}
                      powerTokens={enemyUnit.powerTokens}
                      dimmed={phase === "won"}
                      highlight={enemyUnit.hidden ? "mist" : undefined}
                      label={enemyUnit.hidden ? `${enemy.name}, now hidden: 0 Power` : undefined}
                    />
                  ) : (
                    <div className={cn("aspect-[5/7] rounded-[11px] border-2 border-dashed border-white/10", cardWidth)} />
                  )}
                  <ParticleBurst fire={bursts.enemy} palette="mist" shape="mixed" count={30} spread={110} />
                </div>
                {enemyUnit ? (
                  <PowerCaption hidden={enemyUnit.hidden} power={unitPower(enemyUnit, mission, PRACTICE_CARDS)} tone="opp" />
                ) : (
                  <span className="text-[10.5px] font-semibold text-ash-500">Defeated</span>
                )}
              </div>
            </div>

            <div className="sm:hidden">{narration}</div>

            {/* Your tray */}
            <div className="relative mt-5 flex flex-col gap-4 rounded-2xl border border-energy-400/15 bg-energy-900/20 p-3 md:flex-row md:items-center md:gap-5 md:p-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1.5">
                  <p className="eyebrow !text-[10px] text-energy-300">You</p>
                  <div ref={poolScope}>
                    <ChakraPool ref={poolRef} value={chakra} max={scenario.chakra} size={isWide ? "md" : "sm"} />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <p className="eyebrow !text-[10px] text-ash-500">Hand</p>
                  {heroInHand ? (
                    <GameCard
                      card={hero}
                      size="sm"
                      layoutId={heroLayoutId}
                      highlight={phase === "ready" ? "mist" : undefined}
                    />
                  ) : (
                    <div className="flex aspect-[5/7] w-[92px] items-center justify-center rounded-[11px] border border-dashed border-white/10 text-center text-[10px] font-semibold text-ash-500">
                      Hand empty
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {phase === "ready" && (
                  <>
                    <Button
                      variant="mist"
                      onClick={() => play(true)}
                      className="w-full md:w-auto md:self-start"
                      data-sim-primary
                    >
                      <Icon name="eye-off" size={16} />
                      Play hidden · 1 Chakra
                    </Button>
                    <Button variant="secondary" onClick={() => play(false)} className="w-full md:w-auto md:self-start">
                      <Icon name="hand" size={16} />
                      Play face-up · {hero.cost} Chakra
                    </Button>
                    <p className="text-[12px] text-ash-500">Or click the empty slot on your side of the mission.</p>
                  </>
                )}
                {armed && (
                  <>
                    <Button variant="mist" onClick={reveal} className="w-full md:w-auto md:self-start">
                      <Icon name="eye" size={16} />
                      Reveal {firstName(hero.name)} · {hero.cost} Chakra
                    </Button>
                    <p className="text-[12px] text-ash-500">Or click the face-down card. You have {chakra} Chakra.</p>
                  </>
                )}
                {busy && (
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-ash-400">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-mist-300" aria-hidden="true" />
                    {phase === "opp-turn" ? "Opponent is deciding…" : phase === "revealing" ? "Ambush resolving…" : "Paying Chakra…"}
                  </p>
                )}
                {phase === "won" && (
                  <div className="flex flex-wrap gap-2">
                    {scenario.id === "kakashi" ? (
                      <Button variant="gold" onClick={() => reset("shikamaru")} data-sim-primary>
                        <Icon name="sparkles" size={16} />
                        Bonus: Shikamaru
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={() => reset("kakashi")} data-sim-primary>
                        <Icon name="arrow-left" size={16} />
                        Back to Kakashi
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => reset()}>
                      <Icon name="refresh" size={16} />
                      Replay
                    </Button>
                  </div>
                )}
                {phase === "lost" && (
                  <Button variant="primary" onClick={() => reset()} className="w-full md:w-auto md:self-start" data-sim-primary>
                    <Icon name="undo" size={16} />
                    Rewind and play hidden
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Narration (phones render it under the arena instead, so it stays beside the board) */}
          <div className="hidden sm:block">{narration}</div>
        </div>

        {/* Side panel */}
        <aside className="grid gap-5 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 md:grid-cols-2 lg:flex lg:flex-col">
          <div>
            <p className="eyebrow text-mist-300">The ambush line</p>
            <div className="mt-3">
              <StepTrack steps={steps} />
            </div>
          </div>
          <div className="space-y-4">
            <PathCompare
              hero={hero}
              faceUp={paths.faceUp}
              ambush={paths.ambush}
              faceUpWhy={scenario.faceUpWhy}
              ambushWhy={scenario.ambushWhy}
              taken={path}
            />
            <div className="rounded-2xl border border-mist-400/20 bg-mist-500/[0.06] p-3 text-[12.5px] leading-relaxed text-ash-300">
              <p className="mb-1 flex items-center gap-1.5 font-bold text-mist-200">
                <Icon name="lightbulb" size={14} />
                Rule check
              </p>
              <RichText
                text="Hidden: pay **1**, **0 Power**, no effects. Reveal: pay the **printed cost**, then [[MAIN]] and [[AMBUSH]] fire. From your hand, AMBUSH never fires."
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
