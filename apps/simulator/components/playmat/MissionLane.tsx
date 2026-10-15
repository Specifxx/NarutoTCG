"use client";

import { AnimatePresence, motion } from "framer-motion";
import { EyeOff, Trophy } from "lucide-react";
import { FORMAT, MISSION_RANKS, RANK_BONUS, type MissionRank } from "@/lib/game-engine/format";
import { missionTotals, projectedWinner } from "@/lib/game-engine/power";
import { useGameStore } from "@/lib/game-engine/store";
import type { EngineContext, GameState, PlayerId } from "@/lib/game-engine/types";
import { CardText } from "../cards/CardText";
import { cx } from "../ui/Button";
import { BoardCard } from "./BoardCard";
import { actorOf, legalCharacters, legalMissions, useBoardUi, type Intent } from "./boardUi";
import { actionFor, dropReason, zoneKey, type Zone } from "./dropZones";
import { useBoardActions } from "./useBoardActions";

export const RANK_COLORS: Record<MissionRank, string> = { D: "#5fd0a0", C: "#4aa8ff", B: "#c27bff", A: "#ffcf4a" };
export const PLAYER_COLORS: [string, string] = ["#3987e5", "#d95926"];

/** The hand card being placed: dragged, or selected with a click. */
function placingCard(intent: Intent, dragging: string | null): string | null {
  if (dragging) return dragging;
  if (intent.kind === "card" || intent.kind === "play" || intent.kind === "jutsu" || intent.kind === "item" || intent.kind === "evolve") return intent.handId;
  return null;
}

/** One mission as a vertical column: enemy hidden row, enemy characters, mission, your characters, your hidden row. */
export function MissionLane({ index }: { index: number }) {
  const game = useGameStore((s) => s.game)!;
  const ctx = useGameStore((s) => s.ctx)!;
  const intent = useBoardUi((s) => s.intent);
  const mission = game.missions[index];
  const actor = actorOf(game);
  const rank = MISSION_RANKS[index];
  const missionTarget = actor !== null && (intent.kind === "technique" || intent.kind === "jutsu") && legalMissions(game, ctx, actor, intent).includes(index);

  if (!mission.revealed) {
    return (
      <div className="panel flex h-full w-[132px] shrink-0 snap-start flex-col items-center justify-center gap-3 p-3 text-center opacity-70">
        <RankBadge rank={rank} dim />
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-ash-400">Mission {rank}</p>
        <p className="text-[11px] leading-snug text-ash-500">Revealed in round {index + 1}</p>
      </div>
    );
  }

  return (
    <div
      className="panel scroll-thin flex h-full min-w-[250px] flex-1 basis-[300px] snap-start flex-col gap-1 overflow-y-auto p-1.5"
      style={{ boxShadow: missionTarget ? `0 0 0 1px ${RANK_COLORS[rank]}, 0 0 28px -8px ${RANK_COLORS[rank]}` : undefined }}
      aria-label={`Mission ${rank}`}
    >
      <HiddenRow game={game} ctx={ctx} index={index} player={1} actor={actor} />
      <FaceUpArea game={game} ctx={ctx} index={index} player={1} actor={actor} />
      <MissionBanner game={game} ctx={ctx} index={index} clickable={missionTarget} />
      <FaceUpArea game={game} ctx={ctx} index={index} player={0} actor={actor} />
      <HiddenRow game={game} ctx={ctx} index={index} player={0} actor={actor} />
    </div>
  );
}

interface SideProps {
  game: GameState;
  ctx: EngineContext;
  index: number;
  player: PlayerId;
  actor: PlayerId | null;
}

/** Drop-zone state for this side's face-up or hidden area. */
function useZone({ game, ctx, index, player, actor }: SideProps, hidden: boolean) {
  const intent = useBoardUi((s) => s.intent);
  const dragging = useBoardUi((s) => s.dragging);
  const hoverZone = useBoardUi((s) => s.hoverZone);
  const { perform } = useBoardActions();
  const zone: Zone = { kind: "mission", index, hidden };
  const mine = actor === player;
  const handId = mine ? placingCard(intent, dragging) : null;
  const intentMismatch = intent.kind === "play" && !dragging && intent.hidden !== hidden;
  const reason = handId && !intentMismatch ? dropReason(game, ctx, player, handId, zone) : null;
  const active = !!handId && !intentMismatch;
  const legal = active && reason === null;
  const hovered = hoverZone === zoneKey(zone);

  const onClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest("button")) return;
    if (!handId || !legal) return;
    const action = actionFor(game, ctx, player, handId, zone);
    if (action) perform(action);
  };

  return { zoneAttr: mine ? zoneKey(zone) : undefined, active, legal, hovered, reason, onClick };
}

