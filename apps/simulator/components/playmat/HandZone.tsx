"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/lib/game-engine/store";
import type { PlayerId } from "@/lib/game-engine/types";
import { CardBack, CardFace, type CardSize } from "../cards/CardFace";
import { cx } from "../ui/Button";
import { actorOf, handOptions, useBoardUi } from "./boardUi";
import { zoneAt, zoneKey } from "./dropZones";
import { useBoardActions } from "./useBoardActions";

/**
 * A player's hand. Drag a card onto a mission's face-up area, its Hidden row, or one of your
 * characters (Evolve / Equip). Clicking a card still selects it for the button flow.
 */
export function HandZone({ player, faceUp, size = "md" }: { player: PlayerId; faceUp: boolean; size?: CardSize }) {
  const game = useGameStore((s) => s.game)!;
  const ctx = useGameStore((s) => s.ctx)!;
  const intent = useBoardUi((s) => s.intent);
  const setIntent = useBoardUi((s) => s.setIntent);
  const setInspect = useBoardUi((s) => s.setInspect);
  const setDragging = useBoardUi((s) => s.setDragging);
  const setHoverZone = useBoardUi((s) => s.setHoverZone);
  const { drop } = useBoardActions();
  const hand = game.players[player].hand;
  const actor = actorOf(game);
  const canAct = actor === player && game.phase === "action";
  const n = hand.length;
  const spread = Math.min(4, 30 / Math.max(n, 1));
  const overlap = n > 9 ? -Math.min(64, (n - 9) * 8 + 34) : n > 6 ? -26 : n > 4 ? -12 : 8;

  const pointerZone = (point: { x: number; y: number }) => zoneAt(point.x - window.scrollX, point.y - window.scrollY);

  return (
    <div className="flex h-full items-end justify-center" aria-label={`${game.players[player].name}'s hand (${n})`}>
      {hand.map((id, i) => {
        const card = ctx.cards[game.instances[id].cardId];
        const offset = i - (n - 1) / 2;
        const selected =
          (intent.kind === "card" || intent.kind === "play" || intent.kind === "jutsu" || intent.kind === "item" || intent.kind === "evolve") &&
          intent.handId === id;
        const evolvePick = intent.kind === "evolve-pick";
        let playable = false;
        if (canAct) {
          const o = handOptions(game, ctx, player, id);
          playable = evolvePick ? o.evolve === null : [o.faceUp, o.hidden, o.evolve, o.jutsu, o.item].some((r) => r === null);
        }

        return (
          <motion.div
            key={id}
            layoutId={id}
            drag={faceUp && canAct}
            dragSnapToOrigin
            dragElastic={0.9}
            dragMomentum={false}
            whileDrag={{ scale: 0.8, rotate: 0, zIndex: 80, opacity: 0.92 }}
            onDragStart={() => {
              setDragging(id);
              setIntent({ kind: "none" });
              setInspect({ cardId: card.id, instanceId: id });
            }}
            onDrag={(_, info) => {
              const zone = pointerZone(info.point);
              const key = zone ? zoneKey(zone) : null;
              if (key !== useBoardUi.getState().hoverZone) setHoverZone(key);
            }}
            onDragEnd={(_, info) => {
              const zone = pointerZone(info.point);
              setDragging(null);
              setHoverZone(null);
              if (zone) drop(id, zone);
            }}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: selected ? -30 : Math.abs(offset) * Math.abs(offset) * 0.8, opacity: 1, rotate: offset * spread }}
            whileHover={faceUp ? { y: -36, rotate: 0, scale: 1.05, zIndex: 40 } : undefined}
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
                  if (evolvePick) return setIntent({ kind: "evolve", handId: id });
                  setIntent(selected ? { kind: "none" } : { kind: "card", handId: id });
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
      {n === 0 && <span className="pb-6 text-[11px] uppercase tracking-[0.2em] text-ash-500">Empty hand</span>}
    </div>
  );
}
