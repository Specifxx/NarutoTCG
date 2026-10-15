"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { MissionCard } from "@/components/game/mission-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { topCard, unitPower } from "@/lib/game/engine";
import type { CardCatalog, MissionOutcome, MissionState, Side, UnitState } from "@/lib/game/types";
import { BoardUnit } from "./board-unit";
import { outcomeReason } from "./log";
import { MoveButton } from "./move-button";
import type { CoachTarget, LaneFx, MoveOption, UnitFx } from "./types";

export type LaneEvalStatus = "idle" | "waiting" | "focus" | "done";

export interface MissionLaneProps {
  mission: MissionState;
  cards: CardCatalog;
  projection: MissionOutcome;
  /** Set once this mission has been scored in the evaluation sequence. */
  verdict: MissionOutcome | null;
  evalStatus: LaneEvalStatus;
  edge: Side;
  cardSelected: boolean;
  laneMoves: readonly MoveOption[];
  unitOptions: Readonly<Record<string, readonly MoveOption[]>>;
  selectedUid: string | null;
  selectableUids: ReadonlySet<string>;
  onSelectUnit: (uid: string) => void;
  onPerform: (option: MoveOption) => void;
  onBlocked: (option: MoveOption) => void;
  scout: boolean;
  unitFx: Readonly<Record<string, UnitFx>>;
  laneFx: LaneFx | undefined;
  defeated: ReadonlySet<string>;
  layoutIdFor: (uid: string) => string;
  fromHand: (uid: string) => boolean;
  coach: CoachTarget | null;
  registerLane: (missionId: string, el: HTMLElement | null) => void;
  registerZone: (missionId: string, el: HTMLElement | null) => void;
  registerUnit: (uid: string, el: HTMLElement | null) => void;
}

function useBurst(seq: number | undefined) {
  const [fire, setFire] = useState(0);
  const seen = useRef(0);
  useEffect(() => {
    if (seq && seq > seen.current) {
      seen.current = seq;
      setFire((f) => f + 1);
    }
  }, [seq]);
  return fire;
}

function PowerChip({ side, power }: { side: Side; power: number }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-black tabular-nums ring-1",
        side === "you" ? "bg-energy-500/10 text-energy-200 ring-energy-400/30" : "bg-blood-500/10 text-blood-400 ring-blood-400/30",
      )}
    >
      <Icon name="bolt" size={11} />
      <AnimatedNumber value={power} />
      <span className="sr-only"> Power</span>
    </span>
  );
}

function PowerBar({ you, opp }: { you: number; opp: number }) {
  const total = you + opp;
  const youPct = total === 0 ? 50 : (you / total) * 100;
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      <span className="w-5 text-right text-[11px] font-black tabular-nums text-energy-300">{you}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/5">
        <motion.span
          className="absolute inset-y-0 left-0 rounded-l-full bg-gradient-to-r from-energy-600 to-energy-300 shadow-[0_0_10px_rgba(56,196,255,0.7)]"
          initial={false}
          animate={{ width: `${total === 0 ? 0 : youPct}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 20 }}
        />
        <motion.span
          className="absolute inset-y-0 right-0 rounded-r-full bg-gradient-to-l from-blood-600 to-blood-400 shadow-[0_0_10px_rgba(239,64,96,0.7)]"
          initial={false}
          animate={{ width: `${total === 0 ? 0 : 100 - youPct}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 20 }}
        />
        <span className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
      </div>
      <span className="w-5 text-[11px] font-black tabular-nums text-blood-400">{opp}</span>
    </div>
  );
}

function ProjectionBadge({ outcome, edge, final }: { outcome: MissionOutcome; edge: Side; final: boolean }) {
  const tone =
    outcome.winner === "you"
      ? { box: "border-leaf-400/40 bg-leaf-500/10 text-leaf-300", solid: "bg-gradient-to-r from-leaf-400 to-leaf-600 text-shadow-950", icon: "check" as const }
      : outcome.winner === "opp"
        ? { box: "border-blood-400/40 bg-blood-500/10 text-blood-400", solid: "bg-gradient-to-r from-blood-400 to-blood-600 text-white", icon: "x" as const }
        : { box: "border-white/10 bg-white/[0.04] text-ash-300", solid: "bg-shadow-600 text-ash-100", icon: "minus" as const };
  const tie = outcome.reason === "edge-tiebreak";
  const title =
    outcome.winner === "you" ? (final ? "You win" : "Winning") : outcome.winner === "opp" ? (final ? "Opponent wins" : "Losing") : "No winner";
  return (
    <motion.div
      key={`${final}-${outcome.winner}-${outcome.reason}`}
      initial={final ? { scale: 0.4, opacity: 0, rotate: -6 } : { opacity: 0, y: 4 }}
      animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }}
      transition={{ type: "spring", stiffness: final ? 420 : 300, damping: final ? 16 : 26 }}
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5",
        final ? cn("border-transparent shadow-lg", tone.solid) : tone.box,
      )}
      title={outcomeReason(outcome, edge)}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <Icon name={tone.icon} size={13} className="shrink-0" />
        <span className="min-w-0">
          <span className={cn("block truncate text-[11px] font-black uppercase tracking-wider", final && "text-[12px]")}>
            {!final && <span className="sr-only">Projected: </span>}
            {title}
          </span>
          {tie && outcome.winner && (
            <span className={cn("block text-[10px] font-semibold", final ? "opacity-90" : "text-ash-400")}>
              Tie · Edge holder wins
            </span>
          )}
          {outcome.reason === "no-power" && (
            <span className={cn("block text-[10px] font-semibold", final ? "opacity-90" : "text-ash-400")}>
              Needs 1+ Power
            </span>
          )}
        </span>
      </span>
      {outcome.winner && (
        <span className="shrink-0 text-[12px] font-black tabular-nums">+{outcome.points}</span>
      )}
    </motion.div>
  );
}

