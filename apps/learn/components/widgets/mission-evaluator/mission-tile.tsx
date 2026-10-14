"use client";

import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { forwardRef, useEffect } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { EdgeToken } from "@/components/game/edge-token";
import { GameCard } from "@/components/game/game-card";
import { MissionCard } from "@/components/game/mission-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { PRACTICE_CARDS } from "@/lib/game/cards";
import { sidePower, topCard, unitPower } from "@/lib/game/engine";
import { RANK_BONUS, type CardDef, type MissionDef, type MissionOutcome, type MissionState, type Side, type UnitState } from "@/lib/game/types";
import { PREDICTION_LABEL, toPrediction, type EvalMissionSpec, type Prediction } from "./scenarios";

/** Where a mission is in the evaluation sequence. */
export type TileStage = "idle" | "pending" | "clash" | "edge" | "verdict" | "done";

const PREDICTIONS: readonly Prediction[] = ["you", "opp", "none"];

const SIDE_TEXT: Record<Side, string> = { you: "text-energy-300", opp: "text-blood-400" };

function unitLabel(card: CardDef, unit: UnitState, power: number): string {
  const tokens = unit.powerTokens;
  const tokenText = `${tokens} Power token${tokens === 1 ? "" : "s"}`;
  if (unit.hidden) return `Hidden character${tokens ? ` carrying ${tokenText}` : " with no tokens"}: ${power} Power`;
  const extras: string[] = [];
  if (tokens) extras.push(tokenText);
  if (power !== card.power + tokens) extras.push("an active effect");
  return `${card.name}: ${power} Power${extras.length ? ` (printed ${card.power} plus ${extras.join(" and ")})` : ""}`;
}

function PowerBox({ side, power, revealed, winner }: { side: Side; power: number; revealed: boolean; winner: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl border transition-shadow duration-500",
        side === "you" ? "border-energy-400/30 bg-energy-500/10" : "border-blood-400/30 bg-blood-500/10",
        winner && (side === "you" ? "shadow-[0_0_24px_-4px_rgba(56,196,255,0.8)]" : "shadow-[0_0_24px_-4px_rgba(239,64,96,0.8)]"),
      )}
    >
      <span aria-hidden="true" className={cn("text-xl font-black leading-none tabular-nums text-white", !revealed && "hidden")}>
        <AnimatedNumber value={revealed ? power : 0} stiffness={110} damping={20} />
      </span>
      {!revealed && (
        <span aria-hidden="true" className="text-lg font-black leading-none text-ash-500">
          ?
        </span>
      )}
      <span aria-hidden="true" className="mt-1 text-[8px] font-bold uppercase tracking-wider text-ash-500">
        Power
      </span>
      <span className="sr-only">{revealed ? `${power} Power` : "Power not counted yet"}</span>
    </div>
  );
}

function SideRow({
  side,
  mission,
  revealed,
  winner,
  cardSize,
}: {
  side: Side;
  mission: MissionState;
  revealed: boolean;
  winner: boolean;
  cardSize: "xs" | "sm";
}) {
  const units = mission.units.filter((u) => u.side === side);
  const power = sidePower(mission, side, PRACTICE_CARDS);
  return (
    <div className="flex items-center gap-2">
      <span className={cn("eyebrow w-8 shrink-0 !text-[9px] !tracking-[0.14em]", SIDE_TEXT[side])}>{side === "you" ? "You" : "Opp"}</span>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-3 pb-2.5 pt-1",
          cardSize === "sm" ? "min-h-[134px]" : "min-h-[92px]",
        )}
      >
        {units.length === 0 ? (
          <span
            className={cn(
              "flex items-center rounded-xl border border-dashed border-white/10 px-3 text-[11px] font-semibold text-ash-500",
              cardSize === "sm" ? "h-[124px]" : "h-[84px]",
            )}
          >
            No characters
          </span>
        ) : (
          units.map((u) => {
            const card = topCard(u, PRACTICE_CARDS);
            const p = unitPower(u, mission, PRACTICE_CARDS);
            return (
              <GameCard
                key={u.uid}
                card={card}
                size={cardSize}
                faceDown={u.hidden}
                power={p}
                powerTokens={u.powerTokens}
                label={unitLabel(card, u, p)}
              />
            );
          })
        )}
      </div>
      <PowerBox side={side} power={power} revealed={revealed} winner={winner} />
    </div>
  );
}

