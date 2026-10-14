"use client";

import { AnimatePresence, motion } from "framer-motion";
import { EyeOff, Trophy } from "lucide-react";
import { FORMAT, MISSION_RANKS, RANK_BONUS, type MissionRank } from "@/lib/game-engine/format";
import { validateAction } from "@/lib/game-engine/legal";
import { missionTotals, projectedWinner } from "@/lib/game-engine/power";
import { useGameStore } from "@/lib/game-engine/store";
import type { EngineContext, GameState, PlayerId } from "@/lib/game-engine/types";
import { CardText } from "../cards/CardText";
import { cx } from "../ui/Button";
import { BoardCard } from "./BoardCard";
import { actorOf, legalCharacters, legalMissions, useBoardUi } from "./boardUi";
import { useBoardActions } from "./useBoardActions";

export const RANK_COLORS: Record<MissionRank, string> = { D: "#5fd0a0", C: "#4aa8ff", B: "#c27bff", A: "#ffcf4a" };
export const PLAYER_COLORS: [string, string] = ["#3987e5", "#d95926"];

export function MissionLane({ index }: { index: number }) {
  const game = useGameStore((s) => s.game)!;
  const ctx = useGameStore((s) => s.ctx)!;
  const intent = useBoardUi((s) => s.intent);
  const dragging = useBoardUi((s) => s.dragging);
  const mission = game.missions[index];
  const actor = actorOf(game);
  const card = ctx.cards[game.instances[mission.instanceId].cardId];
  const rank = MISSION_RANKS[index];

  const intentTarget = actor !== null && legalMissions(game, ctx, actor, intent).includes(index);
  const cardIntent = intent.kind === "card" ? intent.handId : null;
  const handId = dragging ?? cardIntent;
  const legalFor = (hidden: boolean) => {
    if (actor === null || !handId) return false;
    const c = ctx.cards[game.instances[handId].cardId];
    if (c.type === "character")
      return validateAction(game, ctx, { type: "PLAY_CHARACTER", player: actor, handId, missionIndex: index, hidden }) === null;
    if (c.type === "jutsu" && !hidden) return validateAction(game, ctx, { type: "PLAY_JUTSU", player: actor, handId, missionIndex: index }) === null;
    return false;
  };
  const faceUpDrop = intentTarget || legalFor(false);
  const hiddenDrop = (intent.kind === "play" && intent.hidden && intentTarget) || legalFor(true);

  return (
    <div
      className={cx("panel flex min-w-0 flex-col transition-shadow", !mission.revealed && "opacity-60")}
      style={{ boxShadow: intentTarget ? `0 0 0 1px ${RANK_COLORS[rank]}, 0 0 28px -8px ${RANK_COLORS[rank]}` : undefined }}
    >
      <Side game={game} ctx={ctx} index={index} player={1} actor={actor} faceUpDrop={faceUpDrop && actor === 1} hiddenDrop={hiddenDrop && actor === 1} />
      <MissionBanner game={game} ctx={ctx} index={index} clickable={intentTarget} />
      <Side game={game} ctx={ctx} index={index} player={0} actor={actor} faceUpDrop={faceUpDrop && actor === 0} hiddenDrop={hiddenDrop && actor === 0} />
      <span className="sr-only">
        Mission {rank}: {card.name}
      </span>
    </div>
  );
}

