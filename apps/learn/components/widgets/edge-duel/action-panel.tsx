"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { GameCard } from "@/components/game/game-card";
import { RankBadge } from "@/components/game/mission-card";
import { Button } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { checkAction, getLegalActions, topCard } from "@/lib/game/engine";
import { cn } from "@/lib/cn";
import type { CardCatalog, GameAction, GameState } from "@/lib/game/types";
import type { DuelPhase } from "./use-duel";

function CostChip({ value, tone }: { value: number; tone: "energy" | "mist" | "gold" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-black tabular-nums",
        tone === "energy" && "bg-shadow-950/30 text-shadow-950",
        tone === "mist" && "bg-white/15 text-white",
        tone === "gold" && "bg-shadow-950/25 text-shadow-950",
      )}
    >
      <Emblem name="chakra" size={11} />
      {value}
    </span>
  );
}

/** A play option with its Chakra cost; when illegal, the engine's reason is shown instead. */
function OptionButton({
  label,
  cost,
  tone,
  reason,
  disabled,
  onClick,
  describe,
}: {
  label: string;
  cost: number;
  tone: "energy" | "mist";
  reason: string | null;
  disabled: boolean;
  onClick: () => void;
  describe: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Button
        variant={tone}
        size="sm"
        className="w-full justify-between"
        disabled={disabled || reason !== null}
        onClick={onClick}
        aria-label={`${describe}${reason ? `. Not possible: ${reason}` : ""}`}
      >
        <span className="flex items-center gap-1.5">
          <Icon name={tone === "energy" ? "eye" : "eye-off"} size={13} className="hidden min-[400px]:block" />
          {label}
        </span>
        <CostChip value={cost} tone={tone} />
      </Button>
      {reason && !disabled && <span className="text-[10.5px] leading-snug text-ash-500">{reason}</span>}
    </div>
  );
}