function SideZone({
  side,
  units,
  props,
}: {
  side: Side;
  units: UnitState[];
  props: MissionLaneProps;
}) {
  const { mission, cards, laneFx, scout } = props;
  const fire = useBurst(laneFx && laneFx.side === side ? laneFx.seq : undefined);
  const size = units.length <= 2 ? "sm" : "xs";
  const power = units.reduce((s, u) => s + unitPower(u, mission, cards), 0);
  const mine = side === "you";
  const coachHere = props.coach?.missionId === mission.def.id && mine;
  const anyMove = props.laneMoves.some((m) => m.enabled);

  return (
    <div
      ref={mine ? (el) => props.registerZone(mission.def.id, el) : undefined}
      className={cn(
        "relative flex flex-col gap-2 rounded-xl border border-dashed border-transparent p-2 transition-colors duration-300",
        mine ? "justify-start" : "justify-end",
        mine && props.cardSelected && anyMove && "border-chakra-400/45 bg-chakra-500/[0.06]",
        coachHere && "border-solid border-gold-300/70 bg-gold-400/[0.07]",
      )}
    >
      {!mine && (
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow !text-[9.5px] text-blood-400/80">Opponent</span>
          <PowerChip side="opp" power={power} />
        </div>
      )}
      <div className={cn("flex min-h-[94px] flex-wrap justify-center gap-2", mine ? "items-start" : "items-end")}>
        <AnimatePresence custom={props.defeated}>
          {units.map((u) => {
            const card = topCard(u, cards);
            return (
              <BoardUnit
                key={u.uid}
                unit={u}
                card={card}
                power={unitPower(u, mission, cards)}
                size={size}
                layoutId={props.layoutIdFor(u.uid)}
                fromHand={props.fromHand(u.uid)}
                scout={scout}
                selected={props.selectedUid === u.uid}
                selectable={props.selectableUids.has(u.uid)}
                onSelect={props.onSelectUnit}
                options={props.unitOptions[u.uid] ?? []}
                onPerform={props.onPerform}
                onBlocked={props.onBlocked}
                coachKey={props.coach?.actionKey ?? null}
                coachHighlight={props.coach?.uid === u.uid}
                fx={props.unitFx[u.uid]}
                registerRef={props.registerUnit}
              />
            );
          })}
        </AnimatePresence>
        {units.length === 0 && (
          <span className="flex h-[90px] w-16 items-center justify-center rounded-[11px] border border-dashed border-white/10 text-[10px] font-semibold text-ash-500">
            Empty
          </span>
        )}
      </div>
      {mine && (
        <>
          <AnimatePresence initial={false}>
            {props.laneMoves.length > 0 && (
              <motion.div
                key="moves"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap justify-center gap-1.5 overflow-hidden p-1"
              >
                <AnimatePresence initial={false}>
                  {props.laneMoves.map((o) => (
                    <MoveButton
                      key={o.key}
                      option={o}
                      onPerform={props.onPerform}
                      onBlocked={props.onBlocked}
                      coached={props.coach?.actionKey === o.key}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow !text-[9.5px] text-energy-300/80">You</span>
            <PowerChip side="you" power={power} />
          </div>
        </>
      )}
      <ParticleBurst fire={fire} palette="blood" count={26} spread={90} shape="spark" />
    </div>
  );
}

export function MissionLane(props: MissionLaneProps) {
  const { mission, projection, verdict, evalStatus, edge } = props;
  const youUnits = mission.units.filter((u) => u.side === "you");
  const oppUnits = mission.units.filter((u) => u.side === "opp");
  const shown = verdict ?? projection;
  const focus = evalStatus === "focus";

  return (
    <motion.section
      ref={(el) => props.registerLane(mission.def.id, el)}
      aria-label={`${mission.def.rank}-rank mission: ${mission.def.name}. You ${shown.power.you} Power, Opponent ${shown.power.opp} Power. ${verdict ? "Result" : "Projected"}: ${verdict ? outcomeReason(verdict, edge) : outcomeReason(projection, edge)}`}
      animate={{
        opacity: evalStatus === "waiting" ? 0.55 : 1,
        scale: focus ? 1.02 : 1,
      }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className={cn(
        "relative row-span-3 grid scroll-mb-32 scroll-mt-36 snap-center grid-rows-subgrid gap-0 rounded-2xl border bg-gradient-to-b from-shadow-800/80 via-shadow-900/80 to-shadow-800/80 transition-[border-color,box-shadow] duration-300",
        focus
          ? "border-gold-300/70 shadow-[0_0_40px_-6px_rgba(245,197,66,0.55)]"
          : verdict?.winner === "you"
            ? "border-leaf-400/40"
            : verdict?.winner === "opp"
              ? "border-blood-400/40"
              : "border-white/[0.07]",
      )}
    >
      <SideZone side="opp" units={oppUnits} props={props} />
      <div className="relative flex flex-col gap-2 border-y border-white/[0.06] bg-black/20 px-2 py-2.5">
        <MissionCard mission={mission.def} compact highlight={focus} />
        <PowerBar you={shown.power.you} opp={shown.power.opp} />
        <ProjectionBadge outcome={shown} edge={edge} final={Boolean(verdict)} />
        {verdict && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center text-[10.5px] leading-snug text-ash-300"
          >
            {outcomeReason(verdict, edge)}
          </motion.p>
        )}
      </div>
      <SideZone side="you" units={youUnits} props={props} />
    </motion.section>
  );
}
