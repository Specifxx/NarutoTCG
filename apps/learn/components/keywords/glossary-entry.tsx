"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type Ref } from "react";
import { Icon } from "@/components/ui/icon";
import { categoryLabel, CATEGORY_STYLES } from "@/components/ui/keyword-chip";
import { cn } from "@/lib/cn";
import { XP } from "@/lib/progress";
import { Highlight } from "./card-text";
import { EntryDetails } from "./entry-details";
import { EntryPreview } from "./entry-preview";
import { snippetAround, type SearchResult } from "./glossary-search";

export const DETAIL_PANEL_ID = "glossary-detail-panel";
export const toggleId = (id: string) => `${id}-toggle`;

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 26, delay: (i % 8) * 0.035 },
  }),
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.16 } },
};

const PREVIEW_DELAY = 380;

export interface GlossaryEntryProps {
  result: SearchResult;
  tokens: readonly string[];
  index: number;
  expanded: boolean;
  /** Desktop layout: details render in the side panel instead of in place. */
  wide: boolean;
  explored: boolean;
  hydrated: boolean;
  /** Changes to replay the "you are here" highlight. */
  flash: number | null;
  /** Changes when this entry just earned XP. */
  burst: number;
  onToggle: (id: string) => void;
  onCollapse: (id: string) => void;
  onOpenRelated: (id: string) => void;
  registerRef: (id: string, el: HTMLLIElement | null) => void;
  ref?: Ref<HTMLLIElement>;
}

