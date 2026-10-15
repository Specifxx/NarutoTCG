"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { KeywordTooltipCard } from "@/components/ui/keyword-chip";
import type { KeywordEntry } from "@/content/keywords";
import { cn } from "@/lib/cn";

interface Placement {
  left: number;
  width: number;
  arrowLeft: number;
  above: boolean;
  top?: number;
  bottom?: number;
}

const MAX_WIDTH = 300;
/** Space reserved under the sticky header before we prefer opening below. */
const ABOVE_THRESHOLD = 300;

/**
 * Animated tooltip preview for a glossary entry, portalled to <body> so the
 * results grid never clips it. Purely supplementary: the same text is
 * reachable by expanding the entry.
 */
export function EntryPreview({
  id,
  entry,
  open,
  anchorRef,
}: {
  id: string;
  entry: KeywordEntry;
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
}) {
  const [mounted, setMounted] = useState(false);
  const [place, setPlace] = useState<Placement | null>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const width = Math.min(MAX_WIDTH, vw - 16);
      const center = r.left + Math.min(r.width / 2, 150);
      const left = Math.max(8, Math.min(center - width / 2, vw - width - 8));
      const above = r.top > ABOVE_THRESHOLD;
      setPlace({
        left,
        width,
        arrowLeft: Math.max(16, Math.min(center - left, width - 16)),
        above,
        ...(above ? { bottom: window.innerHeight - r.top + 10 } : { top: r.bottom + 10 }),
      });
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, anchorRef]);

  if (!mounted) return null;
  const platform = entry.source.kind === "platform";

  return createPortal(
    <AnimatePresence>
      {open && place && (
        <motion.div
          id={id}
          role="tooltip"
          initial={{ opacity: 0, y: place.above ? 8 : -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: place.above ? 6 : -6, scale: 0.97, transition: { duration: 0.12 } }}
          transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.6 }}
          style={{
            position: "fixed",
            left: place.left,
            top: place.top,
            bottom: place.bottom,
            width: place.width,
            transformOrigin: place.above ? `${place.arrowLeft}px 100%` : `${place.arrowLeft}px 0%`,
          }}
          className="pointer-events-none z-[75] rounded-xl border border-white/10 bg-shadow-900/95 p-3.5 shadow-2xl shadow-black/70 backdrop-blur-xl"
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute h-2.5 w-2.5 rotate-45 border-white/10 bg-shadow-900",
              place.above ? "-bottom-[6px] border-b border-r" : "-top-[6px] border-l border-t",
            )}
            style={{ left: place.arrowLeft - 5 }}
          />
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
              platform ? "via-blood-400/70" : "via-chakra-400/60",
            )}
          />
          <KeywordTooltipCard entry={entry} showLink={false} />
          <p className="mt-2 flex items-center gap-1.5 border-t border-white/5 pt-2 text-[10.5px] font-semibold text-ash-400">
            <kbd className="rounded border border-white/15 bg-white/5 px-1 text-[9.5px] text-ash-200">Enter</kbd>
            or click to open the full ruling
          </p>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
