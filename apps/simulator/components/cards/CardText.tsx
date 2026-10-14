"use client";

import { Cpu, Hand } from "lucide-react";
import type { SimCard } from "@/lib/cards/types";
import { getAbilities } from "@/lib/game-engine/abilities";

const LABEL_COLORS: Record<string, string> = {
  MAIN: "bg-chakra-500/20 text-chakra-300",
  AMBUSH: "bg-yin-500/20 text-yin-400",
  UPGRADE: "bg-jade-400/15 text-jade-400",
  SCORE: "bg-edge-400/15 text-edge-400",
  CONTINUOUS: "bg-sky-400/15 text-sky-300",
  EQUIP: "bg-sky-400/15 text-sky-300",
  CHAKRA: "bg-chakra-500/20 text-chakra-300",
  TECHNIQUE: "bg-edge-400/15 text-edge-400",
  TEXT: "bg-white/10 text-ash-300",
};

function body(line: string, label: string): string {
  if (label === "TEXT" || label === "CHAKRA") return line;
  return line.replace(/^[A-Za-z]+\s*(\[\d+\])?\s*(?::|↯|-)\s*/, "");
}

function emphasize(text: string) {
  return text.split(/(POWERUP \d+|Edge token|AMBUSH|Defeat|-\d+ Power|\+\d+ Power)/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-ash-50">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

/** Ability text with trigger labels; lines the engine cannot automate are flagged. */
export function CardText({ card, compact = false, showAutomation = false }: { card: SimCard; compact?: boolean; showAutomation?: boolean }) {
  const { lines } = getAbilities(card);
  if (!lines.length) {
    return <p className={`italic text-ash-500 ${compact ? "text-[0.62em]" : "text-xs"}`}>{card.flavor ?? "No abilities."}</p>;
  }
  return (
    <ul className={compact ? "space-y-[0.3em] text-[0.62em] leading-snug" : "space-y-1.5 text-xs leading-relaxed"}>
      {lines.map((l, i) => {
        const technique = l.label === "TECHNIQUE" ? l.text.match(/\[(\d+)\]/)?.[1] : null;
        return (
          <li key={i} className="text-ash-200">
            <span className={`mr-1.5 inline-block rounded px-1 py-px font-display text-[0.85em] font-bold tracking-wider ${LABEL_COLORS[l.label]}`}>
              {l.label === "CHAKRA" ? l.text.toUpperCase() : technique ? `TECHNIQUE · ${technique}` : l.label}
            </span>
            {l.label !== "CHAKRA" && emphasize(body(l.text, l.label))}
            {showAutomation && (
              <span
                className={`ml-1.5 inline-flex translate-y-[1px] items-center gap-0.5 text-[0.85em] ${l.automated ? "text-jade-400/80" : "text-edge-400"}`}
                title={l.automated ? "Resolved automatically by the engine" : "Not automated — this line has no effect in the simulator"}
              >
                {l.automated ? <Cpu className="h-3 w-3" /> : <Hand className="h-3 w-3" />}
                {!l.automated && "manual"}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
