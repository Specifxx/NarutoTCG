"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, Crown, Flag, Skull, User } from "lucide-react";
import { useGameStore } from "@/lib/game-engine/store";
import type { PlayerId } from "@/lib/game-engine/types";
import { CardBack, CardFace } from "../cards/CardFace";
import { cx } from "../ui/Button";
import { actorOf, techniqueOf, useBoardUi } from "./boardUi";
import { HandZone } from "./HandZone";
import { PLAYER_COLORS } from "./MissionLane";

export function EdgeToken({ size = 34 }: { size?: number }) {
  return (
    <motion.div
      layoutId="edge-token"
      transition={{ type: "spring", stiffness: 160, damping: 18 }}
      className="relative grid shrink-0 place-items-center rounded-full font-display text-[9px] font-bold uppercase tracking-wider text-shadow-950"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 35% 30%, #fff3c4, #ffcf4a 45%, #a86f00)",
        boxShadow: "0 0 18px rgba(255,207,74,0.7), inset 0 -2px 4px rgba(0,0,0,0.35)",
      }}
      title="Edge token — wins tied missions, acts first next round, wins a tied game"
    >
      Edge
    </motion.div>
  );
}

function ChakraPool({ available, spent }: { available: number; spent: number }) {
  const total = available + spent;
  const shown = Math.min(total, 18);
  return (
    <div className="flex min-w-0 items-center gap-2" aria-label={`${available} Chakra available, ${spent} spent`}>
      <div className="flex flex-wrap items-center gap-[3px]">
        <AnimatePresence initial={false}>
          {Array.from({ length: shown }, (_, i) => {
            const tapped = i >= Math.min(available, shown);
            return (
              <motion.span
                key={i}
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: tapped ? 0.6 : 1, rotate: tapped ? 90 : 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
                className="block h-[18px] w-[12px] rounded-[3px]"
                style={{
                  background: tapped ? "linear-gradient(180deg,#4a3326,#241a14)" : "radial-gradient(circle at 50% 35%, #ffe0c2, #ff7a1a 55%, #b03a00)",
                  boxShadow: tapped ? "inset 0 0 0 1px rgba(255,122,26,0.45)" : "0 0 8px rgba(255,122,26,0.65)",
                }}
              />
            );
          })}
        </AnimatePresence>
      </div>
      <span className="font-display text-sm font-bold text-chakra-300">
        {available}
        {total > 0 && <span className="text-[11px] font-medium text-ash-500">/{total}</span>}
      </span>
    </div>
  );
}

