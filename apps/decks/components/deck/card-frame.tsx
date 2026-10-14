import type { NarutoCard } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import { CARD_TYPE_FRAME, CARD_TYPE_LABEL, RARITY_MARK, villageStyle } from "./card-style";

export type CardFrameSize = "sm" | "md" | "lg";

const SIZES: Record<
  CardFrameSize,
  { root: string; gem: string; qty: string; name: string; epithet: string; type: string; glyph: string; foot: string; text: string }
> = {
  sm: {
    root: "gap-0.5 rounded-lg border p-1",
    gem: "h-5 w-5 text-[11px]",
    qty: "px-1 text-[10px]",
    name: "text-[10px]",
    epithet: "text-[9px]",
    type: "text-[8px]",
    glyph: "text-3xl",
    foot: "text-[9px]",
    text: "hidden",
  },
  md: {
    root: "gap-1 rounded-xl border-2 p-1.5",
    gem: "h-7 w-7 text-sm",
    qty: "px-1.5 text-xs",
    name: "text-xs",
    epithet: "text-[10px]",
    type: "text-[10px]",
    glyph: "text-5xl",
    foot: "text-[10px]",
    text: "hidden",
  },
  lg: {
    root: "gap-2 rounded-2xl border-2 p-3",
    gem: "h-10 w-10 text-lg",
    qty: "px-2 text-sm",
    name: "text-lg",
    epithet: "text-sm",
    type: "text-xs",
    glyph: "text-8xl",
    foot: "text-xs",
    text: "line-clamp-5 text-xs leading-snug text-ash-200",
  },
};

/** "Kakashi Hatake — Copy Ninja" → ["Kakashi Hatake", "Copy Ninja"]. */
export function splitCardName(name: string): [string, string | null] {
  const index = name.indexOf(" — ");
  return index > 0 ? [name.slice(0, index), name.slice(index + 3)] : [name, null];
}

/**
 * CSS-only card face (no art exists): type-keyed gradient, village accent and watermark, cost
 * gem, power, rarity and quantity. Purely visual, so it is hidden from assistive tech; the
 * parent supplies the accessible name and the full card text.
 */
export function CardFrame({
  card,
  quantity,
  size = "md",
  className,
}: {
  card: NarutoCard;
  quantity?: number;
  size?: CardFrameSize;
  className?: string;
}) {
  const s = SIZES[size];
  const frame = CARD_TYPE_FRAME[card.type];
  const village = villageStyle(card.village);
  const rarity = RARITY_MARK[card.rarity];
  const [title, epithet] = splitCardName(card.name);
  const traits = card.traits ?? [];

  return (
    <div
      aria-hidden="true"
      className={cx("relative isolate flex aspect-[63/88] w-full flex-col overflow-hidden text-left shadow-lg shadow-black/40", s.root, className)}
      style={{ background: frame.background, borderColor: frame.border }}
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: village.accent }} />
      <div className="flex items-start justify-between gap-1">
        {card.cost !== undefined ? (
          <span
            className={cx("grid shrink-0 place-items-center rounded-full font-black text-shadow-950 ring-1 ring-black/50", s.gem)}
            style={{ background: "radial-gradient(circle at 32% 30%, #ffd2ad 0%, #ff9a52 38%, #c44700 100%)" }}
          >
            {card.cost}
          </span>
        ) : (
          <span className={cx("rounded-sm bg-shadow-950/70 font-bold uppercase tracking-wider text-chakra-300", s.foot, size === "sm" ? "px-0.5" : "px-1")}>
            {CARD_TYPE_LABEL[card.type]}
          </span>
        )}
        {quantity !== undefined && (
          <span className={cx("rounded-md bg-shadow-950/85 font-bold tabular-nums text-white ring-1 ring-white/10", s.qty)}>×{quantity}</span>
        )}
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md border border-white/5"
        style={{ background: `radial-gradient(circle at 50% 42%, ${village.accent}38 0%, transparent 68%)` }}
      >
        <span className={cx("select-none font-black leading-none opacity-30", s.glyph)} style={{ color: village.accent }}>
          {village.glyph}
        </span>
      </div>

      <div className="min-w-0">
        <p className={cx("line-clamp-2 font-bold leading-tight text-white", s.name)}>{title}</p>
        {epithet && <p className={cx("truncate font-medium text-ash-300", s.epithet)}>{epithet}</p>}
        <p className={cx("truncate text-ash-400", s.type)}>
          {CARD_TYPE_LABEL[card.type]}
          {traits.length > 0 && ` · ${traits.join(" · ")}`}
        </p>
      </div>
      {card.text && <p className={s.text}>{card.text}</p>}

      <div className={cx("flex items-center justify-between gap-1", s.foot)}>
        <span className={cx("rounded-sm border px-1 font-bold leading-tight", rarity.className)}>{rarity.short}</span>
        {card.power !== undefined ? (
          <span className="font-black tabular-nums text-white">{card.power}</span>
        ) : (
          <span className="truncate text-ash-500">{card.id}</span>
        )}
      </div>
    </div>
  );
}

/** Placeholder face for ids missing from the card pool (possible in imported lists). */
export function UnknownCardFrame({ cardId, quantity, size = "md" }: { cardId: string; quantity?: number; size?: CardFrameSize }) {
  const s = SIZES[size];
  return (
    <div
      aria-hidden="true"
      className={cx("flex aspect-[63/88] w-full flex-col items-center justify-center gap-1 border-dashed border-shadow-500 bg-shadow-800 text-center", s.root)}
    >
      {quantity !== undefined && <span className={cx("font-bold text-white", s.qty)}>×{quantity}</span>}
      <span className={cx("font-semibold text-ash-300", s.name)}>Unknown card</span>
      <span className={cx("break-all text-ash-500", s.type)}>{cardId}</span>
    </div>
  );
}
