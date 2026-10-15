"use client";

import { useId, useState } from "react";
import { ELEMENT_META, RARITY_META, TYPE_META } from "@/lib/cards/meta";
import type { SimCard } from "@/lib/cards/types";
import { cx } from "../ui/Button";
import { CardArt } from "./CardArt";
import { CardText } from "./CardText";

export type CardSize = "xs" | "sm" | "md" | "lg";

/** Card widths in px; everything inside is laid out in em (card = 12em wide, 5:7). */
export const CARD_WIDTH: Record<CardSize, number> = { xs: 52, sm: 74, md: 128, lg: 252 };

export function cardBox(size: CardSize) {
  const w = CARD_WIDTH[size];
  return { width: w, height: Math.round(w * 1.4), fontSize: w / 12 };
}

const FRAME: Partial<Record<SimCard["type"], string>> = {
  leader: "linear-gradient(135deg, #ffe7a3, #c98a1a 40%, #ffcf4a 70%, #8a5a00)",
  mission: "linear-gradient(135deg, #8a6a46, #3d2c1c 50%, #b48a58)",
};

export function CardFace({
  card,
  size = "md",
  className,
  glow,
}: {
  card: SimCard;
  size?: CardSize;
  className?: string;
  glow?: string;
}) {
  const meta = ELEMENT_META[card.element];
  const rarity = RARITY_META[card.rarity];
  const box = cardBox(size);
  const [imageFailed, setImageFailed] = useState(false);

  if (card.imageUrl && !imageFailed) {
    return (
      <div
        className={cx("relative shrink-0 select-none overflow-hidden bg-shadow-950", className)}
        style={{ ...box, borderRadius: "0.6em", boxShadow: glow ?? "0 0.6em 1.6em -0.8em rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static thumbnails, sized by the card box */}
        <img
          src={card.imageUrl}
          alt={card.title ? `${card.name} — ${card.title}` : card.name}
          loading="lazy"
          draggable={false}
          onError={() => setImageFailed(true)}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>
    );
  }
  const showText = size === "md" || size === "lg";
  const isUnit = card.type === "character";
  const hasCost = card.type !== "leader" && card.type !== "mission";

  return (
    <div
      className={cx("relative shrink-0 select-none overflow-hidden", className)}
      style={{
        ...box,
        borderRadius: "0.75em",
        padding: "0.14em",
        background: FRAME[card.type] ?? `linear-gradient(150deg, ${meta.color}, #1f1f2e 45%, ${meta.color}88)`,
        boxShadow: glow ?? `0 0.6em 1.6em -0.8em ${meta.glow}, 0 0 0 1px rgba(0,0,0,0.6)`,
      }}
    >
      <div className="relative h-full w-full overflow-hidden bg-shadow-950" style={{ borderRadius: "0.62em" }}>
        <div className="absolute inset-x-0 top-0" style={{ height: showText ? "58%" : size === "xs" ? "100%" : "74%" }}>
          <CardArt card={card} detail={size !== "xs"} />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-shadow-950 to-transparent" />
        </div>

        {hasCost && (
          <div
            className="absolute grid place-items-center rounded-full font-display font-bold text-shadow-950"
            style={{
              left: "0.45em",
              top: "0.45em",
              width: "2.3em",
              height: "2.3em",
              fontSize: size === "xs" ? "1.5em" : "1em",
              background: "radial-gradient(circle at 35% 30%, #ffd2a8, #ff7a1a 45%, #b03a00)",
              boxShadow: "0 0 0.8em rgba(255,122,26,0.7), inset 0 -0.15em 0.3em rgba(0,0,0,0.35)",
            }}
            title={`Cost ${card.cost}`}
          >
            <span style={{ fontSize: "1.25em" }}>{card.cost}</span>
          </div>
        )}

        {isUnit && (
          <div
            className="absolute grid place-items-center font-display font-bold text-ash-50"
            style={{
              right: "0.45em",
              top: "0.45em",
              width: "2.3em",
              height: "2.5em",
              fontSize: size === "xs" ? "1.5em" : "1em",
              clipPath: "polygon(50% 0, 100% 18%, 100% 70%, 50% 100%, 0 70%, 0 18%)",
              background: "linear-gradient(180deg, #3a3a52, #12121b)",
            }}
            title={`Power ${card.power}`}
          >
            <span style={{ fontSize: "1.25em" }}>{card.power}</span>
          </div>
        )}

        {card.type === "mission" && (
          <div
            className="absolute grid place-items-center rounded-md font-display font-bold text-shadow-950"
            style={{ right: "0.45em", top: "0.45em", padding: "0.2em 0.5em", background: "#ffcf4a", fontSize: size === "xs" ? "1.4em" : "0.9em" }}
          >
            {card.points} PTS
          </div>
        )}

        {size !== "xs" && (
          <div className="absolute inset-x-0" style={{ top: showText ? "50%" : "66%", padding: "0 0.6em" }}>
            <div
              className="rounded-md border border-white/10 bg-shadow-900/90 backdrop-blur-sm"
              style={{ padding: showText ? "0.35em 0.55em" : "0.25em 0.4em", boxShadow: `inset 0.2em 0 0 ${meta.color}` }}
            >
              <p className="truncate font-display font-bold leading-tight text-ash-50" style={{ fontSize: showText ? "1em" : "1.05em" }}>
                {card.name}
              </p>
              {showText && card.title && (
                <p className="truncate leading-tight text-ash-400" style={{ fontSize: "0.68em" }}>
                  {card.title}
                </p>
              )}
            </div>
          </div>
        )}

        {showText && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col" style={{ top: "67%", padding: "0.3em 0.6em 0.45em" }}>
            <div className="flex items-center gap-[0.35em] font-display uppercase tracking-wider text-ash-400" style={{ fontSize: "0.56em" }}>
              <span style={{ color: meta.color }}>{meta.kanji}</span>
              <span>{TYPE_META[card.type].label}</span>
              {card.village && <span className="truncate text-ash-500">· {card.village}</span>}
            </div>
            <div className="scroll-thin mt-[0.3em] min-h-0 flex-1 overflow-hidden">
              <CardText card={card} compact />
            </div>
          </div>
        )}

        {size !== "xs" && (
          <span
            className="absolute font-display font-bold"
            style={{ right: "0.55em", bottom: "0.4em", fontSize: "0.55em", color: rarity.color, textShadow: `0 0 0.6em ${rarity.color}` }}
            title={rarity.label}
          >
            ◆ {rarity.short}
          </span>
        )}
      </div>
    </div>
  );
}

export function CardBack({ size = "md", className, label }: { size?: CardSize; className?: string; label?: string }) {
  const box = cardBox(size);
  const gradientId = useId();
  return (
    <div
      className={cx("relative shrink-0 select-none overflow-hidden", className)}
      style={{
        ...box,
        borderRadius: "0.75em",
        padding: "0.14em",
        background: "linear-gradient(150deg, #7c4dff, #1f1f2e 45%, #ff7a1a)",
        boxShadow: "0 0.6em 1.4em -0.8em rgba(124,77,255,0.6), 0 0 0 1px rgba(0,0,0,0.6)",
      }}
      aria-label={label ?? "Face-down card"}
    >
      <div
        className="relative grid h-full w-full place-items-center overflow-hidden"
        style={{
          borderRadius: "0.62em",
          background: "radial-gradient(circle at 50% 45%, #1f1430, #0b0b12 70%), repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 0.3em, transparent 0.3em 0.6em)",
        }}
      >
        <svg viewBox="0 0 64 64" style={{ width: "62%", height: "62%" }} aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffa05c" />
              <stop offset="1" stopColor="#9a6bff" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.2" opacity="0.5" />
          <path
            d="M32 6c8 6 10 14 6 22 6-4 14-2 20 4-8 2-14 8-14 16-4-6-10-8-16-6 4-6 2-14-4-18 8 0 12-4 8-18z"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="32" r="4" fill={`url(#${gradientId})`} />
        </svg>
      </div>
    </div>
  );
}