function useCardRenderer({ game, ctx, player, actor }: SideProps) {
  const intent = useBoardUi((s) => s.intent);
  const dragging = useBoardUi((s) => s.dragging);
  const hoverZone = useBoardUi((s) => s.hoverZone);
  const setIntent = useBoardUi((s) => s.setIntent);
  const setInspect = useBoardUi((s) => s.setInspect);
  const { chooseCharacter } = useBoardActions();
  const ownerVisible = game.players[player].controller === "human";
  const mine = actor === player;
  const intentTargets = actor !== null ? legalCharacters(game, ctx, actor, intent) : [];
  const dragId = mine ? placingCard(intent, dragging) : null;
  const targeting = intent.kind === "evolve" || intent.kind === "item" || intent.kind === "token";

  const onCardClick = (id: string) => {
    if (chooseCharacter(id)) return;
    const inst = game.instances[id];
    setInspect({ cardId: inst.cardId, instanceId: id });
    if (actor === null || inst.owner !== actor) return;
    setIntent(inst.faceDown ? { kind: "reveal", instanceId: id } : { kind: "unit", instanceId: id });
  };

  return (id: string, size: "xs" | "sm", passThrough = false) => {
    const inst = game.instances[id];
    const charZone: Zone = { kind: "char", id };
    const dropTarget = mine && !inst.faceDown;
    const dragLegal = !!dragging && dropTarget && dragId !== null && dropReason(game, ctx, player, dragId, charZone) === null;
    return (
      <BoardCard
        key={id}
        game={game}
        ctx={ctx}
        id={id}
        size={size}
        ownerVisible={ownerVisible}
        zone={dropTarget ? zoneKey(charZone) : undefined}
        targetable={intentTargets.includes(id) || dragLegal}
        hovered={hoverZone === zoneKey(charZone) && dragLegal}
        passThrough={passThrough}
        dimmed={targeting && mine && !intentTargets.includes(id)}
        onClick={() => onCardClick(id)}
        onHover={(h) => h && setInspect({ cardId: ownerVisible || !inst.faceDown ? inst.cardId : null, instanceId: id })}
      />
    );
  };
}

function FaceUpArea(props: SideProps) {
  const { game, index, player, actor } = props;
  const z = useZone(props, false);
  const render = useCardRenderer(props);
  const ids = game.missions[index].characters[player].filter((id) => !game.instances[id].faceDown);
  const mine = actor === player;

  return (
    <div
      data-zone={z.zoneAttr}
      onClick={z.onClick}
      className={cx(
        "scroll-thin relative flex min-h-[112px] flex-1 flex-wrap content-center items-center justify-center gap-x-2 gap-y-3 overflow-y-auto rounded-lg border px-1 py-2 transition-all duration-150",
        z.active && z.legal && !z.hovered && "cursor-pointer border-dashed border-chakra-400/70 bg-chakra-500/[0.06]",
        z.active && z.legal && z.hovered && "border-solid border-chakra-300 bg-chakra-500/15 shadow-[inset_0_0_30px_rgba(255,122,26,0.25)]",
        z.active && !z.legal && z.hovered && "border-blood-500/70 bg-blood-500/10",
        (!z.active || (!z.legal && !z.hovered)) && "border-transparent",
      )}
      aria-label={`${game.players[player].name} face-up characters in Mission ${MISSION_RANKS[index]}`}
    >
      {ids.map((id) => render(id, "sm"))}
      {ids.length === 0 && mine && (
        <span className="pointer-events-none font-display text-[10px] uppercase tracking-[0.2em] text-ash-500/70">
          {z.active && z.legal ? "Drop to play face-up" : "Face-up"}
        </span>
      )}
      {z.active && z.hovered && !z.legal && z.reason && (
        <span className="pointer-events-none absolute inset-x-1 bottom-1 rounded bg-shadow-950/90 px-1.5 py-0.5 text-center text-[10px] text-blood-400">{z.reason}</span>
      )}
    </div>
  );
}

function HiddenRow(props: SideProps) {
  const { game, index, player, actor } = props;
  const z = useZone(props, true);
  const render = useCardRenderer(props);
  const ids = game.missions[index].characters[player].filter((id) => game.instances[id].faceDown);
  const mine = actor === player;

  return (
    <div
      data-zone={z.zoneAttr}
      onClick={z.onClick}
      title="Hidden — face-down characters: 1 Chakra, 0 Power, revealed later for their full cost (AMBUSH)"
      className={cx(
        "scroll-thin relative flex min-h-[86px] shrink-0 items-center gap-1.5 overflow-x-auto rounded-lg border border-dashed px-2 py-1.5 transition-all duration-150",
        z.active && z.legal && !z.hovered && "cursor-pointer border-yin-400/90 bg-yin-500/15",
        z.active && z.legal && z.hovered && "border-solid border-yin-400 bg-yin-500/25 shadow-[inset_0_0_30px_rgba(154,107,255,0.35)]",
        z.active && !z.legal && z.hovered && "border-blood-500/70 bg-blood-500/10",
        (!z.active || (!z.legal && !z.hovered)) && "border-yin-400/20 bg-yin-500/[0.03]",
      )}
      aria-label={`${game.players[player].name} hidden characters in Mission ${MISSION_RANKS[index]}`}
    >
      <span className="pointer-events-none flex shrink-0 flex-col items-center gap-0.5 font-display text-[9px] font-semibold uppercase tracking-[0.16em] text-yin-400/80">
        <EyeOff className="h-3.5 w-3.5" />
        {ids.length > 0 ? ids.length : mine ? `${FORMAT.hiddenCost}◉` : ""}
      </span>
      {ids.map((id) => render(id, "xs", z.active))}
      {ids.length === 0 && mine && (
        <span className="pointer-events-none font-display text-[10px] uppercase tracking-[0.2em] text-yin-400/60">
          {z.active && z.legal ? "Drop to hide" : "Hidden"}
        </span>
      )}
      {z.active && z.hovered && !z.legal && z.reason && (
        <span className="pointer-events-none absolute inset-x-1 bottom-1 rounded bg-shadow-950/90 px-1.5 py-0.5 text-center text-[10px] text-blood-400">{z.reason}</span>
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
        "relative shrink-0 overflow-hidden rounded-lg border bg-gradient-to-r from-shadow-950 via-shadow-850 to-shadow-950 px-3 py-2 text-left",
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
        <div className="mt-1.5 line-clamp-2 text-[10px]" title={card.text}>
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
