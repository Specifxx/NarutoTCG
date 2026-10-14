import { formatPct, formatUsd } from "@/lib/market/format";

const WIDTH = 96;
const HEIGHT = 28;
const PAD = 2;

/**
 * Static 30-day trend line (server-rendered SVG). Color encodes direction
 * first-to-last; the accessible label states it in words.
 */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) {
    return (
      <span className={`inline-block text-xs text-ash-400 ${className ?? ""}`} style={{ width: WIDTH }}>
        —
      </span>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (WIDTH - PAD * 2) / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = PAD + i * step;
      const y = max === min ? HEIGHT / 2 : PAD + (1 - (v - min) / span) * (HEIGHT - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const first = values[0]!;
  const last = values[values.length - 1]!;
  const pct = first > 0 ? ((last - first) / first) * 100 : 0;
  const rounded = Math.round(pct * 10) / 10;
  const stroke = rounded > 0 ? "var(--color-leaf-400)" : rounded < 0 ? "var(--color-blood-400)" : "var(--color-ash-400)";
  return (
    <svg
      role="img"
      aria-label={`30-day trend ${formatPct(pct)}, from ${formatUsd(first)} to ${formatUsd(last)}`}
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={className}
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
