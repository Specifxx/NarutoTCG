import type { MarketCard } from "@/lib/market/types";

const SIZES = {
  xs: { box: "w-8", initials: "text-[10px]", meta: "hidden" },
  sm: { box: "w-12", initials: "text-sm", meta: "hidden" },
  md: { box: "w-20", initials: "text-xl", meta: "text-[8px]" },
  lg: { box: "w-full max-w-[280px]", initials: "text-6xl", meta: "text-xs" },
} as const;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/**
 * Card image, or a deterministic stand-in (5:7 card frame, character initials,
 * hue keyed to the character) when no image is available. Foil finishes get a sheen;
 * parallels a gold frame.
 */
export function CardArt({ card, size = "sm", className }: { card: MarketCard; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  const frame = card.rarity === "parallel" ? "ring-2 ring-amber-400/70" : "ring-1 ring-white/10";
  if (card.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote vendor images, sizes unknown
      <img
        src={card.imageUrl}
        alt={`${card.name} (${card.setCode} ${card.number})`}
        loading="lazy"
        className={`${s.box} aspect-[5/7] shrink-0 rounded-md object-cover ${frame} ${className ?? ""}`}
      />
    );
  }
  const hue = hash(card.character) % 360;
  const foil = card.finish !== "non-foil";
  return (
    <div
      role="img"
      aria-label={`${card.name} card art placeholder`}
      className={`${s.box} relative aspect-[5/7] shrink-0 overflow-hidden rounded-md ${frame} ${className ?? ""}`}
      style={{
        background: `linear-gradient(155deg, hsl(${hue} 55% 34%), hsl(${(hue + 40) % 360} 50% 14%) 70%)`,
      }}
    >
      {foil && (
        <div
          aria-hidden
          className="absolute inset-0 mix-blend-screen"
          style={{
            background:
              card.finish === "textured-foil"
                ? "repeating-linear-gradient(135deg, rgba(255,255,255,0.10) 0 2px, transparent 2px 6px), linear-gradient(120deg, transparent 20%, rgba(255,214,140,0.35) 45%, rgba(140,200,255,0.30) 55%, transparent 80%)"
                : "linear-gradient(120deg, transparent 25%, rgba(255,255,255,0.28) 45%, rgba(160,210,255,0.22) 55%, transparent 75%)",
          }}
        />
      )}
      <div aria-hidden className="absolute inset-0 flex items-center justify-center">
        <span className={`font-black tracking-tight text-white/85 drop-shadow ${s.initials}`}>{initials(card.character)}</span>
      </div>
      <div
        aria-hidden
        className={`absolute inset-x-0 bottom-0 flex justify-between bg-black/45 px-1.5 py-0.5 font-semibold text-white/80 ${s.meta}`}
      >
        <span>{card.setCode}</span>
        <span>{card.number}</span>
      </div>
    </div>
  );
}
