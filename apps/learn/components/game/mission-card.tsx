import { Emblem } from "@/components/ui/emblem";
import { cn } from "@/lib/cn";
import { RANK_BONUS, type MissionDef, type Rank } from "@/lib/game/types";

export const RANK_STYLES: Record<Rank, { badge: string; text: string; ring: string; label: string }> = {
  D: { badge: "from-leaf-300 to-leaf-600", text: "text-leaf-300", ring: "ring-leaf-400/50", label: "Round 1" },
  C: { badge: "from-energy-300 to-energy-600", text: "text-energy-300", ring: "ring-energy-400/50", label: "Round 2" },
  B: { badge: "from-mist-300 to-mist-600", text: "text-mist-300", ring: "ring-mist-400/50", label: "Round 3" },
  A: { badge: "from-gold-200 to-blood-500", text: "text-gold-300", ring: "ring-gold-400/50", label: "Round 4" },
};

/** Hexagonal rank medallion (D / C / B / A). */
export function RankBadge({ rank, size = 36, className }: { rank: Rank; size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center bg-gradient-to-br font-black text-shadow-950", RANK_STYLES[rank].badge, className)}
      style={{ width: size, height: size, fontSize: size * 0.46, clipPath: "polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)" }}
      aria-label={`${rank}-rank`}
    >
      {rank}
    </span>
  );
}

/** Horizontal mission card: rank, name and the points it awards. */
export function MissionCard({
  mission,
  compact,
  className,
  highlight,
}: {
  mission: MissionDef;
  compact?: boolean;
  className?: string;
  highlight?: boolean;
}) {
  const total = mission.basePoints + RANK_BONUS[mission.rank];
  const style = RANK_STYLES[mission.rank];
  return (
    <div
      className={cn(
        "relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-shadow-800 to-shadow-900 ring-1",
        style.ring,
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
        highlight && "shadow-[0_0_28px_-4px_rgba(245,197,66,0.55)]",
        className,
      )}
    >
      <span className="pointer-events-none absolute -right-3 -top-3 text-white/[0.04]">
        <Emblem name="scroll" size={compact ? 52 : 72} />
      </span>
      <RankBadge rank={mission.rank} size={compact ? 28 : 36} />
      <div className="relative min-w-0 flex-1">
        <p className={cn("truncate font-bold text-white", compact ? "text-[12px]" : "text-sm")}>{mission.name}</p>
        <p className={cn("text-ash-400", compact ? "text-[10px]" : "text-[11.5px]")}>
          <span className="font-semibold text-ash-200">{mission.basePoints}</span> base +{" "}
          <span className={cn("font-semibold", style.text)}>{RANK_BONUS[mission.rank]}</span> rank ={" "}
          <span className="font-black text-gold-300">{total} pts</span>
        </p>
        {mission.scoreEffect && !compact && (
          <p className="mt-0.5 text-[11px] text-leaf-300">
            <span className="mr-1 rounded-sm bg-leaf-500 px-1 text-[10px] font-black text-shadow-950">SCORE</span>
            {mission.scoreEffect.text}
          </p>
        )}
      </div>
    </div>
  );
}
