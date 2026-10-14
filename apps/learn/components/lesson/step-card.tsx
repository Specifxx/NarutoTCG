"use client";

import { motion } from "framer-motion";
import { Icon, type IconName } from "@/components/ui/icon";
import { RichText } from "@/components/ui/rich-text";
import type { Accent, CalloutTone, SourceRef, TutorialStep } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import type { EmblemName } from "@/lib/game/types";
import { LessonMedallion } from "./lesson-medallion";

const CALLOUTS: Record<CalloutTone, { label: string; icon: IconName; box: string; badge: string; text: string }> = {
  tip: {
    label: "Ninja tip",
    icon: "lightbulb",
    box: "border-energy-400/25 bg-energy-500/[0.07]",
    badge: "bg-energy-400/15 text-energy-300 ring-energy-400/30",
    text: "text-energy-300",
  },
  rule: {
    label: "Rule",
    icon: "book",
    box: "border-gold-400/25 bg-gold-400/[0.06]",
    badge: "bg-gold-400/15 text-gold-300 ring-gold-400/30",
    text: "text-gold-300",
  },
  warning: {
    label: "Watch out",
    icon: "info",
    box: "border-blood-400/30 bg-blood-500/[0.08]",
    badge: "bg-blood-500/20 text-blood-400 ring-blood-400/30",
    text: "text-blood-400",
  },
};

/** Short "Rulebook p.9 · Start phase" style label for a step source. */
export function sourceLabel(source: SourceRef) {
  const doc = /rulebook/i.test(source.document) ? "Rulebook" : source.document;
  return source.page !== undefined ? `${doc} p.${source.page}` : doc;
}

function Callout({ tone, text }: { tone: CalloutTone; text: string }) {
  const c = CALLOUTS[tone];
  return (
    <motion.aside
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.3 }}
      className={cn("relative mt-5 flex gap-3 rounded-xl border p-3.5 sm:p-4", c.box)}
    >
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1", c.badge)}>
        <Icon name={c.icon} size={16} strokeWidth={2.1} />
      </span>
      <div className="min-w-0">
        <p className={cn("eyebrow", c.text)}>{c.label}</p>
        <RichText as="p" text={text} className="mt-1 text-[14px] leading-relaxed text-ash-200" />
      </div>
    </motion.aside>
  );
}

function SourceCaption({ source }: { source: SourceRef }) {
  const label = sourceLabel(source);
  return (
    <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/5 pt-4 text-xs text-ash-500">
      <Icon name="book" size={13} className="shrink-0" />
      <span className="sr-only">Source: </span>
      {source.url ? (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-ash-400 underline decoration-white/20 underline-offset-2 transition hover:text-ash-200"
        >
          {label}
        </a>
      ) : (
        <span className="font-semibold text-ash-400">{label}</span>
      )}
      {source.section && <span>· {source.section}</span>}
    </p>
  );
}

/** Text side of a lesson step: title, body, bullets, callout and source. */
export function StepCard({
  step,
  index,
  total,
  accent,
}: {
  step: TutorialStep;
  index: number;
  total: number;
  accent: Accent;
}) {
  const a = ACCENT_STYLES[accent];
  const titleId = `step-${step.id}-title`;
  return (
    <article aria-labelledby={titleId} className="panel relative min-w-0 overflow-hidden p-5 sm:p-7">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${a.hex[1]}, transparent)` }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-3 -top-7 select-none text-[120px] font-black leading-none tracking-tighter text-white/[0.035] sm:text-[150px]"
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <p className={cn("eyebrow relative flex items-center gap-2", a.text)}>
        <span className="h-1.5 w-1.5 rotate-45 rounded-[1px]" style={{ background: a.hex[1] }} aria-hidden="true" />
        Step {index + 1} of {total}
      </p>
      <h2
        id={titleId}
        className="relative mt-2 text-balance text-2xl font-black leading-tight tracking-tight text-white sm:text-[28px]"
      >
        <RichText text={step.title} />
      </h2>
      <RichText as="p" text={step.body} className="relative mt-3 text-[15px] leading-relaxed text-ash-300 sm:text-base" />

      {step.bullets && step.bullets.length > 0 && (
        <ul className="relative mt-4 space-y-2.5">
          {step.bullets.map((b, j) => (
            <motion.li
              key={j}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.12 + j * 0.06 }}
              className="flex gap-3"
            >
              <span
                aria-hidden="true"
                className="mt-[9px] h-1.5 w-1.5 shrink-0 rotate-45 rounded-[1px]"
                style={{ background: a.hex[1], boxShadow: `0 0 8px ${a.hex[1]}` }}
              />
              <RichText text={b} className="min-w-0 text-[14.5px] leading-relaxed text-ash-200" />
            </motion.li>
          ))}
        </ul>
      )}

      {step.callout && <Callout tone={step.callout.tone} text={step.callout.text} />}
      {step.source && <SourceCaption source={step.source} />}
    </article>
  );
}

/** Decorative stand-in when a step has no visual: the lesson medallion in an orbiting halo. */
export function VisualFallback({ emblem, accent, index }: { emblem: EmblemName; accent: Accent; index: number }) {
  const a = ACCENT_STYLES[accent];
  return (
    <div aria-hidden="true" className="panel relative flex aspect-[4/3] items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 45%, ${a.hex[1]}38 0%, ${a.hex[2]}14 40%, transparent 68%)` }}
      />
      <svg viewBox="0 0 200 200" className="absolute h-[88%] w-[88%] animate-spin-slow opacity-50">
        <circle cx="100" cy="100" r="92" fill="none" stroke={a.hex[1]} strokeWidth="1" strokeDasharray="2 9" strokeLinecap="round" />
        <circle cx="100" cy="100" r="68" fill="none" stroke={a.hex[0]} strokeOpacity="0.4" strokeWidth="0.8" strokeDasharray="14 10" />
        <circle cx="100" cy="8" r="3" fill={a.hex[0]} />
      </svg>
      <span className="relative animate-float">
        <LessonMedallion emblem={emblem} accent={accent} size="lg" glow />
      </span>
      <span className="eyebrow absolute bottom-4 text-ash-500">Step {String(index + 1).padStart(2, "0")}</span>
    </div>
  );
}
