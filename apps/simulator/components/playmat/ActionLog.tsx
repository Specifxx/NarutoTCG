"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpCircle,
  Crown,
  EyeOff,
  Flag,
  Hand,
  Layers,
  type LucideIcon,
  Plus,
  Scroll,
  ScrollText,
  Shuffle,
  Skull,
  Sparkles,
  Sword,
  Swords,
  Trophy,
  Zap,
  Coins,
  Gem,
  Info,
  Medal,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "@/lib/game-engine/store";
import type { LogEntry, LogKind } from "@/lib/game-engine/types";
import { Chip } from "../ui/Chip";
import { useBoardUi } from "./boardUi";
import { PLAYER_COLORS } from "./MissionLane";

const ICONS: Record<LogKind, LucideIcon> = {
  system: Info,
  phase: ScrollText,
  play: Sword,
  hidden: EyeOff,
  reveal: Sparkles,
  evolve: ArrowUpCircle,
  jutsu: Scroll,
  item: Gem,
  technique: Crown,
  token: Plus,
  draw: Layers,
  chakra: Coins,
  pass: Flag,
  edge: Medal,
  mission: Swords,
  score: Trophy,
  effect: Zap,
  defeat: Skull,
  mulligan: Shuffle,
  gameover: Hand,
};

type Filter = "all" | "plays" | "effects" | "flow";
const FILTERS: Record<Filter, { label: string; kinds: LogKind[] | null }> = {
  all: { label: "All", kinds: null },
  plays: { label: "Plays", kinds: ["play", "hidden", "reveal", "evolve", "jutsu", "item", "technique", "pass", "mulligan"] },
  effects: { label: "Effects", kinds: ["effect", "token", "defeat", "draw", "edge", "chakra"] },
  flow: { label: "Phases & Score", kinds: ["phase", "mission", "score", "gameover", "system"] },
};

const NO_LOG: LogEntry[] = [];

export function ActionLog() {
  const log = useGameStore((s) => s.game?.log ?? NO_LOG);
  const setInspect = useBoardUi((s) => s.setInspect);
  const [filter, setFilter] = useState<Filter>("all");
  const scroller = useRef<HTMLDivElement>(null);
  const entries = useMemo(() => {
    const kinds = FILTERS[filter].kinds;
    return (kinds ? log.filter((l) => kinds.includes(l.kind)) : log).slice(-200);
  }, [log, filter]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="panel flex min-h-0 flex-col p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="panel-title">Action log</span>
        <span className="text-[10px] text-ash-500">{log.length} events</span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {(Object.keys(FILTERS) as Filter[]).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {FILTERS[f].label}
          </Chip>
        ))}
      </div>
      <div ref={scroller} className="scroll-thin h-72 overflow-y-auto pr-1 xl:h-[min(46vh,520px)]" role="log" aria-live="polite">
        <ul className="space-y-0.5">
          <AnimatePresence initial={false}>
            {entries.map((e) => (
              <Row key={e.id} entry={e} onHover={() => e.cardId && setInspect({ cardId: e.cardId, instanceId: null })} />
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

function Row({ entry, onHover }: { entry: LogEntry; onHover: () => void }) {
  const Icon = ICONS[entry.kind];
  const color = entry.player === null ? undefined : PLAYER_COLORS[entry.player];
  const banner = entry.kind === "phase" || entry.kind === "gameover";
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, x: 16, backgroundColor: "rgba(255,122,26,0.18)" }}
      animate={{ opacity: 1, x: 0, backgroundColor: "rgba(255,122,26,0)" }}
      transition={{ duration: 0.35 }}
      onPointerEnter={onHover}
      className={`flex gap-2 rounded-md px-1.5 py-1 text-[11.5px] leading-snug ${banner ? "mt-1.5 border-t border-white/5 pt-1.5" : ""} ${entry.cardId ? "cursor-help" : ""}`}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: color ?? (entry.kind === "score" ? "#ffcf4a" : "#8d8da3") }} aria-hidden />
      <span className={banner ? "font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-ash-300" : entry.kind === "score" ? "text-ash-50" : "text-ash-300"}>
        <span className="mr-1 font-display text-[9px] text-ash-500">R{entry.round}</span>
        {entry.text}
      </span>
    </motion.li>
  );
}
