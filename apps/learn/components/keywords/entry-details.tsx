"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { Icon } from "@/components/ui/icon";
import { categoryLabel, CATEGORY_STYLES } from "@/components/ui/keyword-chip";
import type { KeywordEntry } from "@/content/keywords";
import { cn } from "@/lib/cn";
import { XP } from "@/lib/progress";
import { CardText, ExampleCard, Highlight, SourceBadge, SourceLine } from "./card-text";
import { getEntry } from "./glossary-search";

function LinkGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" />
    </svg>
  );
}

function CopyLinkButton({ id, term }: { id: string; term: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = window.setTimeout(() => setState("idle"), 1800);
    return () => window.clearTimeout(t);
  }, [state]);

  const copy = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
        state === "copied"
          ? "border-leaf-400/40 bg-leaf-500/10 text-leaf-300"
          : state === "failed"
            ? "border-blood-400/40 bg-blood-500/10 text-blood-400"
            : "border-white/10 bg-white/[0.04] text-ash-200 hover:border-white/20 hover:bg-white/[0.08]",
      )}
    >
      {state === "copied" ? <Icon name="check" size={14} /> : <LinkGlyph />}
      {state === "copied" ? "Link copied" : state === "failed" ? "Copy failed" : "Copy link"}
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? `Link to ${term} copied` : state === "failed" ? "Could not copy the link" : ""}
      </span>
    </button>
  );
}

/**
 * The full ruling for one term: long text with linked keywords, the example,
 * related terms and the source. `panel` adds a header for the side panel.
 */
export function EntryDetails({
  entry,
  tokens,
  explored,
  hydrated,
  burst,
  variant,
  headingId,
  onOpenRelated,
}: {
  entry: KeywordEntry;
  tokens: readonly string[];
  explored: boolean;
  hydrated: boolean;
  /** Increments when this entry has just earned XP. */
  burst: number;
  variant: "inline" | "panel";
  headingId?: string;
  onOpenRelated: (id: string) => void;
}) {
  const style = CATEGORY_STYLES[entry.category];
  const related = entry.related.map(getEntry).filter((r): r is KeywordEntry => Boolean(r));

  return (
    <div className="flex flex-col gap-4">
      {variant === "panel" && (
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={cn("eyebrow flex items-center gap-1.5", style.label)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} aria-hidden="true" />
              {categoryLabel(entry.category)}
            </span>
            <SourceBadge entry={entry} />
          </div>
          {/* Focus target after jumping to a related term (the clicked chip unmounts). */}
          <h3 id={headingId} tabIndex={-1} className="rounded-lg text-2xl font-black leading-tight text-white outline-offset-4">
            <span className={cn("inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 tracking-wide", style.chip)}>
              <span className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
              <Highlight text={entry.term} tokens={tokens} />
            </span>
          </h3>
          <p className="text-[15px] font-semibold leading-relaxed text-ash-100">
            <Highlight text={entry.short} tokens={tokens} />
          </p>
        </header>
      )}

      <p className="text-[14.5px] leading-relaxed text-ash-200">
        <CardText text={entry.long} selfId={entry.id} tokens={tokens} />
      </p>

      {entry.example && <ExampleCard example={entry.example} selfId={entry.id} tokens={tokens} />}

      {related.length > 0 && (
        <div>
          <p className="eyebrow !text-[10px] text-ash-500">Related terms</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {related.map((r) => {
              const rs = CATEGORY_STYLES[r.category];
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onOpenRelated(r.id)}
                    aria-label={`Open ${r.term}`}
                    className={cn(
                      "group/rel inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] font-bold tracking-wide transition hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
                      rs.chip,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", rs.dot)} aria-hidden="true" />
                    {r.term}
                    <Icon
                      name="arrow-right"
                      size={12}
                      className="opacity-60 transition group-hover/rel:translate-x-0.5 group-hover/rel:opacity-100"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <SourceLine entry={entry} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <CopyLinkButton id={entry.id} term={entry.term} />
        <span className="relative inline-flex">
          <ParticleBurst fire={burst} palette="gold" count={18} spread={60} shape="star" ring={false} fireOnMount />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={hydrated && explored ? "done" : "todo"}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 420, damping: 20 }}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
                hydrated && explored ? "bg-leaf-500/15 text-leaf-300" : "bg-gold-400/10 text-gold-300",
              )}
            >
              {hydrated && explored ? (
                <>
                  <Icon name="check" size={12} />
                  Explored · +{XP.keywordExplored} XP
                </>
              ) : (
                <>+{XP.keywordExplored} XP</>
              )}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>
    </div>
  );
}