function Side({
  game,
  ctx,
  index,
  player,
  actor,
  faceUpDrop,
  hiddenDrop,
}: {
  game: GameState;
  ctx: EngineContext;
  index: number;
  player: PlayerId;
  actor: PlayerId | null;
  faceUpDrop: boolean;
  hiddenDrop: boolean;
}) {
  const intent = useBoardUi((s) => s.intent);
  const setIntent = useBoardUi((s) => s.setIntent);
  const setInspect = useBoardUi((s) => s.setInspect);
  const { chooseMission, chooseCharacter } = useBoardActions();
  const mission = game.missions[index];
  const ids = mission.characters[player];
  const faceUp = ids.filter((id) => !game.instances[id].faceDown);
  const hidden = ids.filter((id) => game.instances[id].faceDown);
  const ownerVisible = game.players[player].controller === "human";
  const targets = actor !== null ? legalCharacters(game, ctx, actor, intent) : [];
  const targeting = intent.kind === "evolve" || intent.kind === "item" || intent.kind === "token";
  const top = player === 1;

  const onCardClick = (id: string) => {
    if (chooseCharacter(id)) return;
    const inst = game.instances[id];
    setInspect({ cardId: inst.cardId, instanceId: id });
    if (actor === null || inst.owner !== actor) return;
    if (inst.faceDown) setIntent({ kind: "reveal", instanceId: id });
    else setIntent({ kind: "unit", instanceId: id });
  };

  const renderCard = (id: string, size: "xs" | "sm" = "sm") => (
    <BoardCard
      key={id}
      game={game}
      ctx={ctx}
      id={id}
      size={size}
      ownerVisible={ownerVisible}
      targetable={targets.includes(id)}
      dimmed={targeting && actor === player && !targets.includes(id)}
      onClick={() => onCardClick(id)}
      onHover={(h) => h && setInspect({ cardId: ownerVisible || !game.instances[id].faceDown ? game.instances[id].cardId : null, instanceId: id })}
    />
  );

  const faceUpZone = (
    <div
      data-drop={faceUpDrop ? `mission:${index}:faceup` : undefined}
      onClick={(e) => {
        if (faceUpDrop && e.target === e.currentTarget) chooseMission(index, false);
      }}
      className={cx(
        "flex min-h-[118px] flex-wrap content-center items-center justify-center gap-x-2.5 gap-y-3.5 rounded-lg px-1.5 py-2 transition-colors",
        faceUpDrop && "drop-zone-active cursor-pointer",
      )}
    >
      {faceUp.map((id) => renderCard(id))}
      {faceUp.length === 0 && (
        <span className="pointer-events-none text-[10px] uppercase tracking-[0.18em] text-ash-500/70">{faceUpDrop ? "Play here" : ""}</span>
      )}
    </div>
  );

  const hiddenZone = (
    <div
      data-drop={hiddenDrop ? `mission:${index}:hidden` : undefined}
      onClick={(e) => {
        if (hiddenDrop && e.target === e.currentTarget) chooseMission(index, true);
      }}
      className={cx(
        "flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 transition-colors",
        hiddenDrop ? "cursor-pointer border-yin-400/80 bg-yin-500/10" : "border-yin-400/20 bg-yin-500/[0.03]",
      )}
      title="Hidden slot — face-down characters (1 Chakra, 0 Power)"
    >
      <span className="pointer-events-none flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-yin-400/70">
        <EyeOff className="h-3 w-3" /> {hidden.length || ""}
      </span>
      <div className="flex flex-wrap gap-1.5">{hidden.map((id) => renderCard(id, "xs"))}</div>
    </div>
  );

  return (
    <div className={cx("flex flex-col gap-1.5 p-2", top ? "pb-1" : "pt-1")} aria-label={`${game.players[player].name} in Mission ${MISSION_RANKS[index]}`}>
      {top ? (
        <>
          {hiddenZone}
          {faceUpZone}
        </>
      ) : (
        <>
          {faceUpZone}
          {hiddenZone}
        </>
      )}
    </div>
  );
}