/** Your hand, the plays each card allows on each mission, reveals, and the Pass button. */
export function ActionPanel({
  state,
  cards,
  phase,
  onAct,
  compact,
}: {
  state: GameState;
  cards: CardCatalog;
  phase: DuelPhase;
  onAct: (action: GameAction) => void;
  compact: boolean;
}) {
  const reduce = useReducedMotion();
  const yourTurn = phase === "your-turn";
  // A selection belongs to the state it was made in, so any new action clears it.
  const [pick, setPick] = useState<{ state: GameState; index: number } | null>(null);
  const selected = pick && pick.state === state ? pick.index : null;
  const hand = state.hands.you;

  const legal = yourTurn ? getLegalActions(state, cards, "you") : [];
  const selectedId = selected !== null ? hand[selected] : undefined;
  const selectedCard = selectedId ? cards[selectedId] : undefined;

  const hiddenUnits = state.missions.flatMap((m) =>
    m.units.filter((u) => u.side === "you" && u.hidden).map((u) => ({ mission: m, unit: u, card: topCard(u, cards) })),
  );
  const upgrades = selectedId
    ? legal.filter(
        (a): a is Extract<GameAction, { type: "upgrade" }> => a.type === "upgrade" && a.cardId === selectedId,
      )
    : [];

  const passHint = state.passed.opp
    ? "Your rival already passed, so this ends your Round."
    : state.edge === "you"
      ? "First to pass: you keep the Edge."
      : "First to pass: you take the Edge.";

  const status =
    phase === "rival-turn"
      ? "Your rival is acting…"
      : phase === "resolving"
        ? "Resolving your play…"
        : phase === "scoring"
          ? "Both players passed. Scoring the missions…"
          : null;

  return (
    <section
      aria-label="Your hand and actions"
      className="relative rounded-2xl border border-energy-400/20 bg-gradient-to-b from-energy-900/25 to-black/30 p-3 sm:p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow flex items-center gap-1.5 text-energy-300">
          <Icon name="hand" size={13} />
          Your hand
        </p>
        <p className="text-[11px] font-semibold text-ash-500">
          {yourTurn
            ? selectedCard
              ? "Choose where to play it"
              : hand.length
                ? "Tap a card to play it"
                : "No cards left"
            : ""}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        {hand.length === 0 && <p className="text-sm text-ash-500">Your hand is empty.</p>}
        {hand.map((id, i) => {
          const card = cards[id];
          if (!card) return null;
          const playable = legal.some((a) => (a.type === "play" || a.type === "upgrade") && a.cardId === id);
          return (
            <GameCard
              key={`${id}-${i}`}
              card={card}
              size={compact ? "sm" : "md"}
              selected={selected === i}
              dimmed={yourTurn && !playable}
              disabled={!yourTurn}
              onClick={() => setPick((p) => (p && p.state === state && p.index === i ? null : { state, index: i }))}
              label={`${card.name}, ${card.title}. Cost ${card.cost}, Power ${card.power}.${card.effects.map((e) => ` ${e.trigger.replace("_", " ")}: ${e.text}`).join("")}${playable ? "" : " No legal play right now."}`}
            />
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {yourTurn && selectedCard && selectedId && (
          <motion.div
            key={`${selectedId}-${selected}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border border-white/10 bg-black/35 p-2.5 sm:p-3">
              <p className="text-sm font-black text-white">
                {selectedCard.name} <span className="font-medium text-ash-400">· {selectedCard.title}</span>
              </p>
              {selectedCard.effects.length > 0 && (
                <p className="mt-0.5 text-[11.5px] text-ash-400">
                  {selectedCard.effects.map((e) => `${e.trigger.replace("_", " ")}: ${e.text}`).join(" ")}
                </p>
              )}
              <ul className="mt-2.5 space-y-3">
                {state.missions.map((m) => {
                  const faceUp: GameAction = {
                    type: "play",
                    side: "you",
                    cardId: selectedId,
                    missionId: m.def.id,
                    hidden: false,
                  };
                  const hidden: GameAction = {
                    type: "play",
                    side: "you",
                    cardId: selectedId,
                    missionId: m.def.id,
                    hidden: true,
                  };
                  return (
                    <li key={m.def.id}>
                      <p className="flex items-center gap-2 text-[12.5px] font-bold text-ash-200">
                        <RankBadge rank={m.def.rank} size={20} />
                        <span className="truncate">{m.def.name}</span>
                      </p>
                      <div className="mt-1.5 grid grid-cols-2 gap-2">
                        <OptionButton
                          label="Face-up"
                          cost={selectedCard.cost}
                          tone="energy"
                          reason={checkAction(state, faceUp, cards)}
                          disabled={!yourTurn}
                          onClick={() => onAct(faceUp)}
                          describe={`Play ${selectedCard.name} face-up on ${m.def.name} for ${selectedCard.cost} Chakra`}
                        />
                        <OptionButton
                          label="Hidden"
                          cost={1}
                          tone="mist"
                          reason={checkAction(state, hidden, cards)}
                          disabled={!yourTurn}
                          onClick={() => onAct(hidden)}
                          describe={`Play ${selectedCard.name} hidden on ${m.def.name} for 1 Chakra, with 0 Power`}
                        />
                      </div>
                    </li>
                  );
                })}
                {upgrades.map((a) => {
                  const found = state.missions.flatMap((m) => m.units).find((u) => u.uid === a.uid);
                  if (!found) return null;
                  const from = topCard(found, cards);
                  const cost = selectedCard.cost - from.cost;
                  return (
                    <li key={`up-${a.uid}`}>
                      <Button variant="gold" size="sm" className="w-full justify-between" onClick={() => onAct(a)}>
                        <span className="flex items-center gap-1.5">
                          <Icon name="layers" size={13} />
                          Upgrade {from.name}
                        </span>
                        <CostChip value={cost} tone="gold" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hiddenUnits.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="eyebrow !text-[10px] text-mist-300">Your hidden characters</p>
          {hiddenUnits.map(({ mission, unit, card }) => {
            const action: GameAction = { type: "reveal", side: "you", uid: unit.uid };
            const reason = yourTurn ? checkAction(state, action, cards) : null;
            return (
              <div key={unit.uid} className="flex flex-col gap-1">
                <Button
                  variant="mist"
                  size="sm"
                  className="w-full justify-between"
                  disabled={!yourTurn || reason !== null}
                  onClick={() => onAct(action)}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Icon name="eye" size={13} />
                    <span className="truncate">
                      Reveal {card.name} <span className="font-medium opacity-80">on {mission.def.rank}</span>
                    </span>
                  </span>
                  <CostChip value={card.cost} tone="mist" />
                </Button>
                {reason && <span className="text-[10.5px] text-ash-500">{reason}</span>}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <Button
          variant="gold"
          size="lg"
          className="w-full"
          disabled={!yourTurn}
          onClick={() => onAct({ type: "pass", side: "you" })}
          aria-describedby="edge-duel-pass-hint"
        >
          <Icon name="flag" size={17} strokeWidth={2.2} />
          Pass
        </Button>
        <p
          id="edge-duel-pass-hint"
          className="mt-2 flex items-center justify-center gap-1.5 text-center text-[12px] font-semibold text-gold-200/90"
        >
          <Emblem name="edge" size={13} className="shrink-0" />
          {passHint}
        </p>
      </div>

      <AnimatePresence>
        {status && (
          <motion.div
            key={status}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-shadow-950/60 p-4 backdrop-blur-[2px]"
          >
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-shadow-900/90 px-4 py-2 text-sm font-bold text-ash-200">
              <span className="flex gap-1" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className={cn("h-1.5 w-1.5 rounded-full", phase === "rival-turn" ? "bg-blood-400" : "bg-gold-300")}
                    animate={reduce ? { opacity: 0.8 } : { opacity: [0.25, 1, 0.25] }}
                    transition={reduce ? { duration: 0 } : { duration: 1, repeat: Infinity, delay: i * 0.18 }}
                  />
                ))}
              </span>
              {status}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
