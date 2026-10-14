"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { EdgeToken } from "@/components/game/edge-token";
import { GameCard } from "@/components/game/game-card";
import { RankBadge } from "@/components/game/mission-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";
import { Icon, type IconName } from "@/components/ui/icon";
import { RichText } from "@/components/ui/rich-text";
import type { PracticeMissionId } from "@/lib/game/cards";
import { cn } from "@/lib/cn";
import { RANK_ORDER, otherSide, type Side } from "@/lib/game/types";
import { useMediaQuery } from "../edge-duel/use-media";
import { cardOf, HAND_SIZE, MISSION_IDS, shuffled } from "./data";
import { FlipCoin, MissionTile, OWNER_STYLE } from "./ritual-pieces";

type StepId = "lead" | "missions" | "draw" | "mulligan";

const STEPS: ReadonlyArray<{ id: StepId; title: string; icon: IconName }> = [
  { id: "lead", title: "Decide who leads", icon: "rotate" },
  { id: "missions", title: "Build the Mission deck", icon: "layers" },
  { id: "draw", title: "Draw 5", icon: "hand" },
  { id: "mulligan", title: "Mulligan?", icon: "refresh" },
];

const EDGE_ID = "deck-forge-edge";
const tileId = (owner: Side, id: PracticeMissionId) => `deck-forge-mission-${owner}-${id}`;

type CoinPhase = "idle" | "flipping" | "landed" | "seated";
type MissionPhase = "idle" | "shuffling" | "picked" | "dealing" | "deck";
type MulliganPhase = "waiting" | "rival-first" | "choose" | "redrawing" | "rival-after" | "done";

/* ------------------------------------------------------------------ */
/* Table pieces                                                        */
/* ------------------------------------------------------------------ */

