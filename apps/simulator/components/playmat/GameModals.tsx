"use client";

import { motion } from "framer-motion";
import { Crown, RotateCcw, Settings2, Shuffle, ThumbsUp, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { TYPE_META } from "@/lib/cards/meta";
import { FORMAT, MISSION_RANKS, RANK_BONUS } from "@/lib/game-engine/format";
import { useGameStore } from "@/lib/game-engine/store";
import type { PlayerId } from "@/lib/game-engine/types";
import { CardFace } from "../cards/CardFace";
import { hoverProps } from "../cards/HoverPreview";
import { Btn } from "../ui/Button";
import { Segmented } from "../ui/Chip";
import { Modal } from "../ui/Modal";
import { actorOf, useBoardUi } from "./boardUi";
import { PLAYER_COLORS, RankBadge } from "./MissionLane";
import { useBoardActions } from "./useBoardActions";

export function GraveyardModal() {
  const game = useGameStore((s) => s.game)!;
  const ctx = useGameStore((s) => s.ctx)!;
  const open = useBoardUi((s) => s.graveyard);
  const setOpen = useBoardUi((s) => s.setGraveyard);
  const p = open ?? 0;
  const ids = [...game.players[p].discard].reverse();
  const byType = ids.reduce<Record<string, number>>((acc, id) => {
    const t = ctx.cards[game.instances[id].cardId].type;
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Modal
      open={open !== null}
      onClose={() => setOpen(null)}
      title="Graveyard"
      subtitle={`${ids.length} card${ids.length === 1 ? "" : "s"} in ${game.players[p].name}'s discard pile — newest first`}
      width="max-w-4xl"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented<"0" | "1">
          label="Player"
          value={String(p) as "0" | "1"}
          onChange={(v) => setOpen(Number(v) as PlayerId)}
          options={[
            { value: "0", label: `${game.players[0].name} (${game.players[0].discard.length})` },
            { value: "1", label: `${game.players[1].name} (${game.players[1].discard.length})` },
          ]}
        />
        <span className="text-xs text-ash-500">
          {Object.entries(byType)
            .map(([t, n]) => `${n} ${TYPE_META[t as keyof typeof TYPE_META].plural}`)
            .join(" · ") || "Empty"}
        </span>
      </div>
      {ids.length === 0 ? (
        <p className="py-10 text-center text-sm text-ash-500">No cards have been discarded yet.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] justify-items-center gap-3">
          {ids.map((id, i) => {
            const card = ctx.cards[game.instances[id].cardId];
            return (
              <motion.div key={id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.4) }} {...hoverProps(card)}>
                <CardFace card={card} size="md" />
              </motion.div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

export function MulliganModal() {
  const game = useGameStore((s) => s.game)!;
  const ctx = useGameStore((s) => s.ctx)!;
  const { perform } = useBoardActions();
  const actor = actorOf(game);
  const open = game.phase === "setup" && actor !== null && !game.players[actor].mulliganDecided;
  const p = actor ?? 0;
  const pl = game.players[p];

  return (
    <Modal
      open={open}
      onClose={() => undefined}
      dismissible={false}
      title={`${pl.name}: keep or mulligan?`}
      subtitle={`You may shuffle your ${FORMAT.openingHand}-card hand back once and draw a new one.${game.edge === p ? " You hold the Edge, so you decide first." : ""}`}
      width="max-w-4xl"
      footer={
        <>
          <Btn icon={<Shuffle className="h-4 w-4" />} onClick={() => perform({ type: "MULLIGAN", player: p, mulligan: true })}>
            Mulligan
          </Btn>
          <Btn variant="primary" icon={<ThumbsUp className="h-4 w-4" />} onClick={() => perform({ type: "MULLIGAN", player: p, mulligan: false })}>
            Keep hand
          </Btn>
        </>
      }
    >
      <div className="flex flex-wrap justify-center gap-3 py-2">
        {pl.hand.map((id, i) => (
          <motion.div key={id} initial={{ opacity: 0, y: 30, rotate: -6 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: i * 0.07, type: "spring", stiffness: 260, damping: 22 }}>
            <CardFace card={ctx.cards[game.instances[id].cardId]} size="md" />
          </motion.div>
        ))}
      </div>
    </Modal>
  );
}

export function GameOverModal() {
  const game = useGameStore((s) => s.game)!;
  const ctx = useGameStore((s) => s.ctx)!;
  const rematch = useGameStore((s) => s.rematch);
  const exit = useGameStore((s) => s.exit);
  const [dismissed, setDismissed] = useState(false);
  const result = game.result;

  useEffect(() => {
    setDismissed(false);
  }, [game.seed]);

  if (!result) return null;
  const winner = game.players[result.winner];
  const humanWon = winner.controller === "human" && game.players[result.winner === 0 ? 1 : 0].controller === "ai";
  const reason =
    result.reason === "concede"
      ? "by concession"
      : result.reason === "edge-tiebreak"
        ? `on a ${result.scores[0]}–${result.scores[1]} tie — the Edge token decides`
        : `${Math.max(...result.scores)}–${Math.min(...result.scores)}`;

  return (
    <Modal
      open={!dismissed}
      onClose={() => setDismissed(true)}
      title={
        <span className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-edge-400" /> {humanWon ? "Victory" : `${winner.name} wins`}
        </span>
      }
      subtitle={`${winner.name} (${winner.deckName}) wins ${reason}.`}
      width="max-w-xl"
      footer={
        <>
          <Btn variant="ghost" onClick={() => setDismissed(true)}>
            Review board
          </Btn>
          <Btn icon={<Settings2 className="h-4 w-4" />} onClick={exit}>
            New setup
          </Btn>
          <Btn variant="primary" icon={<RotateCcw className="h-4 w-4" />} onClick={rematch}>
            Rematch
          </Btn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {([0, 1] as PlayerId[]).map((p) => (
          <motion.div
            key={p}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: p * 0.1 }}
            className="rounded-xl border px-4 py-3 text-center"
            style={{ borderColor: `${PLAYER_COLORS[p]}55`, background: `${PLAYER_COLORS[p]}10` }}
          >
            <p className="font-display text-xs uppercase tracking-[0.16em]" style={{ color: PLAYER_COLORS[p] }}>
              {game.players[p].name}
              {game.edge === p && <Crown className="ml-1 inline h-3 w-3 text-edge-400" aria-label="Holds the Edge" />}
            </p>
            <p className="font-display text-4xl font-bold text-ash-50">{game.players[p].score}</p>
            <p className="text-[11px] text-ash-500">mission points</p>
          </motion.div>
        ))}
      </div>
      <p className="panel-title mb-2 mt-5">Missions</p>
      <ul className="space-y-1.5">
        {game.missions.map((m, i) => {
          const card = ctx.cards[game.instances[m.instanceId].cardId];
          const value = card.points + RANK_BONUS[m.rank];
          return (
            <li key={m.instanceId} className="flex items-center gap-3 rounded-lg border border-white/5 bg-shadow-950/50 px-3 py-2 text-sm">
              <RankBadge rank={MISSION_RANKS[i]} />
              <span className="min-w-0 flex-1 truncate text-ash-100">{card.name}</span>
              <span className="text-xs text-ash-500">{value} pts each</span>
              <span className="font-display font-bold" style={{ color: PLAYER_COLORS[0] }}>
                {m.wins[0]}×
              </span>
              <span className="font-display font-bold" style={{ color: PLAYER_COLORS[1] }}>
                {m.wins[1]}×
              </span>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
