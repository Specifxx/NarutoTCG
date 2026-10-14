"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { findKeyword, KEYWORD_CATEGORIES, type KeywordCategory, type KeywordEntry } from "@/content/keywords";
import { cn } from "@/lib/cn";

export const CATEGORY_STYLES: Record<KeywordCategory, { chip: string; dot: string; label: string }> = {
  trigger: { chip: "border-mist-400/40 bg-mist-500/10 text-mist-200", dot: "bg-mist-400", label: "text-mist-300" },
  effect: { chip: "border-chakra-400/40 bg-chakra-500/10 text-chakra-200", dot: "bg-chakra-400", label: "text-chakra-300" },
  status: { chip: "border-energy-400/40 bg-energy-500/10 text-energy-200", dot: "bg-energy-400", label: "text-energy-300" },
  resource: { chip: "border-gold-400/40 bg-gold-400/10 text-gold-200", dot: "bg-gold-400", label: "text-gold-300" },
  rule: { chip: "border-ash-400/30 bg-white/5 text-ash-100", dot: "bg-ash-300", label: "text-ash-300" },
  phase: { chip: "border-leaf-400/40 bg-leaf-500/10 text-leaf-300", dot: "bg-leaf-400", label: "text-leaf-300" },
  card: { chip: "border-ash-400/30 bg-white/5 text-ash-100", dot: "bg-ash-200", label: "text-ash-300" },
  platform: {
    chip: "border-dashed border-blood-400/50 bg-blood-500/10 text-chakra-200",
    dot: "bg-blood-400",
    label: "text-blood-400",
  },
};

export const categoryLabel = (c: KeywordCategory) => KEYWORD_CATEGORIES.find((x) => x.id === c)?.label ?? c;

type Placement = { left: number; arrowLeft: number; top?: number; bottom?: number; above: boolean };
const WIDTH = 296;

/** The tooltip body; also used by the glossary for hover previews. */
export function KeywordTooltipCard({ entry, showLink = true }: { entry: KeywordEntry; showLink?: boolean }) {
  const style = CATEGORY_STYLES[entry.category];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-black tracking-wide text-white">{entry.term}</span>
        <span className={cn("eyebrow flex items-center gap-1.5 !text-[10px]", style.label)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
          {categoryLabel(entry.category)}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-ash-200">{entry.short}</p>
      {entry.example && (
        <p className="rounded-md border border-white/5 bg-black/30 px-2.5 py-1.5 text-[12px] leading-snug text-ash-300">
          <span className="font-semibold text-ash-100">{entry.example.card}:</span> {entry.example.text}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <span className="text-[10.5px] text-ash-500">
          {entry.source.kind === "official" ? "Official rule" : "Platform term · not an official keyword"}
        </span>
        {showLink && (
          <Link href={`/keywords#${entry.id}`} className="text-[11.5px] font-semibold text-chakra-300 hover:text-chakra-200">
            Glossary →
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Inline keyword with an animated tooltip. Opens on hover, keyboard focus or
 * tap, rendered in a portal so it is never clipped by overflow containers.
 */
export function KeywordChip({
  query,
  children,
  className,
}: {
  /** Keyword id, term or alias. */
  query: string;
  children?: ReactNode;
  className?: string;
}) {
  const entry = findKeyword(query);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [place, setPlace] = useState<Placement | null>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  useEffect(() => setMounted(true), []);

  const measure = useCallback(() => {
    const el = anchor.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const width = Math.min(WIDTH, vw - 16);
    const center = r.left + r.width / 2;
    const left = Math.max(8, Math.min(center - width / 2, vw - width - 8));
    const above = r.top > 220;
    setPlace({
      left,
      arrowLeft: Math.max(14, Math.min(center - left, width - 14)),
      above,
      ...(above ? { bottom: window.innerHeight - r.top + 10 } : { top: r.bottom + 10 }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const onMove = () => measure();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (anchor.current?.contains(t)) return;
      if (document.getElementById(tooltipId)?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, tooltipId]);

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  const label = children ?? entry?.term ?? query;
  if (!entry) return <span className={className}>{label}</span>;
  const style = CATEGORY_STYLES[entry.category];

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onPointerEnter={(e) => e.pointerType === "mouse" && show()}
        onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
        onFocus={show}
        onBlur={hide}
        onClick={() => (open ? setOpen(false) : show())}
        className={cn(
          "relative mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-md border px-1.5 py-[1px] align-baseline text-[0.86em] font-bold leading-snug tracking-wide transition hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
          style.chip,
          className,
        )}
      >
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
        {label}
      </button>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && place && (
              <motion.div
                id={tooltipId}
                role="tooltip"
                initial={{ opacity: 0, y: place.above ? 8 : -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: place.above ? 6 : -6, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.6 }}
                onPointerEnter={show}
                onPointerLeave={hide}
                style={{
                  position: "fixed",
                  left: place.left,
                  top: place.top,
                  bottom: place.bottom,
                  width: Math.min(WIDTH, typeof window === "undefined" ? WIDTH : window.innerWidth - 16),
                  transformOrigin: place.above ? `${place.arrowLeft}px 100%` : `${place.arrowLeft}px 0%`,
                }}
                className="z-[80] rounded-xl border border-white/10 bg-shadow-900/95 p-3.5 shadow-2xl shadow-black/70 backdrop-blur-xl"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute h-2.5 w-2.5 rotate-45 border-white/10 bg-shadow-900",
                    place.above ? "-bottom-[6px] border-b border-r" : "-top-[6px] border-l border-t",
                  )}
                  style={{ left: place.arrowLeft - 5 }}
                />
                <div className={cn("absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent", style.dot === "bg-blood-400" ? "via-blood-400/70" : "via-chakra-400/60")} />
                <KeywordTooltipCard entry={entry} />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
