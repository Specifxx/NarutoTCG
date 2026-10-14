"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/lib/game-engine/store";
import type { PlayerId } from "@/lib/game-engine/types";
import { CardBack, CardFace, type CardSize } from "../cards/CardFace";
import { cx } from "../ui/Button";
import { actorOf, handOptions, legalMissions, useBoardUi } from "./boardUi";
import { parseDrop, useBoardActions } from "./useBoardActions";

/** A player's hand. Face-up hands can drag cards onto missions, hidden slots and characters. */
export function HandZone({ player, faceUp, size = "md" }: { player: PlayerId; faceUp: boolean; size?: CardSize }) {
  const game = useGameStore((s) => s.game)!;
  const ctx = useGameStore((s) => s.ctx)!;
  const intent = useBoardUi((s) => s.intent);
  const setIntent = useBoardUi((s) => s.setIntent);
  const setInspect = useBoardUi((s) => s.setInspect);
  const setDragging = useBoardUi((s) => s.setDragging);
  const { drop, perform } = useBoardActions();
  const hand = game.players[player].hand;
  const actor = actorOf(game);
  const canAct = actor === player && game.phase === "action";
  const n = hand.length;
  const spread = Math.min(6, 48 / Math.max(n, 1));
  const overlap = n > 7 ? -Math.min(56, (n - 7) * 9 + 20) : n > 4 ? -18 : 6;

  return (
    <div className={cx("flex min-h-[60px] items-end justify-center", size === "md" ? "px-4 pt-6" : "px-2 pt-1")} aria-label={`${game.players[player].name}'s hand (${n})`}>
      {hand.map((id, i) => {
        const card = ctx.cards[game.instances[id].cardId];
        const offset = i - (n - 1) / 2;
        const selected = (intent.kind === "card" || intent.kind === "play" || intent.kind === "jutsu" || intent.kind === "item" || intent.kind === "evolve") && intent.handId === id;
        const evolvePick = intent.kind === "evolve-pick";
        let playable = false;
        if (canAct) {
          const o = handOptions(game, ctx, player, id);
          playable = [o.faceUp, o.hidden, o.evolve, o.jutsu, o.item].some((r) => r === null);
          if (evolvePick) playable = o.evolve === null;
        }

        return (
          <motion.div
            key={id}
            layoutId={id}
            drag={faceUp && canAct}
            dragSnapToOrigin
            dragElastic={0.6}
            whileDrag={{ scale: 1.1, rotate: 0, zIndex: 60 }}
            onDragStart={() => {
              setDragging(id);
              setIntent({ kind: "none" });
            }}
            onDragEnd={(_, info) => {
              setDragging(null);
              const x = info.point.x - window.scrollX;
              const y = info.point.y - window.scrollY;
              const target = document
                .elementsFromPoint(x, y)
                .map((el) => parseDrop(el))
                .find((t) => t !== null);
              if (target) drop(id, target);
            }}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: selected ? -26 : Math.abs(offset) * Math.abs(offset) * 1.2, opacity: 1, rotate: offset * spread }}
            whileHover={faceUp ? { y: -30, rotate: 0, scale: 1.06, zIndex: 40 } : undefined}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{ marginLeft: i === 0 ? 0 : overlap, zIndex: selected ? 30 : i, touchAction: "none" }}
            className={cx("relative origin-bottom", faceUp && canAct && "cursor-grab active:cursor-grabbing")}
          >
            {faceUp ? (
              <button
                type="button"
                onPointerEnter={() => setInspect({ cardId: card.id, instanceId: id })}
                onClick={() => {
                  setInspect({ cardId: card.id, instanceId: id });
                  if (!canAct) return;
                  if (evolvePick) {
                    setIntent({ kind: "evolve", handId: id });
                    return;
                  }
                  setIntent(selected ? { kind: "none" } : { kind: "card", handId: id });
                }}
                onDoubleClick={() => {
                  if (!canAct || card.type !== "character") return;
                  const legal = legalMissions(game, ctx, player, { kind: "play", handId: id, hidden: false });
                  if (legal.length) perform({ type: "PLAY_CHARACTER", player, handId: id, missionIndex: legal[legal.length - 1], hidden: false });
                }}
                aria-label={`${card.name}${card.title ? ` — ${card.title}` : ""}${selected ? " (selected)" : ""}`}
                aria-pressed={selected}
                className={cx(
                  "block rounded-[0.75em] transition-[filter,opacity] focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
                  canAct && !playable && "opacity-55 saturate-50",
                )}
              >
                <CardFace
                  card={card}
                  size={size}
                  glow={
                    selected
                      ? "0 0 0 2px #ffa05c, 0 0 32px rgba(255,122,26,0.75)"
                      : canAct && playable
                        ? "0 0 0 1px rgba(255,160,92,0.55), 0 0.6em 1.6em -0.6em rgba(255,122,26,0.55)"
                        : undefined
                  }
                />
              </button>
            ) : (
              <CardBack size={size} />
            )}
          </motion.div>
        );
      })}
      {n === 0 && <span className="pb-4 text-[11px] uppercase tracking-[0.2em] text-ash-500">Empty hand</span>}
    </div>
  );
}