function ClashBar({
  you,
  opp,
  revealed,
  edgeHere,
  edgeLayoutId,
}: {
  you: number;
  opp: number;
  revealed: boolean;
  edgeHere: boolean;
  edgeLayoutId: string;
}) {
  const reduce = useReducedMotion();
  const total = you + opp;
  const target = total === 0 ? 50 : Math.min(92, Math.max(8, (you / total) * 100));
  const knot = useMotionValue(50);
  const left = useTransform(knot, (v) => `${v}%`);
  const right = useTransform(knot, (v) => `${100 - v}%`);

  useEffect(() => {
    if (!revealed) {
      knot.set(50);
      return;
    }
    if (reduce) {
      knot.set(target);
      return;
    }
    const controls = animate(knot, [50, 59, 43, 54, target], { duration: 1.05, ease: "easeInOut" });
    return () => controls.stop();
  }, [revealed, target, reduce, knot]);

  return (
    <div className="relative flex h-7 items-center" aria-hidden="true">
      <div
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-white/[0.05] ring-1 ring-white/10 transition-opacity duration-300",
          (!revealed || total === 0) && "opacity-30",
        )}
      >
        <motion.div style={{ width: left }} className="absolute inset-y-0 left-0 bg-gradient-to-r from-energy-600 via-energy-400 to-energy-200" />
        <motion.div style={{ width: right }} className="absolute inset-y-0 right-0 bg-gradient-to-l from-blood-600 via-blood-500 to-blood-400" />
      </div>
      {revealed && total > 0 && (
        <motion.span
          style={{ left }}
          className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.7)]"
        />
      )}
      {!revealed && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-shadow-900 px-2 py-0.5 text-[9px] font-black tracking-widest text-ash-500 ring-1 ring-white/10">
          VS
        </span>
      )}
      {edgeHere && (
        <span className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <EdgeToken size={30} layoutId={edgeLayoutId} />
        </span>
      )}
    </div>
  );
}

function Verdict({ outcome, edge, mission }: { outcome: MissionOutcome; edge: Side; mission: MissionDef }) {
  const { winner, reason, points, power } = outcome;
  const rankPoints = mission.basePoints + RANK_BONUS[mission.rank];
  const extra = points - rankPoints;
  if (!winner) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-ash-400/40 bg-white/[0.04] px-2.5 py-1 text-[12px] font-black uppercase tracking-wider text-ash-200">
          <Icon name="x" size={13} strokeWidth={3} />
          Nobody scores
        </span>
        <motion.span
          initial={{ x: 0 }}
          animate={{ x: [0, -5, 5, -3, 3, 0] }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="inline-flex items-center gap-1 rounded-lg bg-blood-500/15 px-2 py-1 text-[11.5px] font-bold text-blood-400"
        >
          <Icon name="info" size={12} />
          {power.you}–{power.opp}: 0 Power can&apos;t win
        </motion.span>
      </div>
    );
  }
  const you = winner === "you";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-black uppercase tracking-wider",
          you ? "bg-gradient-to-r from-energy-300 to-energy-500 text-shadow-950" : "bg-gradient-to-r from-chakra-300 to-blood-500 text-white",
        )}
      >
        <Icon name="trophy" size={13} strokeWidth={2.4} />
        {you ? "You win" : "Opponent wins"} · +{points}
      </span>
      <span className="sr-only">
        ({mission.basePoints} base + {RANK_BONUS[mission.rank]} rank{extra > 0 ? ` + ${extra} from SCORE` : ""})
      </span>
      <span className="text-[11.5px] font-semibold text-ash-400">
        {reason === "edge-tiebreak"
          ? `Tied ${power.you}–${power.opp}, Edge: ${edge === "you" ? "you" : "opponent"}`
          : `${power.you}–${power.opp} on Power`}
      </span>
      {extra > 0 && (
        <span className="text-[11px] font-semibold text-gold-300">
          {rankPoints} + {extra} SCORE
        </span>
      )}
      {outcome.scoreEffects.map((text, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-md bg-leaf-500/15 px-1.5 py-0.5 text-[10.5px] font-bold text-leaf-300">
          <span className="rounded-sm bg-leaf-500 px-1 text-[9px] font-black text-shadow-950">SCORE</span>
          {text}
        </span>
      ))}
    </div>
  );
}

export interface MissionTileProps {
  mission: MissionState;
  spec: EvalMissionSpec;
  outcome: MissionOutcome;
  edge: Side;
  stage: TileStage;
  prediction: Prediction | undefined;
  onPredict: (p: Prediction) => void;
  /** Show the focus hint (after a missed attempt). */
  hint: boolean;
  edgeHere: boolean;
  edgeLayoutId: string;
  idPrefix: string;
  burst: number;
  cardSize: "xs" | "sm";
}

