"use client";

import { AnimatePresence, motion } from "framer-motion";
import { EyeOff, Layers, Sword } from "lucide-react";
import { fullName } from "@/lib/cards/meta";
import { powerBreakdown } from "@/lib/game-engine/power";
import type { EngineContext, GameState } from "@/lib/game-engine/types";
import { CardBack, CardFace, type CardSize } from "../cards/CardFace";
import { cx } from "../ui/Button";

export function BoardCard({
  game,
  ctx,
  id,
  size = "sm",
  ownerVisible,
  targetable,
  dimmed,
  onClick,
  onHover,
}: {
  game: GameState;
  ctx: EngineContext;
  id: string;
  size?: CardSize;
  /** The local user may see this card's face even while hidden. */
  ownerVisible: boolean;
  targetable: boolean;
  dimmed: boolean;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
}) {
  const inst = game.instances[id];
  const card = ctx.cards[inst.cardId];
  const pb = powerBreakdown(game, ctx, id);
  const justRevealed = inst.revealedAtSeq === game.seq;
  const showFace = !inst.faceDown || ownerVisible;
  const delta = pb.total - card.power;

  return (
    <motion.div
      layoutId={id}
      data-drop={`char:${id}`}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative"
      style={{ perspective: 800 }}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
    >
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ y: -4, scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        aria-label={showFace ? `${fullName(card)}${inst.faceDown ? " (hidden)" : ""}, power ${pb.total}` : "Hidden character"}
        className={cx(
          "card-3d relative block rounded-[0.75em] focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
          targetable && "ring-2 ring-chakra-400 ring-offset-2 ring-offset-shadow-950 animate-pulse-slow",
          dimmed && "opacity-40",
        )}
        initial={justRevealed && !ownerVisible ? { rotateY: 180 } : false}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {showFace ? (
          <div className="backface-hidden relative">
            <CardFace card={card} size={size} />
            {inst.faceDown && (
              <div className="absolute inset-0 grid place-items-center rounded-[0.75em] bg-yin-500/35 backdrop-grayscale-[0.6]">
                <EyeOff className="h-5 w-5 text-ash-50 drop-shadow" />
              </div>
            )}
          </div>
        ) : (
          <CardBack size={size} className="backface-hidden" />
        )}
        {justRevealed && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-[0.75em]"
            initial={{ boxShadow: "0 0 0 0 rgba(154,107,255,0.9)" }}
            animate={{ boxShadow: "0 0 0 14px rgba(154,107,255,0)" }}
            transition={{ duration: 0.9, delay: 0.4 }}
          />
        )}
      </motion.button>

      {!inst.faceDown && (
        <span
          className={cx(
            "pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border px-2 py-px font-display text-[11px] font-bold shadow-lg",
            delta > 0 ? "border-jade-400/60 bg-shadow-950 text-jade-400" : delta < 0 ? "border-blood-500/60 bg-shadow-950 text-blood-400" : "border-white/15 bg-shadow-950 text-ash-50",
          )}
          title="Current Power"
        >
          {pb.total}
        </span>
      )}

      <AnimatePresence>
        {inst.powerTokens > 0 && (
          <motion.span
            key={inst.powerTokens}
            initial={{ scale: 1.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="pointer-events-none absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-gradient-to-br from-chakra-300 to-chakra-500 px-1 font-display text-[11px] font-bold text-shadow-950 shadow-[0_0_14px_rgba(255,122,26,0.8)]"
            title={`${inst.powerTokens} Power token${inst.powerTokens === 1 ? "" : "s"}`}
          >
            +{inst.powerTokens}
          </motion.span>
        )}
      </AnimatePresence>

      {(inst.stack.length > 0 || inst.attachments.length > 0) && (
        <div className="pointer-events-none absolute -left-1.5 top-1/2 flex -translate-y-1/2 flex-col gap-1">
          {inst.stack.length > 0 && (
            <span className="flex items-center gap-0.5 rounded bg-jade-400/90 px-1 font-display text-[9px] font-bold text-shadow-950" title={`Evolved ${inst.stack.length}×`}>
              <Layers className="h-2.5 w-2.5" />
              {inst.stack.length + 1}
            </span>
          )}
          {inst.attachments.length > 0 && (
            <span
              className="flex items-center gap-0.5 rounded bg-sky-400/90 px-1 font-display text-[9px] font-bold text-shadow-950"
              title={inst.attachments.map((a) => ctx.cards[game.instances[a].cardId].name).join(", ")}
            >
              <Sword className="h-2.5 w-2.5" />
              {inst.attachments.length}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
