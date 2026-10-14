"use client";

import { Fragment, type ReactNode } from "react";
import { KeywordChip } from "@/components/ui/keyword-chip";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { TRIGGER_STYLES } from "@/components/game/game-card";
import type { KeywordEntry } from "@/content/keywords";
import { PRACTICE_CARDS } from "@/lib/game/cards";
import type { EmblemName } from "@/lib/game/types";
import { cn } from "@/lib/cn";
import { findRanges, segmentCardText, splitTrigger, type Range } from "./glossary-search";

/** Wraps matched ranges of `text` in <mark>. */
export function Highlight({
  text,
  tokens,
  ranges,
}: {
  text: string;
  tokens?: readonly string[];
  /** Explicit ranges (e.g. typo-tolerant term matches); merged with token matches. */
  ranges?: readonly Range[];
}) {
  const found = tokens && tokens.length > 0 ? findRanges(text, tokens) : [];
  const all = ranges && ranges.length > 0 ? mergeAll(found, ranges, text.length) : found;
  if (all.length === 0) return <>{text}</>;
  const out: ReactNode[] = [];
  let last = 0;
  all.forEach(([s, e], i) => {
    if (s > last) out.push(<Fragment key={`t${i}`}>{text.slice(last, s)}</Fragment>);
    out.push(
      <mark
        key={`m${i}`}
        className="rounded-[3px] bg-chakra-400/30 text-inherit shadow-[0_0_0_1px_rgba(255,169,92,0.35)] [box-decoration-break:clone]"
      >
        {text.slice(s, e)}
      </mark>,
    );
    last = e;
  });
  if (last < text.length) out.push(<Fragment key="tail">{text.slice(last)}</Fragment>);
  return <>{out}</>;
}

function mergeAll(a: readonly Range[], b: readonly Range[], max: number): Range[] {
  const sorted = [...a, ...b.map(([s, e]) => [Math.max(0, s), Math.min(max, e)] as const)].sort((x, y) => x[0] - y[0]);
  const out: Array<[number, number]> = [];
  for (const [s, e] of sorted) {
    if (e <= s) continue;
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

/**
 * Rules text where upper-case card keywords (MAIN, POWERUP, …) become tooltip
 * chips. The entry's own keyword is bolded instead of linked.
 */
export function CardText({
  text,
  selfId,
  tokens,
  actions = false,
}: {
  text: string;
  selfId?: string;
  tokens?: readonly string[];
  actions?: boolean;
}) {
  return (
    <>
      {segmentCardText(text, { actions }).map((seg, i) => {
        if (seg.kind === "text") return <Highlight key={i} text={seg.text} tokens={tokens} />;
        if (seg.id === selfId) {
          return (
            <strong key={i} className="font-bold text-white">
              <Highlight text={seg.label} tokens={tokens} />
            </strong>
          );
        }
        return (
          <KeywordChip key={i} query={seg.id}>
            <Highlight text={seg.label} tokens={tokens} />
          </KeywordChip>
        );
      })}
    </>
  );
}

const PRACTICE_EMBLEMS = new Map<string, EmblemName>(Object.values(PRACTICE_CARDS).map((c) => [c.name, c.emblem]));

/** The example as a little card-text block: name line, trigger badge and linked keywords. */
export function ExampleCard({
  example,
  selfId,
  tokens,
  className,
}: {
  example: NonNullable<KeywordEntry["example"]>;
  selfId?: string;
  tokens?: readonly string[];
  className?: string;
}) {
  const [name = example.card, title] = example.card.split(" — ");
  const { trigger, rest } = splitTrigger(example.text);
  const emblem = PRACTICE_EMBLEMS.get(name) ?? "scroll";
  return (
    <figure
      className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-br from-chakra-400/45 via-white/10 to-mist-500/40 p-px",
        className,
      )}
    >
      <div className="relative rounded-[11px] bg-shadow-900/95 px-3.5 pb-3 pt-2.5">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-3 -top-3 text-white/[0.05]"
        >
          <Emblem name={emblem} size={72} />
        </span>
        <figcaption className="relative flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-chakra-400/30 to-mist-500/30 text-chakra-200 ring-1 ring-white/10">
            <Emblem name={emblem} size={14} />
          </span>
          <span className="min-w-0 truncate text-[13px] font-bold text-white">
            <Highlight text={name} tokens={tokens} />
            {title && (
              <span className="font-medium text-ash-400">
                {" · "}
                <Highlight text={title} tokens={tokens} />
              </span>
            )}
          </span>
        </figcaption>
        <p className="relative mt-2 text-[13.5px] leading-relaxed text-ash-200">
          {trigger && (
            <span
              className={cn(
                "mr-1.5 inline-block rounded px-1.5 py-px align-[1px] text-[10.5px] font-black tracking-wide",
                TRIGGER_STYLES[trigger].className,
              )}
            >
              {TRIGGER_STYLES[trigger].label}
            </span>
          )}
          {!trigger && selfId === "continuous" && (
            <span
              className={cn(
                "mr-1.5 inline-block rounded px-1.5 py-px align-[1px] text-[10.5px] font-black tracking-wide",
                TRIGGER_STYLES.CONTINUOUS.className,
              )}
            >
              {TRIGGER_STYLES.CONTINUOUS.label}
            </span>
          )}
          <CardText text={rest} selfId={selfId} tokens={tokens} actions />
        </p>
        <p className="relative mt-2 text-[10.5px] font-medium text-ash-500">Practice example · card text invented for teaching</p>
      </div>
    </figure>
  );
}

/** "Official rule · p.13" or the dashed "not an official keyword" badge. */
export function SourceBadge({ entry, className }: { entry: KeywordEntry; className?: string }) {
  if (entry.source.kind === "platform") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-dashed border-blood-400/60 bg-blood-500/10 px-2.5 py-1 text-[11px] font-bold text-blood-400",
          className,
        )}
      >
        <Icon name="info" size={12} />
        Not an official keyword
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-leaf-400/30 bg-leaf-500/10 px-2.5 py-1 text-[11px] font-bold text-leaf-300",
        className,
      )}
    >
      <Icon name="book" size={12} />
      Official rule
    </span>
  );
}

/** Full source line for the detail view. */
export function SourceLine({ entry }: { entry: KeywordEntry }) {
  const platform = entry.source.kind === "platform";
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[12.5px] leading-snug",
        platform ? "border-dashed border-blood-400/40 bg-blood-500/[0.06]" : "border-white/[0.07] bg-white/[0.025]",
      )}
    >
      <span className={cn("mt-px shrink-0", platform ? "text-blood-400" : "text-leaf-300")}>
        <Icon name={platform ? "info" : "book"} size={15} />
      </span>
      <p className="min-w-0 text-ash-300">
        <span className="font-bold text-ash-100">{platform ? "Platform term. " : "Source: "}</span>
        {entry.source.kind === "official" ? entry.source.ref : `${entry.source.note} Not an official Mythos keyword.`}
      </p>
    </div>
  );
}
