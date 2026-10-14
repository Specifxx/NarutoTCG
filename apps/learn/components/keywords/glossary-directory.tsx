"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";
import { Icon } from "@/components/ui/icon";
import { CATEGORY_STYLES } from "@/components/ui/keyword-chip";
import { KEYWORD_CATEGORIES, KEYWORDS, type KeywordEntry } from "@/content/keywords";
import { cn } from "@/lib/cn";
import { useProgress, XP } from "@/lib/progress";
import { EntryDetails } from "./entry-details";
import {
  documentTop,
  exploredKey,
  GLOSSARY_COMMAND_EVENT,
  HEADER_OFFSET,
  readHash,
  replaceHash,
  useExplored,
  type GlossaryCommand,
} from "./glossary-bus";
import { DETAIL_PANEL_ID, GlossaryEntry, toggleId } from "./glossary-entry";
import {
  countByCategory,
  getEntry,
  KEYWORD_IDS,
  searchKeywords,
  suggestTerm,
  tokenizeQuery,
  type CategoryFilter,
} from "./glossary-search";

/* ------------------------------------------------------------------------- */

const WIDE_QUERY = "(min-width: 1024px)";
function subscribeWide(onChange: () => void) {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
/** True on desktop widths, where details open in the side panel. False during SSR and hydration. */
function useIsWide() {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}

type ScrollMode = "start" | "nearest";

const SUGGESTIONS = ["ambush", "tokens", "tie", "hidden", "first to pass", "rank"];
const QUICK_PICKS = ["ambush", "powerup", "exhaust", "edge-token"];

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/* ------------------------------------------------------------------------- */

function ExploredMeter() {
  const { hydrated, count, total } = useExplored();
  const ratio = hydrated && total > 0 ? count / total : 0;
  return (
    <div className="w-full sm:w-72">
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow text-gold-300">Explored</span>
        <span className="text-sm font-black tabular-nums text-white">
          {hydrated ? <AnimatedNumber value={count} /> : "–"}
          <span className="font-bold text-ash-500"> / {total}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Terms explored"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={hydrated ? count : undefined}
        aria-valuetext={hydrated ? `${count} of ${total} terms explored` : "Loading progress"}
        className="relative mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]"
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-gold-300 via-chakra-400 to-blood-400 shadow-[0_0_10px_rgba(255,122,26,0.6)]"
          initial={false}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-ash-500">Open a term to explore it · +{XP.keywordExplored} XP each</p>
    </div>
  );
}

function PanelPlaceholder({ onOpen, exploredIds }: { onOpen: (id: string) => void; exploredIds: ReadonlySet<string> }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <span className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-chakra-500/15 blur-xl" aria-hidden="true" />
        <span className="relative animate-float text-chakra-300 drop-shadow-[0_0_14px_rgba(255,122,26,0.6)]">
          <Emblem name="scroll" size={52} />
        </span>
      </span>
      <h3 className="mt-4 text-lg font-black text-white">Pick a term</h3>
      <p className="mt-1.5 max-w-[16rem] text-[13.5px] leading-relaxed text-ash-400">
        Select any entry to read its full ruling, an example and related terms here.
      </p>
      <ul className="mt-5 flex flex-wrap justify-center gap-1.5" aria-label="Quick picks">
        {QUICK_PICKS.map((id) => {
          const k = getEntry(id);
          if (!k) return null;
          const s = CATEGORY_STYLES[k.category];
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onOpen(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] font-bold tracking-wide transition hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
                  s.chip,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} aria-hidden="true" />
                {k.term}
                {exploredIds.has(id) && <Icon name="check" size={11} className="text-leaf-300" />}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-[11.5px] text-ash-500">
        <kbd className="rounded border border-white/15 bg-white/5 px-1 text-[10.5px] text-ash-200">/</kbd> search ·{" "}
        <kbd className="rounded border border-white/15 bg-white/5 px-1 text-[10.5px] text-ash-200">Enter</kbd> open the top match
      </p>
    </div>
  );
}

function EmptyState({
  query,
  categoryLabel,
  allCount,
  onQuery,
  onAllCategories,
  onClear,
}: {
  query: string;
  categoryLabel: string | null;
  /** Matches across all categories, when a category filter is active. */
  allCount: number;
  onQuery: (q: string) => void;
  onAllCategories: () => void;
  onClear: () => void;
}) {
  const suggestion = useMemo(() => (query.trim() ? suggestTerm(query) : null), [query]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="panel flex flex-col items-center px-5 py-10 text-center sm:px-10"
    >
      <span className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-mist-500/20 blur-xl" aria-hidden="true" />
        <span className="relative animate-float text-mist-300">
          <Emblem name="mask" size={52} />
        </span>
      </span>
      <h3 className="mt-4 text-xl font-black text-white">
        No terms match {query.trim() ? <>“{query.trim()}”</> : "this filter"}
        {categoryLabel && <span className="text-ash-400"> in {categoryLabel}</span>}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ash-400">
        This hidden character stayed hidden. Check the spelling, try a broader word, or start from one of these.
      </p>

      {suggestion && (
        <p className="mt-4 text-sm text-ash-300">
          Did you mean{" "}
          <button
            type="button"
            onClick={() => onQuery(suggestion.term)}
            className="rounded font-bold text-chakra-300 underline decoration-chakra-400/40 underline-offset-4 hover:text-chakra-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
          >
            {suggestion.term}
          </button>
          ?
        </p>
      )}

      <ul className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Suggested searches">
        {SUGGESTIONS.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onQuery(s)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[13px] font-semibold text-ash-200 transition hover:border-chakra-400/40 hover:bg-chakra-500/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {categoryLabel && allCount > 0 && (
          <Button variant="primary" size="sm" onClick={onAllCategories}>
            Search all categories ({allCount})
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onClear}>
          <Icon name="refresh" size={14} />
          Clear search
        </Button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------------- */

/**
 * Searchable, filterable glossary. Owns the expanded entry, keeps it in the
 * URL hash (/keywords#ambush), handles deep links and awards XP for every
 * term opened.
 */
export function GlossaryDirectory() {
  const reduce = useReducedMotion();
  const wide = useIsWide();
  const { hydrated, award } = useProgress();
  const explored = useExplored();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null);
  const [burst, setBurst] = useState<{ id: string; n: number } | null>(null);
  const [, setScrollTick] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const pendingScroll = useRef<{ id: string; mode: ScrollMode } | null>(null);
  const timers = useRef(new Set<number>());
  const ignoreHashUntil = useRef(0);
  const seq = useRef(0);
  const filtersRef = useRef({ query, category });
  const reduceRef = useRef(reduce);

  useEffect(() => {
    filtersRef.current = { query, category };
    reduceRef.current = reduce;
  });

  const tokens = useMemo(() => tokenizeQuery(query), [query]);
  const results = useMemo(() => searchKeywords(query), [query]);
  const counts = useMemo(() => countByCategory(results), [results]);
  const visible = useMemo(
    () => (category === "all" ? results : results.filter((r) => r.entry.category === category)),
    [results, category],
  );
  const expandedEntry: KeywordEntry | null = expanded ? (getEntry(expanded) ?? null) : null;
  const categoryLabel = category === "all" ? null : (KEYWORD_CATEGORIES.find((c) => c.id === category)?.label ?? null);

  /* Timers that survive re-renders and are cleared on unmount. */
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending) window.clearTimeout(t);
      pending.clear();
    };
  }, []);

  const registerRef = useCallback((id: string, el: HTMLLIElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  }, []);

  const scrollToEntry = useCallback((id: string, mode: ScrollMode, correction = false) => {
    const el = itemRefs.current.get(id);
    if (!el) return;
    const target = Math.max(0, documentTop(el) - HEADER_OFFSET);
    if (mode === "nearest") {
      const topInViewport = target + HEADER_OFFSET - window.scrollY;
      if (topInViewport >= HEADER_OFFSET - 24 && topInViewport <= window.innerHeight - 140) return;
    }
    if (correction && Math.abs(window.scrollY - target) < 8) return;
    window.scrollTo({ top: target, behavior: reduceRef.current ? "auto" : "smooth" });
  }, []);

  const scrollToToolbar = useCallback(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top >= HEADER_OFFSET - 40 && r.bottom <= window.innerHeight - 40) return;
    window.scrollTo({ top: Math.max(0, documentTop(el) - HEADER_OFFSET), behavior: reduceRef.current ? "auto" : "smooth" });
  }, []);

  const focusSearch = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    input.select();
    scrollToToolbar();
  }, [scrollToToolbar]);

  /** Expands an entry, revealing it first if search or filters hide it. */
  const open = useCallback(
    (id: string, opts: { hash?: boolean; flash?: boolean; mode?: ScrollMode | null; focus?: boolean } = {}) => {
      const entry = getEntry(id);
      if (!entry) return;
      const { hash = true, flash: doFlash = true, mode = "start", focus = false } = opts;
      const { query: q, category: c } = filtersRef.current;
      const shown = (c === "all" || entry.category === c) && searchKeywords(q).some((r) => r.entry.id === id);
      if (!shown) {
        setQuery("");
        setCategory("all");
      }
      setExpanded(id);
      if (hash) replaceHash(id);
      if (doFlash) {
        const n = ++seq.current;
        setFlash({ id, n });
        later(() => setFlash((f) => (f && f.n === n ? null : f)), 2800);
      }
      if (mode) {
        pendingScroll.current = { id, mode };
        setScrollTick((t) => t + 1);
      }
      if (focus) {
        // Desktop: the side panel swaps content after a short exit animation.
        const isWide = window.matchMedia(WIDE_QUERY).matches;
        later(
          () => document.getElementById(isWide ? "glossary-detail-title" : toggleId(id))?.focus({ preventScroll: true }),
          isWide ? 300 : 40,
        );
      }
    },
    [later],
  );

  const toggle = useCallback(
    (id: string) => {
      if (expanded === id) {
        setExpanded(null);
        replaceHash(null);
        return;
      }
      open(id, { flash: false, mode: wide ? null : "nearest" });
    },
    [expanded, open, wide],
  );

  const collapse = useCallback((id: string) => {
    setExpanded((cur) => (cur === id ? null : cur));
    replaceHash(null);
  }, []);

  const openRelated = useCallback((id: string) => open(id, { mode: wide ? "nearest" : "start", focus: true }), [open, wide]);

  // Scroll once the target entry is rendered (it may first need filters cleared).
  useEffect(() => {
    const p = pendingScroll.current;
    if (!p || !itemRefs.current.has(p.id)) return;
    pendingScroll.current = null;
    requestAnimationFrame(() => scrollToEntry(p.id, p.mode));
    // Re-check once collapse/expand animations have settled.
    later(() => scrollToEntry(p.id, p.mode, true), 460);
  });

  // Opening a term earns XP once (after stored progress has loaded).
  useEffect(() => {
    if (!hydrated || !expanded) return;
    const entry = getEntry(expanded);
    if (!entry) return;
    if (award(exploredKey(entry.id), XP.keywordExplored, `Explored ${entry.term}`)) {
      const n = ++seq.current;
      setBurst({ id: entry.id, n });
      // Short-lived, so details that mount a moment later (the desktop panel
      // swaps content after an exit animation) still burst, but reopening later doesn't.
      later(() => setBurst((b) => (b && b.n === n ? null : b)), 1400);
    }
  }, [hydrated, expanded, award, later]);

  // Deep links, hash changes, glossary links, commands and the "/" shortcut.
  useEffect(() => {
    const openFromHash = () => {
      const id = readHash();
      if (!KEYWORD_IDS.has(id)) return false;
      open(id, { hash: false, mode: "start" });
      return true;
    };
    if (!openFromHash()) later(openFromHash, 60);

    const onHashChange = () => {
      if (Date.now() < ignoreHashUntil.current) return;
      openFromHash();
    };

    const onCommand = (e: Event) => {
      const cmd = (e as CustomEvent<GlossaryCommand>).detail;
      if (!cmd) return;
      if (cmd.type === "open") open(cmd.id, { mode: "start" });
      else if (cmd.type === "filter") {
        setCategory(cmd.category);
        scrollToToolbar();
      } else focusSearch();
    };

    // Same-page glossary links (tooltip "Glossary →", featured cards) open the
    // entry in place instead of a router navigation that would not expand it.
    const onDocClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!(e.target instanceof Element)) return;
      const a = e.target.closest("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      const raw = a.getAttribute("href") ?? "";
      let url: URL;
      try {
        url = new URL(a.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      const glossaryLink = a.hasAttribute("data-glossary-link") || raw.includes("/keywords#");
      if (!glossaryLink) {
        // Plain in-page anchors (e.g. "Skip to content" → #main-content) must not open an entry.
        ignoreHashUntil.current = Date.now() + 600;
        return;
      }
      let id = "";
      try {
        id = decodeURIComponent(url.hash.slice(1)).toLowerCase();
      } catch {
        return;
      }
      if (!KEYWORD_IDS.has(id)) return;
      e.preventDefault();
      open(id, { mode: "start" });
      if (a.closest('[role="tooltip"]')) {
        // Close the KeywordChip tooltip the link lives in.
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return;
      e.preventDefault();
      focusSearch();
    };

    window.addEventListener("hashchange", onHashChange);
    window.addEventListener(GLOSSARY_COMMAND_EVENT, onCommand);
    document.addEventListener("click", onDocClick, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener(GLOSSARY_COMMAND_EVENT, onCommand);
      document.removeEventListener("click", onDocClick, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, focusSearch, scrollToToolbar, later]);

  const onInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (query) setQuery("");
      else e.currentTarget.blur();
    } else if (e.key === "Enter") {
      const top = visible[0];
      if (!top) return;
      e.preventDefault();
      open(top.entry.id, { mode: "nearest" });
    }
  };

  const n = visible.length;
  const trimmed = query.trim();
  const status = trimmed
    ? `${n} ${n === 1 ? "term matches" : "terms match"} “${trimmed}”${categoryLabel ? ` in ${categoryLabel}` : ""}`
    : categoryLabel
      ? `${n} ${n === 1 ? "term" : "terms"} in ${categoryLabel}`
      : `All ${n} terms`;

  const chips: Array<{ id: CategoryFilter; label: string; count: number; dot: string | null }> = [
    { id: "all", label: "All", count: results.length, dot: null },
    ...KEYWORD_CATEGORIES.map((c) => ({ id: c.id, label: c.label, count: counts[c.id], dot: CATEGORY_STYLES[c.id].dot })),
  ];

  return (
    <section id="glossary-directory" aria-labelledby="glossary-directory-title" className="relative pb-24 pt-6 sm:pt-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ type: "spring", stiffness: 150, damping: 22 }}
        className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="max-w-2xl">
          <p className="eyebrow flex items-center gap-2.5 text-chakra-300">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-chakra-400" aria-hidden="true" />
            Directory
          </p>
          <h2 id="glossary-directory-title" className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Every term, <span className="text-gold-gradient">one search away</span>
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ash-400">
            Search by name, nickname or rules text. Typos are forgiven. Open a term for the full ruling, an example and its
            related terms.
          </p>
        </div>
        <ExploredMeter />
      </motion.div>

      {/* Search and filters. */}
      <div ref={toolbarRef} className="panel relative mt-7 p-3 sm:p-4">
        <div className="relative">
          <label htmlFor="glossary-search" className="sr-only">
            Search keywords and rules terms
          </label>
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ash-400"
          />
          <input
            ref={inputRef}
            id="glossary-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder={`Search ${KEYWORDS.length} terms… try “tie” or “ambsuh”`}
            aria-describedby="glossary-search-hint"
            aria-controls="glossary-results"
            className="h-12 w-full rounded-xl border border-white/10 bg-black/30 pl-11 pr-14 text-[15px] text-white outline-none transition placeholder:text-ash-500 focus:border-chakra-400/60 focus:bg-black/45 focus:shadow-[0_0_0_4px_rgba(255,122,26,0.14)] focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
            <AnimatePresence mode="wait" initial={false}>
              {query ? (
                <motion.button
                  key="clear"
                  type="button"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ash-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
                >
                  <Icon name="x" size={16} />
                </motion.button>
              ) : (
                <motion.kbd
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  aria-hidden="true"
                  className="mr-1.5 hidden h-6 min-w-6 items-center justify-center rounded-md border border-white/15 bg-white/5 px-1.5 text-[12px] font-black text-ash-300 sm:flex"
                >
                  /
                </motion.kbd>
              )}
            </AnimatePresence>
          </span>
          <p id="glossary-search-hint" className="sr-only">
            Matches terms, nicknames and rules text. Press slash to jump here, Enter to open the top match, Escape to clear.
          </p>
        </div>

        <div
          role="group"
          aria-label="Filter by category"
          className="scrollbar-none -mx-3 mt-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 sm:-mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          {chips.map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={(e) => {
                  setCategory(c.id);
                  e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
                }}
                className={cn(
                  "relative shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400",
                  active ? "text-white" : "text-ash-400 hover:bg-white/[0.05] hover:text-ash-100",
                  !active && c.count === 0 && "opacity-50",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="glossary-category-pill"
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full border border-chakra-400/40 bg-chakra-500/15 shadow-[0_0_18px_-6px_rgba(255,122,26,0.7)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5 whitespace-nowrap">
                  {c.dot ? (
                    <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} aria-hidden="true" />
                  ) : (
                    <Icon name="layers" size={13} />
                  )}
                  {c.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                      active ? "bg-chakra-400/25 text-chakra-100" : "bg-white/[0.07] text-ash-400",
                    )}
                  >
                    {c.count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex min-h-8 flex-wrap items-center justify-between gap-2 px-1">
        <p role="status" aria-live="polite" aria-atomic="true" className="text-sm font-semibold text-ash-300">
          {status}
          {trimmed && n > 1 && <span className="font-normal text-ash-500"> · best matches first</span>}
        </p>
        {(trimmed || category !== "all") && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-semibold text-ash-400 transition hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
          >
            <Icon name="refresh" size={13} />
            Reset filters
          </button>
        )}
      </div>

      <LayoutGroup id="glossary">
        <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            {n > 0 ? (
              <ul id="glossary-results" aria-label="Glossary terms" className="relative grid gap-3 lg:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {visible.map((r, i) => (
                    <GlossaryEntry
                      key={r.entry.id}
                      result={r}
                      tokens={tokens}
                      index={i}
                      expanded={expanded === r.entry.id}
                      wide={wide}
                      explored={explored.ids.has(r.entry.id)}
                      hydrated={hydrated}
                      flash={flash && flash.id === r.entry.id ? flash.n : null}
                      burst={burst && burst.id === r.entry.id ? burst.n : 0}
                      onToggle={toggle}
                      onCollapse={collapse}
                      onOpenRelated={openRelated}
                      registerRef={registerRef}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            ) : (
              <div id="glossary-results">
                <EmptyState
                  query={query}
                  categoryLabel={categoryLabel}
                  allCount={results.length}
                  onQuery={(q) => {
                    setQuery(q);
                    setCategory("all");
                  }}
                  onAllCategories={() => setCategory("all")}
                  onClear={() => {
                    setQuery("");
                    setCategory("all");
                    inputRef.current?.focus({ preventScroll: true });
                  }}
                />
              </div>
            )}
          </div>

          <aside className="hidden lg:block" aria-label="Selected term">
            <div className="sticky top-[120px]">
              <div
                id={DETAIL_PANEL_ID}
                className="panel relative max-h-[calc(100dvh-140px)] overflow-y-auto overflow-x-hidden overscroll-contain p-5 [scrollbar-width:thin]"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-chakra-400/60 to-transparent"
                />
                <AnimatePresence mode="wait" initial={false}>
                  {wide && expandedEntry ? (
                    <motion.div
                      key={expandedEntry.id}
                      role="region"
                      aria-labelledby="glossary-detail-title"
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <EntryDetails
                        entry={expandedEntry}
                        tokens={tokens}
                        explored={explored.ids.has(expandedEntry.id)}
                        hydrated={hydrated}
                        burst={burst && burst.id === expandedEntry.id ? burst.n : 0}
                        variant="panel"
                        headingId="glossary-detail-title"
                        onOpenRelated={openRelated}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <PanelPlaceholder onOpen={(id) => open(id, { mode: "nearest" })} exploredIds={explored.ids} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </aside>
        </div>
      </LayoutGroup>
    </section>
  );
}
