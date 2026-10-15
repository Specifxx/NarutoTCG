"use client";

import { motion } from "framer-motion";
import { RankBadge } from "@/components/game/mission-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { CardCatalog, MissionOutcome, MissionState } from "@/lib/game/types";

/**
 * Mission summary chips (D → A). On small screens they jump to the lane in
 * the horizontally scrolling board.
 */
export function ProjectionStrip({
  missions,
  outcomes,
  revealed,
  focusId,
  onJump,
  scout,
  onToggleScout,
  oppHand,
  cards,
}: {
  missions: readonly MissionState[];
  outcomes: ReadonlyMap<string, MissionOutcome>;
  /** Mission ids already scored in the evaluation sequence (null outside evaluation). */
  revealed: ReadonlySet<string> | null;
  focusId: string | null;
  onJump: (missionId: string) => void;
  scout: boolean;
  onToggleScout: () => void;
  oppHand: readonly string[];
  cards: CardCatalog;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">The board</h2>
          <p className="text-[12.5px] text-ash-400">
            Missions score in rank order, D to A. Badges show who would win each one right now.
          </p>
        </div>
        <button
          type="button"
          aria-pressed={scout}
          onClick={onToggleScout}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-300",
            scout
              ? "border-energy-400/50 bg-energy-500/15 text-energy-200 shadow-[0_0_18px_-4px_rgba(56,196,255,0.6)]"
              : "border-white/10 bg-white/[0.04] text-ash-300 hover:border-white/20 hover:text-white",
          )}
          title="Byakugan: see the names of your opponent's hidden characters and the cards in their hand"
        >
          <Icon name={scout ? "eye" : "eye-off"} size={14} />
          Byakugan scout {scout ? "on" : "off"}
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Mission summary">
        {missions.map((m) => {
          const o = outcomes.get(m.def.id);
          if (!o) return null;
          const scored = revealed?.has(m.def.id) ?? false;
          const pending = revealed !== null && !scored;
          const win = o.winner === "you";
          const label = pending ? "Waiting" : o.winner ? (win ? "You" : "Opponent") : "Nobody";
          return (
            <li key={m.def.id}>
              <motion.button
                type="button"
                onClick={() => onJump(m.def.id)}
                animate={{ scale: focusId === m.def.id ? 1.04 : 1 }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-300",
                  focusId === m.def.id
                    ? "border-gold-300/70 bg-gold-400/10"
                    : pending
                      ? "border-white/[0.06] bg-white/[0.02] opacity-70"
                      : win
                        ? "border-leaf-400/30 bg-leaf-500/[0.06] hover:border-leaf-400/50"
                        : o.winner
                          ? "border-blood-400/30 bg-blood-500/[0.06] hover:border-blood-400/50"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20",
                )}
                aria-label={`${m.def.rank}-rank ${m.def.name}: ${scored ? "scored for" : pending ? "not scored yet" : "currently going to"} ${label}, ${o.power.you} to ${o.power.opp} Power. Show on board.`}
              >
                <RankBadge rank={m.def.rank} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-bold text-white">{m.def.name}</span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold tabular-nums">
                    <span className="text-energy-300">{o.power.you}</span>
                    <span className="text-ash-500">–</span>
                    <span className="text-blood-400">{o.power.opp}</span>
                    <span
                      className={cn(
                        "ml-auto flex items-center gap-0.5 truncate",
                        pending ? "text-ash-500" : win ? "text-leaf-300" : o.winner ? "text-blood-400" : "text-ash-400",
                      )}
                    >
                      {!pending && <Icon name={win ? "check" : o.winner ? "x" : "minus"} size={11} />}
                      {pending ? "…" : scored ? (o.winner ? `${label} +${o.points}` : "None") : label}
                    </span>
                  </span>
                </span>
              </motion.button>
            </li>
          );
        })}
      </ul>

      {scout && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-1.5 rounded-xl border border-energy-400/20 bg-energy-500/[0.06] px-3 py-2 text-[12px] text-energy-200"
        >
          <Icon name="eye" size={13} />
          <span className="font-bold">Opponent&apos;s hand:</span>
          {oppHand.length === 0 ? (
            <span className="text-ash-300">empty</span>
          ) : (
            oppHand.map((id, i) => (
              <span key={`${id}-${i}`} className="rounded-md bg-black/30 px-1.5 py-0.5 text-ash-100">
                {cards[id]?.name ?? id}
                <span className="text-ash-500"> · {cards[id]?.cost ?? "?"}</span>
              </span>
            ))
          )}
        </motion.p>
      )}
    </div>
  );
}
