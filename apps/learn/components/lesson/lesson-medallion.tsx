import { Emblem } from "@/components/ui/emblem";
import type { Accent } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { EmblemName } from "@/lib/game/types";
import { HEX_CLIP } from "./types";

type MedallionSize = "sm" | "md" | "lg" | "xl" | "path";

const SIZES: Record<MedallionSize, { box: string; badge: string }> = {
  sm: { box: "h-10 w-10", badge: "h-4 w-4 text-[9px] border" },
  md: { box: "h-16 w-16", badge: "h-6 w-6 text-[11px] border-2" },
  lg: { box: "h-24 w-24", badge: "h-8 w-8 text-sm border-2" },
  xl: { box: "h-24 w-24 sm:h-28 sm:w-28", badge: "h-8 w-8 text-sm border-2 sm:h-9 sm:w-9 sm:text-base" },
  path: {
    box: "h-16 w-16 lg:h-24 lg:w-24",
    badge: "h-6 w-6 text-[11px] border-2 lg:h-8 lg:w-8 lg:text-sm",
  },
};

/**
 * Hexagonal lesson medallion: accent-gradient rim, dark core with a soft
 * accent bloom, the lesson emblem and an order badge. Purely presentational
 * (no hooks), so it renders on the server too.
 */
export function LessonMedallion({
  emblem,
  accent,
  order,
  size = "md",
  glow = false,
  mastered = false,
  className,
  label,
}: {
  emblem: EmblemName;
  accent: Accent;
  order?: number;
  size?: MedallionSize;
  /** Pulsing halo, used for "Next up". */
  glow?: boolean;
  /** Gold orbit ring. */
  mastered?: boolean;
  className?: string;
  /** Accessible label; omit when the surrounding text already names the lesson. */
  label?: string;
}) {
  const a = ACCENT_STYLES[accent];
  const s = SIZES[size];
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", s.box, className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {glow && (
        <span
          className="absolute -inset-4 animate-pulse-glow rounded-full"
          style={{ background: `radial-gradient(circle, ${a.hex[1]}aa 0%, ${a.hex[1]}33 45%, transparent 70%)` }}
        />
      )}
      {mastered && (
        <svg viewBox="0 0 100 100" className="absolute -inset-[14%] h-[128%] w-[128%] animate-spin-slow" aria-hidden="true">
          <circle cx="50" cy="50" r="47" fill="none" stroke="#f5c542" strokeOpacity="0.75" strokeWidth="1.6" strokeDasharray="2 6" strokeLinecap="round" />
          <circle cx="50" cy="3" r="2.6" fill="#fdeaa8" />
        </svg>
      )}
      <span className={cn("absolute inset-0 bg-gradient-to-br", a.gradient)} style={{ clipPath: HEX_CLIP }} />
      <span className="absolute inset-[3px] bg-shadow-900" style={{ clipPath: HEX_CLIP }} />
      <span
        className="absolute inset-[3px]"
        style={{
          clipPath: HEX_CLIP,
          background: `radial-gradient(circle at 50% 30%, ${a.hex[1]}66 0%, ${a.hex[2]}22 45%, transparent 72%)`,
        }}
      />
      <span className="absolute inset-x-[22%] top-[9%] h-[22%] rounded-full bg-white/15 blur-md" />
      <Emblem
        name={emblem}
        size="44%"
        className={cn("relative drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]", a.text)}
      />
      {order !== undefined && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border-shadow-950 font-black tabular-nums shadow-lg",
            s.badge,
            a.solidBg,
          )}
        >
          {order}
        </span>
      )}
    </span>
  );
}