function SeatRow({
  side,
  holdsEdge,
  order,
  missionPhase,
  dealtIds,
  children,
}: {
  side: Side;
  holdsEdge: boolean;
  order: PracticeMissionId[];
  missionPhase: MissionPhase;
  dealtIds: ReadonlySet<string>;
  children?: ReactNode;
}) {
  const o = OWNER_STYLE[side];
  const split = missionPhase === "picked" || missionPhase === "dealing" || missionPhase === "deck";
  const chosen = split ? order.slice(0, 2) : order;
  const unused = split ? order[2] : undefined;
  const faceDown = side === "opp" || missionPhase !== "idle";
  return (
    <div
      className={cn(
        "relative rounded-2xl border px-3 py-3 transition-[border-color,box-shadow,background-color] duration-500",
        holdsEdge
          ? "border-gold-400/45 bg-gold-400/[0.05] shadow-[0_0_32px_-10px_rgba(245,197,66,0.6)]"
          : "border-white/[0.07] bg-black/20",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-shadow-950",
            o.solid,
          )}
          aria-hidden="true"
        >
          <Emblem name={o.emblem} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("eyebrow !text-[10px]", o.text)}>{side === "you" ? "You" : "Rival"}</p>
          <p className="truncate text-[13px] font-black text-white">
            {side === "you" ? "Kage of the Leaf" : "Rival Kage"}
          </p>
        </div>
        <div className="relative z-20 flex h-11 w-11 shrink-0 items-center justify-center">
          {holdsEdge ? (
            <EdgeToken size={40} layoutId={EDGE_ID} />
          ) : (
            <span
              className="h-10 w-10 rounded-full border border-dashed border-white/15"
              role="img"
              aria-label="No Edge token"
            />
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="sr-only">{side === "you" ? "Your" : "Rival's"} Missions:</span>
        {chosen.map((id) =>
          dealtIds.has(tileId(side, id)) ? (
            <span
              key={id}
              className="h-[52px] w-[72px] shrink-0 rounded-lg border border-dashed border-white/10 sm:h-[60px] sm:w-[96px]"
              aria-hidden="true"
            />
          ) : (
            <MissionTile key={id} id={id} owner={side} faceDown={faceDown} layoutId={tileId(side, id)} glow={split} />
          ),
        )}
        {unused && (
          <div className="ml-auto flex items-center gap-2 border-l border-white/10 pl-2">
            <MissionTile id={unused} owner={side} faceDown layoutId={tileId(side, unused)} aside />
            <span className="max-w-[64px] text-[10px] font-semibold leading-tight text-ash-500">
              Unused, stays face-down
            </span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function MissionDeck({
  slots,
  dealt,
  edge,
}: {
  slots: Array<{ owner: Side; id: PracticeMissionId }>;
  dealt: number;
  edge: Side | null;
}) {
  return (
    <div className="rounded-2xl border border-gold-400/20 bg-gradient-to-b from-gold-400/[0.06] to-transparent p-3">
      <p className="eyebrow flex items-center gap-1.5 !text-[10px] text-gold-300">
        <Icon name="layers" size={12} />
        Mission deck · top to bottom
      </p>
      <ol className="mt-2 space-y-1.5">
        {[0, 1, 2, 3].map((i) => {
          const slot = slots[i];
          const rank = RANK_ORDER[i]!;
          const filled = Boolean(slot) && dealt > i;
          const owner: Side | null = edge ? (i % 2 === 0 ? edge : otherSide(edge)) : null;
          return (
            <li
              key={i}
              className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-black/25 px-2 py-1.5"
            >
              <span className="w-7 shrink-0 text-center text-[13px] font-black tabular-nums text-ash-300">
                #{i + 1}
              </span>
              <div className="relative h-[52px] w-[72px] shrink-0 sm:h-[60px] sm:w-[96px]">
                {filled && slot ? (
                  <MissionTile id={slot.id} owner={slot.owner} faceDown layoutId={tileId(slot.owner, slot.id)} />
                ) : (
                  <span
                    className="block h-full w-full rounded-lg border border-dashed border-white/10"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-[12px] font-bold", owner ? OWNER_STYLE[owner].text : "text-ash-500")}>
                  {owner
                    ? `${owner === "you" ? "Your" : "Rival's"} Mission${owner === edge ? " (Edge)" : ""}`
                    : "Waiting…"}
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-ash-400">
                  <RankBadge rank={rank} size={16} />
                  Round {i + 1} reveals it as {rank}-rank
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function DeckPile({ count }: { count: number }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div className="relative h-[64px] w-[46px]" aria-hidden="true">
        {[2, 1, 0].map((i) => (
          <span
            key={i}
            className="absolute inset-0 rounded-md border border-mist-400/40 bg-gradient-to-br from-mist-600 via-shadow-800 to-shadow-900 shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
            style={{ transform: `translate(${i * 2}px, ${-i * 2}px)` }}
          >
            {i === 0 && (
              <span className="flex h-full w-full items-center justify-center text-mist-300">
                <Emblem name="spiral" size={20} />
              </span>
            )}
          </span>
        ))}
      </div>
      <span className="text-[11px] font-bold text-ash-400">
        Deck <AnimatedNumber value={count} className="tabular-nums text-white" />
      </span>
    </div>
  );
}

function HandFan({ hand, drawSeq, compact }: { hand: string[]; drawSeq: number; compact: boolean }) {
  const mid = (hand.length - 1) / 2;
  return (
    <div
      className={cn(
        "flex min-h-[110px] min-w-0 flex-1 items-end justify-center sm:min-h-[150px]",
        compact ? "pl-9" : "pl-12 md:pl-6",
      )}
      aria-label={`Your hand: ${hand.map((id) => cardOf(id).name).join(", ") || "empty"}`}
      role="group"
    >
      <AnimatePresence>
        {hand.map((id, i) => {
          const offset = i - mid;
          return (
            <motion.div
              key={`${drawSeq}-${i}`}
              initial={{ opacity: 0, x: -140, y: -10, rotate: -30, scale: 0.6 }}
              animate={{ opacity: 1, x: 0, y: Math.abs(offset) * 5, rotate: offset * 6, scale: 1 }}
              exit={{
                opacity: 0,
                x: -140,
                y: -10,
                rotate: -30,
                scale: 0.6,
                transition: { duration: 0.35, delay: i * 0.04 },
              }}
              transition={{ type: "spring", stiffness: 220, damping: 22, delay: i * 0.12 }}
              className={cn("relative origin-bottom", compact ? "-ml-9" : "-ml-12 md:-ml-6")}
              style={{ zIndex: i }}
            >
              <GameCard card={cardOf(id)} size={compact ? "xs" : "sm"} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ritual                                                              */
/* ------------------------------------------------------------------ */

/**
 * Part B: the setup before Round 1. Toss the Edge token, seed the Mission deck,
 * draw five and decide on a mulligan (once, Edge player first).
 */
export function SetupRitual({
  deck,
  missions,
  sample,
  onDone,
  onReplay,
}: {
  deck: readonly string[];
  missions: readonly PracticeMissionId[];
  sample: boolean;
  onDone: () => void;
  onReplay: () => void;
}) {
  const reduce = useReducedMotion();
  const compact = useMediaQuery("(max-width: 479px)");
  const timers = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const [step, setStep] = useState(0);
  const [edge, setEdge] = useState<Side | null>(null);
  const [coinPhase, setCoinPhase] = useState<CoinPhase>("idle");
  const [turns, setTurns] = useState(0);

  const [missionPhase, setMissionPhase] = useState<MissionPhase>("idle");
  const [yourOrder, setYourOrder] = useState<PracticeMissionId[]>(() => [...missions]);
  const [rivalOrder, setRivalOrder] = useState<PracticeMissionId[]>(() =>
    MISSION_IDS.filter((id) => !missions.includes(id)).slice(0, 3),
  );
  const [dealt, setDealt] = useState(0);

  const [hand, setHand] = useState<string[]>([]);
  const [drawSeq, setDrawSeq] = useState(0);
  const [drawn, setDrawn] = useState(false);
  const [mulligan, setMulligan] = useState<MulliganPhase>("waiting");
  const [mulliganUsed, setMulliganUsed] = useState(false);
  const [burst, setBurst] = useState(0);
  const [doneFired, setDoneFired] = useState(false);

  const ready = mulligan === "done";

  /* 1. Toss ---------------------------------------------------------- */
  const flip = () => {
    if (coinPhase !== "idle") return;
    const result: Side = Math.random() < 0.5 ? "you" : "opp";
    setEdge(result);
    setTurns(360 * 5 + (result === "opp" ? 180 : 0));
    setCoinPhase("flipping");
    later(() => setCoinPhase("landed"), reduce ? 60 : 1450);
    later(() => setCoinPhase("seated"), reduce ? 120 : 2300);
  };

  /* 2. Mission deck ------------------------------------------------- */
  const shuffleMissions = () => {
    if (missionPhase !== "idle") return;
    const finalYou = shuffled(yourOrder);
    const finalRival = shuffled(rivalOrder);
    setMissionPhase("shuffling");
    // A few visible reshuffles before the final order lands (all rolled here, in the handler).
    const beats = reduce ? [] : Array.from({ length: 4 }, () => [shuffled(yourOrder), shuffled(rivalOrder)] as const);
    beats.forEach(([you, rival], i) => {
      later(
        () => {
          setYourOrder(you);
          setRivalOrder(rival);
        },
        450 + i * 280,
      );
    });
    later(
      () => {
        setYourOrder(finalYou);
        setRivalOrder(finalRival);
        setMissionPhase("picked");
      },
      450 + beats.length * 280,
    );
  };

  const slots: Array<{ owner: Side; id: PracticeMissionId }> = [];
  if (edge && missionPhase !== "idle" && missionPhase !== "shuffling") {
    const order = (s: Side) => (s === "you" ? yourOrder : rivalOrder);
    const first = edge;
    const second = otherSide(edge);
    slots.push(
      { owner: first, id: order(first)[0]! },
      { owner: second, id: order(second)[0]! },
      { owner: first, id: order(first)[1]! },
      { owner: second, id: order(second)[1]! },
    );
  }
  const dealtIds = new Set(slots.slice(0, dealt).map((s) => tileId(s.owner, s.id)));

  const stackDeck = () => {
    if (missionPhase !== "picked") return;
    setMissionPhase("dealing");
    const gap = reduce ? 0 : 420;
    for (let i = 1; i <= 4; i++) later(() => setDealt(i), gap * i);
    later(() => setMissionPhase("deck"), gap * 4 + 250);
  };

  /* 3. Draw ---------------------------------------------------------- */
  const drawFive = () => {
    if (drawn || hand.length > 0) return;
    setHand(shuffled(deck).slice(0, HAND_SIZE));
    setDrawSeq((s) => s + 1);
    later(() => setDrawn(true), reduce ? 50 : 900);
  };

  /* 4. Mulligan ------------------------------------------------------ */
  useEffect(() => {
    if (step !== 3 || mulligan !== "waiting" || !edge) return;
    if (edge === "opp") {
      setMulligan("rival-first");
      later(() => setMulligan("choose"), reduce ? 200 : 1300);
    } else {
      setMulligan("choose");
    }
  }, [step, mulligan, edge, later, reduce]);

  const doMulligan = () => {
    if (mulligan !== "choose" || mulliganUsed) return;
    setMulliganUsed(true);
    setMulligan("redrawing");
    setHand([]);
    later(
      () => {
        setHand(shuffled(deck).slice(0, HAND_SIZE));
        setDrawSeq((s) => s + 1);
      },
      reduce ? 50 : 650,
    );
    later(() => setMulligan("choose"), reduce ? 120 : 1500);
  };

  const keepHand = () => {
    if (mulligan !== "choose") return;
    if (edge === "you") {
      setMulligan("rival-after");
      later(() => setMulligan("done"), reduce ? 200 : 1300);
    } else {
      setMulligan("done");
    }
  };

  useEffect(() => {
    if (!ready || doneFired) return;
    setDoneFired(true);
    setBurst((b) => b + 1);
    onDone();
  }, [ready, doneFired, onDone]);

  /* Step completion ------------------------------------------------- */
  const stepDone = [coinPhase === "seated", missionPhase === "deck", drawn, ready];
  const canContinue = step < 3 && stepDone[step];
  const edgeName = edge === "you" ? "You" : "Your rival";

  const stepBody: Record<StepId, ReactNode> = {
    lead: (
      <>
        <RichText
          as="p"
          text="Mythos has no Leader card: **you** are the [[Kage]]. Who leads Round 1 is pure chance, so toss the [[Edge token]]. Whoever it lands on takes it."
        />
        <AnimatePresence initial={false}>
          {edge && coinPhase !== "idle" && coinPhase !== "flipping" && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-xl border border-gold-400/30 bg-gold-400/[0.08] px-3 py-2 text-[13px] text-ash-200"
            >
              <span className="font-black text-gold-200">
                {edgeName} {edge === "you" ? "take" : "takes"} the Edge.
              </span>{" "}
              {edge === "you"
                ? "You take the first turn of Round 1, and you win tied missions unless your rival passes first and takes the Edge from you."
                : "They take the first turn of Round 1, and they win tied missions unless you pass first and take the Edge from them."}
            </motion.p>
          )}
        </AnimatePresence>
      </>
    ),
    missions: (
      <>
        <RichText
          as="p"
          text="Each player shuffles their 3 Missions face-down and keeps **2 at random**. The third is set aside face-down for the whole game. The four chosen cards are stacked into one Mission deck, alternating owners so the Edge player's sit **1st and 3rd** from the top."
        />
        {missionPhase === "deck" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <RichText
              as="p"
              text="One Mission is revealed each Round. Its [[rank]] comes from the Round it arrives in: D, then C, B and A."
              className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px]"
            />
          </motion.div>
        )}
      </>
    ),
    draw: <RichText as="p" text="Both players shuffle their personal deck and draw **5 cards**." />,
    mulligan: (
      <>
        <RichText
          as="p"
          text="Each player may [[mulligan]] **once**: shuffle the whole hand back and draw 5 new cards. The Edge player decides first."
        />
        <AnimatePresence mode="wait" initial={false}>
          {(mulligan === "rival-first" || mulligan === "rival-after") && (
            <motion.p
              key={mulligan}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2 rounded-xl border border-blood-400/25 bg-blood-500/[0.07] px-3 py-2 text-[13px]"
            >
              <Icon name="clock" size={14} className="shrink-0 text-blood-400" />
              {mulligan === "rival-first"
                ? "Your rival holds the Edge, so they decide first… they keep their hand."
                : "Now your rival decides… they keep their hand."}
            </motion.p>
          )}
        </AnimatePresence>
      </>
    ),
  };

  const current = STEPS[Math.min(step, 3)]!;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      {/* Step rail + instructions */}
      <div className="min-w-0 space-y-4">
        <ol className="flex items-center gap-1.5" aria-label="Setup steps">
          {STEPS.map((s, i) => {
            const done = stepDone[i];
            const isCurrent = i === step && !ready;
            return (
              <li key={s.id} className="flex flex-1 items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-black transition-colors",
                    done
                      ? "bg-gradient-to-br from-leaf-300 to-leaf-600 text-shadow-950"
                      : isCurrent
                        ? "bg-gradient-to-br from-gold-200 to-gold-500 text-shadow-950 shadow-[0_0_14px_rgba(245,197,66,0.6)]"
                        : "border border-white/15 text-ash-500",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span aria-hidden="true">{done ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
                  <span className="sr-only">{`Step ${i + 1}: ${s.title}${done ? ", done" : ""}`}</span>
                </span>
                {i < STEPS.length - 1 && (
                  <span className={cn("h-[2px] flex-1 rounded-full", done ? "bg-leaf-400/60" : "bg-white/10")} />
                )}
              </li>
            );
          })}
        </ol>

        <AnimatePresence mode="wait" initial={false}>
          {ready ? (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="relative rounded-2xl border border-leaf-400/35 bg-gradient-to-b from-leaf-500/[0.12] to-transparent p-4"
              role="status"
            >
              <ParticleBurst fire={burst} palette="leaf" shape="mixed" count={30} spread={140} />
              <p className="eyebrow flex items-center gap-1.5 text-leaf-300">
                <Icon name="check" size={13} strokeWidth={3} />
                Ready for Round 1
              </p>
              <ul className="mt-3 space-y-2 text-[13px] text-ash-200">
                <li className="flex gap-2">
                  <Emblem name="edge" size={16} className="mt-0.5 shrink-0 text-gold-300" />
                  <span>
                    <span className="font-bold text-white">{edgeName}</span> {edge === "you" ? "hold" : "holds"} the
                    Edge and {edge === "you" ? "take" : "takes"} the first turn.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Icon name="layers" size={16} className="mt-0.5 shrink-0 text-gold-300" />
                  <span>4 Missions wait face-down. #1 becomes Round 1&apos;s D-rank mission.</span>
                </li>
                <li className="flex gap-2">
                  <Icon name="hand" size={16} className="mt-0.5 shrink-0 text-gold-300" />
                  <span>
                    Your opening hand: 5 cards{mulliganUsed ? " (after your one mulligan)" : ""}. Round 1&apos;s Start
                    phase adds 5 Chakra and 2 more cards.
                  </span>
                </li>
              </ul>
              <Button variant="secondary" size="sm" className="mt-4" onClick={onReplay}>
                <Icon name="refresh" size={14} />
                Replay the ritual
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-white/[0.08] bg-black/25 p-4"
            >
              <p className="eyebrow flex items-center gap-1.5 text-gold-300">
                <Icon name={current.icon} size={13} />
                Step {step + 1} of 4
              </p>
              <h4 className="mt-1.5 text-lg font-black text-white">{current.title}</h4>
              <div className="mt-2 text-[13.5px] leading-relaxed text-ash-300">{stepBody[current.id]}</div>

              <div className="mt-4 flex flex-wrap gap-2">
                {step === 0 && coinPhase === "idle" && (
                  <Button variant="gold" onClick={flip}>
                    <Emblem name="edge" size={16} />
                    Toss the Edge token
                  </Button>
                )}
                {step === 1 && (missionPhase === "idle" || missionPhase === "shuffling") && (
                  <Button variant="gold" onClick={shuffleMissions} disabled={missionPhase !== "idle"}>
                    <Icon name="refresh" size={15} />
                    {missionPhase === "shuffling" ? "Shuffling…" : "Shuffle & keep 2"}
                  </Button>
                )}
                {step === 1 && (missionPhase === "picked" || missionPhase === "dealing") && (
                  <Button variant="gold" onClick={stackDeck} disabled={missionPhase !== "picked"}>
                    <Icon name="layers" size={15} />
                    {missionPhase === "dealing" ? "Stacking…" : "Stack the Mission deck"}
                  </Button>
                )}
                {step === 2 && !drawn && (
                  <Button variant="gold" onClick={drawFive} disabled={hand.length > 0}>
                    <Icon name="hand" size={15} />
                    {hand.length > 0 ? "Drawing…" : "Draw 5"}
                  </Button>
                )}
                {step === 3 && (
                  <>
                    <Button variant="success" onClick={keepHand} disabled={mulligan !== "choose"}>
                      <Icon name="check" size={15} strokeWidth={2.6} />
                      {mulliganUsed ? "Keep this hand" : "Keep hand"}
                    </Button>
                    <Button variant="danger" onClick={doMulligan} disabled={mulligan !== "choose" || mulliganUsed}>
                      <Icon name="refresh" size={15} />
                      {mulliganUsed ? "Mulligan used" : "Mulligan"}
                    </Button>
                  </>
                )}
                {canContinue && (
                  <Button variant="primary" onClick={() => setStep((s) => Math.min(3, s + 1))}>
                    Continue
                    <Icon name="arrow-right" size={15} />
                  </Button>
                )}
              </div>
              {step === 3 && mulliganUsed && (
                <p className="mt-2 text-[12px] text-ash-500">
                  Each player can mulligan only once, so this hand is final.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {sample && (
          <p className="flex gap-2 text-[12px] leading-snug text-ash-500">
            <Icon name="info" size={14} className="mt-0.5 shrink-0" />
            Using a sample legal deck. Fix your decklist in Part A to run the ritual with your own.
          </p>
        )}
      </div>

      {/* The table */}
      <LayoutGroup id="deck-forge-ritual">
        <div
          className="relative min-w-0 space-y-3 rounded-[22px] border border-white/[0.06] p-3 sm:p-4"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(245,197,66,0.06), transparent 70%), rgba(0,0,0,0.18)",
          }}
          aria-label="Setup table"
          role="region"
        >
          <SeatRow
            side="opp"
            holdsEdge={coinPhase === "seated" && edge === "opp"}
            order={rivalOrder}
            missionPhase={missionPhase}
            dealtIds={dealtIds}
          />

          <AnimatePresence mode="wait" initial={false}>
            {step === 0 ? (
              <motion.div
                key="coin"
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex min-h-[200px] flex-col items-center justify-center gap-4 py-4"
              >
                {coinPhase === "idle" || coinPhase === "flipping" ? (
                  <FlipCoin turns={turns} flipping={coinPhase === "flipping"} />
                ) : coinPhase === "landed" && edge ? (
                  <EdgeToken size={84} layoutId={EDGE_ID} />
                ) : (
                  <span
                    className="h-[84px] w-[84px] rounded-full border border-dashed border-gold-400/20"
                    aria-hidden="true"
                  />
                )}
                <p className="min-h-[1.5em] text-center text-sm font-bold text-ash-300" aria-live="polite">
                  {coinPhase === "idle"
                    ? "Who leads Round 1?"
                    : coinPhase === "flipping"
                      ? "The token spins…"
                      : `${edge === "you" ? "You lead!" : "Your rival leads!"}`}
                </p>
              </motion.div>
            ) : (
              <motion.div key="deck" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <MissionDeck slots={slots} dealt={dealt} edge={edge} />
              </motion.div>
            )}
          </AnimatePresence>

          <SeatRow
            side="you"
            holdsEdge={coinPhase === "seated" && edge === "you"}
            order={yourOrder}
            missionPhase={missionPhase}
            dealtIds={dealtIds}
          >
            {step >= 2 && (
              <div className="mt-3 flex items-end gap-2 border-t border-white/[0.06] pt-3">
                <DeckPile count={deck.length - hand.length} />
                <HandFan hand={hand} drawSeq={drawSeq} compact={compact} />
              </div>
            )}
          </SeatRow>
        </div>
      </LayoutGroup>
    </div>
  );
}