/** Leader slot, Chakra pool, deck, discard pile and score for one player. */
export function PlayerStrip({ player, position }: { player: PlayerId; position: "top" | "bottom" }) {
  const game = useGameStore((s) => s.game)!;
  const ctx = useGameStore((s) => s.ctx)!;
  const setInspect = useBoardUi((s) => s.setInspect);
  const setGraveyard = useBoardUi((s) => s.setGraveyard);
  const setIntent = useBoardUi((s) => s.setIntent);
  const intent = useBoardUi((s) => s.intent);
  const pl = game.players[player];
  const leaderCard = pl.leader ? ctx.cards[game.instances[pl.leader].cardId] : null;
  const technique = techniqueOf(game, ctx, player);
  const actor = actorOf(game);
  const active = game.activePlayer === player && game.phase === "action";
  const topDiscard = pl.discard.length ? ctx.cards[game.instances[pl.discard[pl.discard.length - 1]].cardId] : null;
  const color = PLAYER_COLORS[player];
  const isAi = pl.controller === "ai";
  const showHandHere = position === "top";

  return (
    <div
      className={cx("panel flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2", active && "ring-1")}
      style={{ ["--tw-ring-color" as string]: `${color}88`, boxShadow: active ? `0 0 30px -12px ${color}` : undefined }}
    >
      <div className="relative">
        {leaderCard ? (
          <button
            type="button"
            onPointerEnter={() => setInspect({ cardId: leaderCard.id, instanceId: pl.leader })}
            onClick={() => {
              setInspect({ cardId: leaderCard.id, instanceId: pl.leader });
              if (actor === player && technique && !pl.techniqueUsed) setIntent(intent.kind === "technique" ? { kind: "none" } : { kind: "technique" });
            }}
            aria-label={`Leader ${leaderCard.name}${technique ? `, Technique cost ${technique.cost}` : ""}`}
            className="block rounded-[0.75em] focus:outline-none focus-visible:ring-2 focus-visible:ring-edge-400"
          >
            <CardFace card={leaderCard} size="xs" glow={intent.kind === "technique" && actor === player ? "0 0 0 2px #ffcf4a, 0 0 22px rgba(255,207,74,0.7)" : undefined} />
          </button>
        ) : (
          <div className="grid h-[73px] w-[52px] place-items-center rounded-lg border border-dashed border-white/15 text-[9px] text-ash-500">No leader</div>
        )}
        <Crown className="absolute -left-1.5 -top-1.5 h-4 w-4 text-edge-400 drop-shadow" aria-hidden />
        {technique && (
          <span
            className={cx(
              "absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1 font-display text-[8px] font-bold uppercase",
              pl.techniqueUsed ? "bg-shadow-700 text-ash-500" : "bg-edge-400 text-shadow-950",
            )}
          >
            {pl.techniqueUsed ? "Used" : `Tech ${technique.cost}`}
          </span>
        )}
      </div>

      <div className="min-w-[120px]">
        <p className="flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-[0.08em]" style={{ color }}>
          {isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
          {pl.name}
          {pl.passed && game.phase === "action" && (
            <span className="flex items-center gap-0.5 rounded bg-white/10 px-1.5 text-[9px] text-ash-300">
              <Flag className="h-2.5 w-2.5" /> Passed
            </span>
          )}
        </p>
        <p className="truncate text-[11px] text-ash-500">{pl.deckName}</p>
      </div>

      <div className="flex items-baseline gap-1" title="Mission points">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={pl.score}
            initial={{ scale: 1.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-display text-2xl font-bold text-ash-50"
          >
            {pl.score}
          </motion.span>
        </AnimatePresence>
        <span className="text-[10px] uppercase tracking-wider text-ash-500">pts</span>
      </div>

      <div className="grid h-[34px] w-[34px] place-items-center">{game.edge === player && <EdgeToken />}</div>

      <ChakraPool available={pl.chakra} spent={pl.chakraSpent} />

      {showHandHere && (
        <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
          <HandZone player={player} faceUp={!isAi} size={isAi ? "xs" : "sm"} />
        </div>
      )}

      <div className={cx("flex items-center gap-3", !showHandHere && "ml-auto")}>
        <div className="relative" title={`${pl.deck.length} cards in deck`}>
          {pl.deck.length > 0 ? <CardBack size="xs" label={`Deck, ${pl.deck.length} cards`} /> : <div className="h-[73px] w-[52px] rounded-lg border border-dashed border-white/10" />}
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-shadow-950 px-1.5 font-display text-[10px] font-bold text-ash-200 ring-1 ring-white/10">
            {pl.deck.length}
          </span>
        </div>
        <button type="button" onClick={() => setGraveyard(player)} className="relative block rounded-[0.75em] focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400" title="View discard pile">
          {topDiscard ? (
            <CardFace card={topDiscard} size="xs" className="opacity-80 grayscale-[0.4]" />
          ) : (
            <div className="grid h-[73px] w-[52px] place-items-center rounded-lg border border-dashed border-white/10 text-ash-500">
              <Skull className="h-4 w-4" />
            </div>
          )}
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-shadow-950 px-1.5 font-display text-[10px] font-bold text-ash-200 ring-1 ring-white/10">
            {pl.discard.length}
          </span>
        </button>
      </div>
    </div>
  );
}
