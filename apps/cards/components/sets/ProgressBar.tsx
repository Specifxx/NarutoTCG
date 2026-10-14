// Accessible progress meter usable from both server and client components.

const TONES = {
  chakra: "bg-gradient-to-r from-chakra-600 via-chakra-500 to-chakra-400",
  owned: "bg-gradient-to-r from-emerald-600 to-emerald-400",
  muted: "bg-ash-400",
} as const;

export type ProgressTone = keyof typeof TONES;

export function ProgressBar({
  value,
  max,
  label,
  valueText,
  tone = "chakra",
  size = "md",
  className = "",
}: {
  value: number;
  max: number;
  /** Accessible name, e.g. "Shadows of the Akatsuki reveal progress". */
  label: string;
  /** Spoken value, e.g. "24 of 60 cards revealed". */
  valueText: string;
  tone?: ProgressTone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const safeMax = Math.max(0, max);
  const clamped = Math.min(Math.max(0, value), safeMax);
  const percent = safeMax > 0 ? (clamped / safeMax) * 100 : 0;
  const height = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clamped}
      aria-valuetext={valueText}
      className={`relative w-full overflow-hidden rounded-full bg-shadow-700/80 ring-1 ring-inset ring-white/5 ${height} ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${TONES[tone]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** Whole-number percentage, never showing 100% until the last item is done. */
export function percentLabel(value: number, max: number): string {
  if (max <= 0) return "0%";
  const percent = (value / max) * 100;
  if (value >= max) return "100%";
  return `${Math.min(99, Math.floor(percent))}%`;
}
