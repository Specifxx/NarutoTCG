"use client";

import { useState } from "react";
import { ELEMENT_META } from "@/lib/cards/meta";
import type { SimCard } from "@/lib/cards/types";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function initials(name: string): string {
  const parts = name.split(/[\s&-]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

/** Card artwork: the scraped image when present, otherwise deterministic element-themed art. */
export function CardArt({ card, detail = true }: { card: SimCard; detail?: boolean }) {
  const [failed, setFailed] = useState(false);
  const meta = ELEMENT_META[card.element];
  const h = hash(card.id);
  const angle = h % 360;
  const x = 20 + (h % 60);
  const y = 15 + ((h >> 8) % 50);

  if (card.imageUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote art from arbitrary scraped hosts
      <img
        src={card.imageUrl}
        alt=""
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: `radial-gradient(circle at ${x}% ${y}%, ${meta.glow}, transparent 62%), linear-gradient(${angle}deg, #0b0b12 10%, ${meta.color}22 55%, #07070b 100%)`,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 100 140" className="absolute inset-0 h-full w-full opacity-[0.22]" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke={meta.color} strokeWidth="0.6" transform={`rotate(${angle % 90} 50 70)`}>
          {[14, 24, 34, 44, 56].map((r) => (
            <circle key={r} cx="50" cy="62" r={r} strokeDasharray={`${(h % 7) + 2} ${(h % 5) + 3}`} />
          ))}
          <path d="M50 8 L50 116 M-4 62 L104 62" strokeOpacity="0.5" />
        </g>
      </svg>
      <span
        className="absolute inset-0 grid place-items-center font-black leading-none"
        style={{ color: meta.color, opacity: 0.2, fontSize: detail ? "7em" : "4em", transform: `rotate(${(h % 21) - 10}deg)` }}
      >
        {meta.kanji}
      </span>
      {detail && (
        <span
          className="absolute inset-0 grid place-items-center font-display text-[2.6em] font-bold tracking-tight"
          style={{ color: "#f4f4f8", textShadow: `0 0 18px ${meta.glow}, 0 2px 0 rgba(0,0,0,0.6)` }}
        >
          {initials(card.name)}
        </span>
      )}
    </div>
  );
}