function MissionBanner({ game, ctx, index, clickable }: { game: GameState; ctx: EngineContext; index: number; clickable: boolean }) {
  const { chooseMission } = useBoardActions();
  const setInspect = useBoardUi((s) => s.setInspect);
  const mission = game.missions[index];
  const rank = MISSION_RANKS[index];
  const color = RANK_COLORS[rank];
  const card = ctx.cards[game.instances[mission.instanceId].cardId];
  const totals = missionTotals(game, ctx, index);
  const leader = projectedWinner(game, totals, FORMAT.minPowerToWin);
  const evaluation = game.phase === "mission" ? game.lastEvaluation?.find((e) => e.missionIndex === index) : undefined;
  const sum = totals[0] + totals[1];
  const share = sum === 0 ? 0.5 : totals[0] / sum;

  if (!mission.revealed) {
    return (
      <div className="mx-2 my-1 flex items-center gap-3 rounded-lg border border-white/5 bg-shadow-950/70 px-3 py-3">
        <RankBadge rank={rank} dim />
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-ash-400">Unrevealed mission</p>
          <p className="text-[11px] text-ash-500">Revealed in round {index + 1}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      layout
      onClick={() => (clickable ? chooseMission(index) : setInspect({ cardId: card.id, instanceId: mission.instanceId }))}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          chooseMission(index);
        }
      }}
      onPointerEnter={() => setInspect({ cardId: card.id, instanceId: mission.instanceId })}
      className={cx(
        "relative mx-2 my-1 overflow-hidden rounded-lg border bg-gradient-to-r from-shadow-950 via-shadow-850 to-shadow-950 px-3 py-2 text-left",
        clickable ? "cursor-pointer" : "cursor-default",
      )}
      style={{ borderColor: `${color}55` }}
      initial={{ rotateX: 90, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
    >
      <div className="flex items-center gap-2.5">
        <RankBadge rank={rank} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[13px] font-bold leading-tight text-ash-50">{card.name}</p>
          <p className="text-[10px] uppercase tracking-wider text-ash-400">
            {card.points} pts <span style={{ color }}>+{RANK_BONUS[rank]} rank</span> = <span className="text-edge-400">{card.points + RANK_BONUS[rank]}</span>
          </p>
        </div>
        <div className="flex flex-col items-end font-display text-[10px] text-ash-500">
          <span>
            {mission.wins[1] > 0 && <span style={{ color: PLAYER_COLORS[1] }}>{mission.wins[1]}×</span>}
            {mission.wins[0] > 0 && <span className="ml-1" style={{ color: PLAYER_COLORS[0] }}>{mission.wins[0]}×</span>}
          </span>
        </div>
      </div>
      {card.text && (
        <div className="mt-1.5 text-[10px]">
          <CardText card={card} compact />
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <Total value={totals[1]} color={PLAYER_COLORS[1]} leading={leader === 1} />
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: PLAYER_COLORS[1] }}
            initial={false}
            animate={{ width: `${(1 - share) * 100}%` }}
          />
          <motion.div
            className="absolute inset-y-0 right-0 rounded-full"
            style={{ background: PLAYER_COLORS[0] }}
            initial={false}
            animate={{ width: `${share * 100}%` }}
          />
          <div className="absolute inset-y-0 left-1/2 w-px bg-shadow-950" />
        </div>
        <Total value={totals[0]} color={PLAYER_COLORS[0]} leading={leader === 0} />
      </div>

      <AnimatePresence>
        {evaluation && (
          <motion.div
            initial={{ opacity: 0, scale: 1.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 grid place-items-center bg-shadow-950/85 backdrop-blur-[2px]"
          >
            {evaluation.winner === null ? (
              <span className="font-display text-xs uppercase tracking-[0.2em] text-ash-400">No winner</span>
            ) : (
              <span className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.12em]" style={{ color: PLAYER_COLORS[evaluation.winner] }}>
                <Trophy className="h-4 w-4" />
                {game.players[evaluation.winner].name} +{evaluation.points}
                {evaluation.edgeTiebreak && <span className="text-[10px] text-edge-400">(Edge)</span>}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Total({ value, color, leading }: { value: number; color: string; leading: boolean }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 8, opacity: 0 }}
        className={cx("w-7 text-center font-display text-base font-bold", leading ? "" : "opacity-60")}
        style={{ color, textShadow: leading ? `0 0 12px ${color}` : undefined }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

export function RankBadge({ rank, dim = false }: { rank: MissionRank; dim?: boolean }) {
  const color = RANK_COLORS[rank];
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center font-display text-lg font-bold"
      style={{
        color: dim ? "#6d6d84" : "#07070b",
        background: dim ? "transparent" : `linear-gradient(135deg, ${color}, ${color}99)`,
        border: dim ? "1px dashed #4a4a63" : undefined,
        clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
      }}
    >
      {rank}
    </span>
  );
}