/** One mission on the Round 4 board: both sides, a Power clash, and the learner's call. */
export const MissionTile = forwardRef<HTMLElement, MissionTileProps>(function MissionTile(
  { mission, spec, outcome, edge, stage, prediction, onPredict, hint, edgeHere, edgeLayoutId, idPrefix, burst, cardSize },
  ref,
) {
  const revealed = stage === "clash" || stage === "edge" || stage === "verdict" || stage === "done";
  const verdictShown = stage === "verdict" || stage === "done";
  const active = stage === "clash" || stage === "edge" || stage === "verdict";
  const locked = stage !== "idle";
  const answer = toPrediction(outcome.winner);
  const correct = prediction === answer;
  const name = mission.def.name;
  const power = outcome.power;

  return (
    <motion.article
      ref={ref}
      id={`${idPrefix}-${mission.def.id}`}
      aria-label={`${mission.def.rank}-rank mission: ${name}`}
      animate={{ opacity: stage === "pending" ? 0.5 : 1, scale: active ? 1.015 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className={cn(
        "relative min-w-0 scroll-mb-4 scroll-mt-48 rounded-2xl border bg-gradient-to-b from-shadow-800/90 to-shadow-900/90 p-3 transition-[border-color,box-shadow] duration-500 sm:p-4",
        active
          ? "border-gold-400/60 shadow-[0_0_44px_-12px_rgba(245,197,66,0.65)]"
          : verdictShown
            ? outcome.winner === "you"
              ? "border-energy-400/40"
              : outcome.winner === "opp"
                ? "border-blood-400/40"
                : "border-dashed border-ash-400/30"
            : "border-white/[0.07]",
      )}
    >
      {active && (
        <span className="eyebrow absolute -top-2.5 right-4 z-10 rounded-full bg-gradient-to-r from-gold-200 to-gold-500 px-2 py-0.5 !text-[9px] text-shadow-950 shadow-[0_0_16px_rgba(245,197,66,0.6)]">
          Scoring
        </span>
      )}
      <MissionCard mission={mission.def} compact highlight={active} />

      <div className="mt-2.5">
        <SideRow
          side="opp"
          mission={mission}
          revealed={revealed}
          winner={verdictShown && outcome.winner === "opp"}
          cardSize={cardSize}
        />
        <ClashBar you={power.you} opp={power.opp} revealed={revealed} edgeHere={edgeHere} edgeLayoutId={edgeLayoutId} />
        <SideRow
          side="you"
          mission={mission}
          revealed={revealed}
          winner={verdictShown && outcome.winner === "you"}
          cardSize={cardSize}
        />
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="eyebrow !text-[9.5px] text-ash-400">Your call</p>
          <AnimatePresence>
            {hint && stage === "idle" && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1 rounded-full bg-gold-400/10 px-2 py-0.5 text-[10.5px] font-bold text-gold-200"
              >
                <Icon name="lightbulb" size={11} />
                Hint: {spec.focus}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div role="group" aria-label={`Who wins ${name}?`} className="grid grid-cols-3 gap-1.5">
          {PREDICTIONS.map((p) => {
            const selected = prediction === p;
            const isAnswer = verdictShown && p === answer;
            const markRight = verdictShown && selected && correct;
            const markWrong = verdictShown && selected && !correct;
            return (
              <motion.button
                key={p}
                type="button"
                aria-pressed={selected}
                disabled={locked}
                onClick={() => onPredict(p)}
                whileTap={locked ? undefined : { scale: 0.95 }}
                className={cn(
                  "relative flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg border px-1 text-[12px] font-bold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-300 disabled:cursor-default",
                  !selected && !isAnswer && "border-white/10 bg-white/[0.03] text-ash-300",
                  !selected && !locked && "hover:border-white/25 hover:bg-white/[0.07] hover:text-white",
                  selected && p === "you" && "border-energy-400/70 bg-energy-500/20 text-energy-200",
                  selected && p === "opp" && "border-blood-400/70 bg-blood-500/20 text-blood-400",
                  selected && p === "none" && "border-ash-300/60 bg-white/10 text-white",
                  markRight && "ring-2 ring-leaf-400",
                  markWrong && "ring-2 ring-blood-400 line-through decoration-2",
                  isAnswer && !selected && "border-dashed border-leaf-400/70 bg-leaf-500/10 text-leaf-300",
                )}
              >
                {markRight && <Icon name="check" size={13} strokeWidth={3} className="shrink-0 text-leaf-300" />}
                {markWrong && <Icon name="x" size={13} strokeWidth={3} className="shrink-0" />}
                <span className="truncate">{PREDICTION_LABEL[p]}</span>
                {verdictShown && (selected || isAnswer) && (
                  <span className="sr-only">
                    {markRight ? ", your call, correct" : markWrong ? ", your call, wrong" : ", correct answer"}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <AnimatePresence>
          {verdictShown && (
            <motion.div
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="overflow-hidden"
            >
              <div className="pt-3" data-points-anchor="">
                <Verdict outcome={outcome} edge={edge} mission={mission.def} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <ParticleBurst
          fire={burst}
          palette={outcome.winner === "you" ? "energy" : outcome.winner === "opp" ? "blood" : "mist"}
          shape="mixed"
          count={24}
          spread={110}
        />
      </div>
    </motion.article>
  );
});