/** One glossary result: a keyword-badge card that expands in place (mobile) or selects into the side panel (desktop). */
export function GlossaryEntry({
  result,
  tokens,
  index,
  expanded,
  wide,
  explored,
  hydrated,
  flash,
  burst,
  onToggle,
  onCollapse,
  onOpenRelated,
  registerRef,
  ref,
}: GlossaryEntryProps) {
  const { entry } = result;
  const style = CATEGORY_STYLES[entry.category];
  const platform = entry.source.kind === "platform";
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | null>(null);
  const [preview, setPreview] = useState(false);
  const previewId = `${entry.id}-preview`;
  const detailsId = `${entry.id}-details`;
  const labelId = `${entry.id}-label`;
  const previewOpen = preview && !expanded;

  const setRefs = useCallback(
    (el: HTMLLIElement | null) => {
      registerRef(entry.id, el);
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [entry.id, ref, registerRef],
  );

  const clearTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const onPointerEnter = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimer();
    timer.current = window.setTimeout(() => setPreview(true), PREVIEW_DELAY);
  };
  const onPointerLeave = () => {
    clearTimer();
    setPreview(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLLIElement>) => {
    if (e.key !== "Escape") return;
    if (preview) setPreview(false);
    // Escape on an open keyword tooltip inside the details closes just that tooltip.
    const target = e.target;
    if (target instanceof HTMLElement && target !== buttonRef.current && target.getAttribute("aria-expanded") === "true") return;
    if (expanded && !wide) {
      e.stopPropagation();
      onCollapse(entry.id);
      buttonRef.current?.focus();
    }
  };

  // Show what matched when it isn't visible on the collapsed card.
  const visibleText = `${entry.term} ${entry.short}`.toLowerCase();
  const hiddenTokens = tokens.filter((t) => !visibleText.includes(t));
  const snippet =
    hiddenTokens.length > 0
      ? (snippetAround(entry.long, hiddenTokens) ??
        (entry.example ? snippetAround(`${entry.example.card}: ${entry.example.text}`, hiddenTokens) : null))
      : null;
  const alias = result.matchedAlias && result.matchedAlias !== entry.term.toLowerCase() ? result.matchedAlias : null;

  return (
    <motion.li
      ref={setRefs}
      id={entry.id}
      layout="position"
      custom={index}
      variants={ITEM_VARIANTS}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      exit="exit"
      onKeyDown={onKeyDown}
      className="relative min-w-0"
    >
      <div
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-2xl border transition-[border-color,background-color,box-shadow] duration-300",
          platform && "border-dashed",
          expanded
            ? "border-white/20 bg-shadow-800/85 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]"
            : "border-white/[0.08] bg-shadow-900/65 hover:border-white/20 hover:bg-shadow-800/70",
        )}
      >
        <span aria-hidden="true" className={cn("absolute inset-y-3 left-0 w-[3px] rounded-r-full opacity-80", style.dot)} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/[0.04] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        />
        {wide && expanded && (
          <motion.span
            layoutId="glossary-selected-ring"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-2 ring-chakra-400/70 shadow-[0_0_30px_-6px_rgba(255,122,26,0.65)]"
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          />
        )}
        {flash !== null && (
          <motion.span
            key={flash}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-2 ring-gold-300"
            style={{ boxShadow: "0 0 40px -4px rgba(245,197,66,0.75), inset 0 0 30px -10px rgba(245,197,66,0.5)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.25, 1, 0] }}
            transition={{ duration: 1.7, times: [0, 0.15, 0.45, 0.65, 1] }}
          />
        )}

        <button
          ref={buttonRef}
          id={toggleId(entry.id)}
          type="button"
          aria-expanded={expanded}
          aria-controls={wide ? DETAIL_PANEL_ID : detailsId}
          aria-describedby={previewOpen ? previewId : undefined}
          onClick={() => {
            clearTimer();
            setPreview(false);
            onToggle(entry.id);
          }}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onFocus={(e) => {
            if (e.currentTarget.matches(":focus-visible")) setPreview(true);
          }}
          onBlur={() => setPreview(false)}
          className="relative flex flex-1 flex-col rounded-2xl p-4 pl-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-chakra-400"
        >
          <span className="flex w-full items-start justify-between gap-3">
            <span
              className={cn(
                "inline-flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[13px] font-black tracking-wide shadow-[0_2px_10px_-4px_rgba(0,0,0,0.6)]",
                style.chip,
              )}
            >
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} aria-hidden="true" />
              <span id={labelId} className="truncate">
                <Highlight text={entry.term} tokens={tokens} ranges={result.fuzzyRanges} />
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2 pt-0.5">
              {hydrated && explored ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-leaf-500/20 text-leaf-300 ring-1 ring-leaf-400/30">
                  <Icon name="check" size={12} strokeWidth={2.6} />
                  <span className="sr-only">Explored</span>
                </span>
              ) : (
                <span className="hidden text-[10.5px] font-bold text-gold-300/0 transition-colors group-hover:text-gold-300/90 sm:inline">
                  +{XP.keywordExplored} XP
                </span>
              )}
              <motion.span
                aria-hidden="true"
                className={cn("flex text-ash-400 transition-colors group-hover:text-ash-100", expanded && "text-chakra-300")}
                animate={{ rotate: wide ? 0 : expanded ? 180 : 0, x: wide && expanded ? 2 : 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
              >
                <Icon name={wide ? "chevron-right" : "chevron-down"} size={16} />
              </motion.span>
            </span>
          </span>

          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-bold uppercase tracking-[0.14em]">
            <span className={style.label}>{categoryLabel(entry.category)}</span>
            {entry.featured && (
              <span className="inline-flex items-center gap-1 text-gold-300">
                <Icon name="star" size={11} />
                Featured
              </span>
            )}
            {platform && <span className="text-blood-400">Not official</span>}
          </span>

          <span className={cn("mt-1.5 block text-[13.5px] leading-relaxed text-ash-300", !expanded && "line-clamp-3")}>
            <Highlight text={entry.short} tokens={tokens} />
          </span>

          {alias && (
            <span className="mt-2 block text-[12px] text-ash-400">
              Also: <span className="font-semibold text-ash-200">“<Highlight text={alias} tokens={tokens} />”</span>
            </span>
          )}
          {snippet && (
            <span className="mt-2 block rounded-lg border border-white/[0.06] bg-black/25 px-2.5 py-1.5 text-[12px] leading-snug text-ash-400">
              <span className="mr-1 font-bold text-ash-300">In the ruling:</span>
              <Highlight text={snippet} tokens={hiddenTokens} />
            </span>
          )}
        </button>

        <AnimatePresence initial={false}>
          {expanded && !wide && (
            <motion.div
              key="details"
              id={detailsId}
              role="region"
              aria-labelledby={labelId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ height: { duration: 0.34, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.22 } }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/[0.07] px-4 pb-4 pl-5 pt-4">
                <EntryDetails
                  entry={entry}
                  tokens={tokens}
                  explored={explored}
                  hydrated={hydrated}
                  burst={burst}
                  variant="inline"
                  onOpenRelated={onOpenRelated}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <EntryPreview id={previewId} entry={entry} open={previewOpen} anchorRef={buttonRef} />
    </motion.li>
  );
}
