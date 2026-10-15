"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParticleFlight } from "@/components/fx/particle-flight";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { FxPalette } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { ChargerHeader, ResultPanel, RuleLegend, type Phase } from "./chakra-charger/chrome";
import {
  ALL_TERMS,
  BASE_CHAKRA,
  BOARD,
  HAND,
  handEntry,
  ORBS_PER_POINT,
  playCost,
  ROUND,
  sourceAmount,
  SOURCES,
  TERM_STYLES,
  TOTAL_CHAKRA,
  type ChakraSource,
  type Play,
  type PlayMode,
} from "./chakra-charger/data";
import { ChargeFormula, SpendLedger } from "./chakra-charger/formula";
import { HandSlot, type FocusTarget } from "./chakra-charger/hand-slot";
import { SourceTile } from "./chakra-charger/source-tile";
import { useCompact } from "./chakra-charger/use-compact";
import { ChakraVessel, type VesselMood, type VesselPop, type VesselVapor } from "./chakra-charger/vessel";
import type { WidgetProps } from "./types";

const spentOf = (plays: readonly Play[]) => plays.reduce((n, p) => n + p.cost, 0);

const BONUS_TOTAL = ALL_TERMS.filter((t) => t.kind === "bonus").reduce((n, t) => n + t.amount, 0);
const CHARGE_SUMMARY = `${BASE_CHAKRA} base + ${BOARD.length} characters${BONUS_TOTAL ? ` + ${BONUS_TOTAL} CHAKRA +X` : ""}`;

/**
 * Lesson 2 widget. Phase 1: tap each Chakra source so orbs fly into the gauge
 * and the Start-phase formula builds term by term. Phase 2: spend exactly all
 * of it on plays (face-up at printed cost, or hidden for 1). Phase 3: the End
 * phase discards whatever is left; zero waste completes the widget.
 */
export default function ChakraCharger({ onComplete, completed }: WidgetProps) {
  const reduce = useReducedMotion() ?? false;
  const compact = useCompact();
  const { emit, layer } = useParticleFlight();

  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>("charge");
  const [charged, setCharged] = useState<ReadonlySet<string>>(() => new Set());
  const [drops, setDrops] = useState(0);
  const [plays, setPlays] = useState<readonly Play[]>([]);
  const [wasted, setWasted] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  const [splash, setSplash] = useState(0);
  const [burst, setBurst] = useState<{ fire: number; palette: FxPalette }>({ fire: 0, palette: "energy" });
  const [pop, setPop] = useState<VesselPop | null>(null);
  const [vapor, setVapor] = useState<VesselVapor | null>(null);
  const [flashes, setFlashes] = useState<Record<string, number>>({});
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);

  /** Bumped on reset/retry so in-flight particle callbacks from an old run are ignored. */
  const epoch = useRef(0);
  const seq = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const phaseRef = useRef<Phase>("charge");
  const chargedRef = useRef<ReadonlySet<string>>(new Set());
  const playsRef = useRef<readonly Play[]>([]);
  const fullAnnounced = useRef(false);
  const gaugeRef = useRef<HTMLDivElement>(null);
  /** The 9-dot meter in the end bar: the on-screen gauge stand-in on phones. */
  const meterRef = useRef<HTMLSpanElement>(null);
  /** Ignore the second click of a double-click that lands on the slot's swapped-in button. */
  const lockUntil = useRef(0);
  const debounced = () => {
    const now = performance.now();
    if (now < lockUntil.current) return true;
    lockUntil.current = now + 350;
    return false;
  };
  /** On phones the big gauge has scrolled under the sticky nav: use the end-bar dot meter instead. */
  const spendAnchor = (dot: number): HTMLElement | null =>
    (compact ? (meterRef.current?.children[dot] as HTMLElement | undefined) : undefined) ?? gaugeRef.current;
  const cardEls = useRef<Record<string, HTMLElement | null>>({});

  const goPhase = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };
  const commitPlays = (next: readonly Play[]) => {
    playsRef.current = next;
    setPlays(next);
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  };
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  /* ----------------------------- Derived ----------------------------- */

  const chargedTerms = useMemo(() => SOURCES.filter((s) => charged.has(s.id)).flatMap((s) => s.terms), [charged]);
  const allTapped = charged.size === SOURCES.length;
  // `drops` counts Chakra points that have landed in the gauge.
  const landed = Math.min(TOTAL_CHAKRA, drops);
  const fullyCharged = allTapped && drops >= TOTAL_CHAKRA;
  const remaining = TOTAL_CHAKRA - spentOf(plays);
  const level = phase === "charge" ? landed : phase === "spend" ? remaining : 0;

  const mood: VesselMood =
    phase === "charge" ? (fullyCharged ? "ready" : "charging") : phase === "spend" ? "spending" : wasted === 0 ? "zero-waste" : "wasted";
  const caption =
    phase === "charge"
      ? fullyCharged
        ? "Chakra ready"
        : drops === 0
          ? "empty"
          : "charging"
      : phase === "spend"
        ? "left to spend"
        : wasted === 0
          ? "zero waste"
          : "evaporated";

  useEffect(() => {
    if (phase !== "charge" || !fullyCharged || fullAnnounced.current) return;
    fullAnnounced.current = true;
    setBurst((b) => ({ fire: b.fire + 1, palette: "energy" }));
    setAnnounce(`Fully charged: ${TOTAL_CHAKRA} Chakra ready (${CHARGE_SUMMARY}).`);
  }, [phase, fullyCharged]);

  /* ----------------------------- Actions ----------------------------- */

  const charge = (source: ChakraSource, from: HTMLElement | null) => {
    if (phaseRef.current !== "charge" || chargedRef.current.has(source.id)) return;
    const next = new Set(chargedRef.current);
    next.add(source.id);
    chargedRef.current = next;
    setCharged(next);

    const sum = SOURCES.filter((s) => next.has(s.id)).reduce((n, s) => n + sourceAmount(s), 0);
    const parts = source.terms.map((t) => `plus ${t.amount} ${t.label}`).join(", ");
    setAnnounce(`${source.name}: ${parts}. ${sum} of ${TOTAL_CHAKRA} Chakra charged.`);

    const runId = epoch.current;
    source.terms.forEach((term, i) => {
      const fly = () => {
        if (epoch.current !== runId) return;
        // At least 10 orbs per tap; each point lands after its share of orbs arrives.
        const count = Math.max(10, term.amount * ORBS_PER_POINT);
        const palette = TERM_STYLES[term.kind].palette;
        const stagger = term.amount > 2 ? 0.04 : 0.06;
        emit(from, gaugeRef.current, {
          count,
          palette,
          duration: 0.85,
          stagger,
          size: 15,
          onArrive: (i) => {
            if (epoch.current !== runId) return;
            const pts = Math.floor(((i + 1) * term.amount) / count) - Math.floor((i * term.amount) / count);
            if (pts > 0) setDrops((d) => d + pts);
            setSplash((s) => s + 1);
          },
        });
        // Comet tail: a fainter, smaller stream just behind the main orbs.
        if (!reduce) {
          later(() => {
            if (epoch.current === runId) emit(from, gaugeRef.current, { count, palette, duration: 0.85, stagger, size: 6 });
          }, 50);
        }
      };
      if (i === 0 || reduce) fly();
      else later(fly, 340 * i);
    });
  };

  const startSpend = () => {
    if (phaseRef.current !== "charge") return;
    goPhase("spend");
    setAnnounce(`Action phase. You have ${TOTAL_CHAKRA} Chakra. Choose plays that spend exactly all of it.`);
    const first = HAND[0];
    if (first) setFocusTarget({ cardId: first.card.id, which: "play", nonce: ++seq.current });
  };

  const play = (cardId: string, mode: PlayMode) => {
    if (phaseRef.current !== "spend" || debounced()) return;
    const entry = handEntry(cardId);
    if (!entry || playsRef.current.some((p) => p.cardId === cardId)) return;
    const cost = playCost(entry.card, mode);
    const before = TOTAL_CHAKRA - spentOf(playsRef.current);
    if (cost > before) return;
    const left = before - cost;
    commitPlays([...playsRef.current, { id: ++seq.current, cardId, mode, cost }]);
    setPop({ id: ++seq.current, text: `−${cost}`, tone: "drain" });

    const runId = epoch.current;
    emit(spendAnchor(left), cardEls.current[cardId], {
      count: Math.min(18, Math.max(6, cost * ORBS_PER_POINT)),
      palette: mode === "up" ? "energy" : "mist",
      duration: 0.7,
      stagger: 0.04,
      size: 10,
      onDone: () => {
        if (epoch.current !== runId) return;
        setFlashes((f) => ({ ...f, [cardId]: (f[cardId] ?? 0) + 1 }));
      },
    });
    setAnnounce(
      `${entry.card.name} played ${mode === "up" ? "face-up" : "hidden"}: exhausted ${cost} Chakra, ${left} left.` +
        (left === 0 ? " Gauge empty. End the Round when you're ready." : ""),
    );
    setFocusTarget({ cardId, which: "undo", nonce: ++seq.current });
  };

  const undo = (cardId: string) => {
    if (phaseRef.current !== "spend" || debounced()) return;
    const target = playsRef.current.find((p) => p.cardId === cardId);
    if (!target) return;
    const next = playsRef.current.filter((p) => p.cardId !== cardId);
    commitPlays(next);
    setPop({ id: ++seq.current, text: `+${target.cost}`, tone: "gain" });

    const runId = epoch.current;
    emit(cardEls.current[cardId], spendAnchor(TOTAL_CHAKRA - spentOf(next) - 1), {
      count: Math.min(18, Math.max(6, target.cost * ORBS_PER_POINT)),
      palette: "energy",
      duration: 0.7,
      stagger: 0.04,
      size: 10,
      onArrive: () => {
        if (epoch.current === runId) setSplash((s) => s + 1);
      },
    });
    const name = handEntry(cardId)?.card.name ?? "Card";
    setAnnounce(`Took back ${name}: ${target.cost} Chakra refunded, ${TOTAL_CHAKRA - spentOf(next)} left.`);
    setFocusTarget({ cardId, which: "play", nonce: ++seq.current });
  };

  const endRound = () => {
    if (phaseRef.current !== "spend") return;
    const left = TOTAL_CHAKRA - spentOf(playsRef.current);
    goPhase("end");
    setWasted(left);
    // Phones: the gauge (drain or zero-waste burst) sits above the hand, off-screen.
    if (compact) gaugeRef.current?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    if (left > 0) {
      setVapor({ id: ++seq.current, amount: left, from: left / TOTAL_CHAKRA });
      setPop({ id: ++seq.current, text: `−${left} wasted`, tone: "waste" });
      setAnnounce(`End phase: ${left} Chakra wasted. Leftover Chakra is discarded in the End phase. Try a different combination.`);
    } else {
      setPop(null);
      setBurst((b) => ({ fire: b.fire + 1, palette: "leaf" }));
      setAnnounce(`End phase: zero waste! All ${TOTAL_CHAKRA} Chakra spent. Chakra Charger cleared.`);
      onComplete();
    }
  };

  const retrySpend = () => {
    epoch.current += 1;
    clearTimers();
    commitPlays([]);
    setWasted(null);
    setVapor(null);
    setPop({ id: ++seq.current, text: `+${TOTAL_CHAKRA}`, tone: "gain" });
    setFlashes({});
    goPhase("spend");
    setAnnounce(`Rewound to the Action phase with ${TOTAL_CHAKRA} Chakra. Try a different combination.`);
    const first = HAND[0];
    if (first) setFocusTarget({ cardId: first.card.id, which: "play", nonce: ++seq.current });
  };

  const reset = () => {
    epoch.current += 1;
    clearTimers();
    chargedRef.current = new Set();
    setCharged(chargedRef.current);
    setDrops(0);
    setSplash(0);
    commitPlays([]);
    setWasted(null);
    setVapor(null);
    setPop(null);
    setFlashes({});
    setFocusTarget(null);
    fullAnnounced.current = false;
    goPhase("charge");
    setRun((r) => r + 1);
    setAnnounce(`Reset. Round ${ROUND}, Start phase: tap each Chakra source to charge your gauge.`);
  };

  const registerEl = useCallback((cardId: string, el: HTMLElement | null) => {
    cardEls.current[cardId] = el;
  }, []);

  /* ------------------------------ Render ----------------------------- */

  const statusLine =
    phase === "charge"
      ? fullyCharged
        ? { tone: "text-energy-200", icon: "sparkles" as const, text: `${TOTAL_CHAKRA} Chakra ready` }
        : { tone: "text-ash-400", icon: "bolt" as const, text: `${charged.size} of ${SOURCES.length} sources charged` }
      : phase === "spend"
        ? remaining === 0
          ? { tone: "text-leaf-300", icon: "check" as const, text: "Gauge empty: zero waste" }
          : { tone: "text-chakra-200", icon: "hand" as const, text: `${remaining} Chakra still to spend` }
        : wasted === 0
          ? { tone: "text-leaf-300", icon: "trophy" as const, text: "Every point spent" }
          : { tone: "text-blood-400", icon: "x" as const, text: `${wasted ?? 0} Chakra discarded` };

  return (
    <section aria-label="Chakra Charger" className="panel relative p-3.5 sm:p-6">
      {layer}
      {/* Decorative backdrop. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-energy-500/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-mist-600/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(125,220,255,0.12)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(180deg,black,transparent_70%)]" />
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>

      <div className="relative">
        <ChargerHeader phase={phase} completed={completed} onReset={reset} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8">
          {/* Gauge */}
          <div className="flex min-w-0 flex-col items-center gap-4 lg:col-start-1 lg:row-start-1 lg:pt-2">
            <ChakraVessel
              ref={gaugeRef}
              level={level}
              max={TOTAL_CHAKRA}
              mood={mood}
              caption={caption}
              splash={splash}
              burst={burst.fire}
              burstPalette={burst.palette}
              pop={pop}
              vapor={vapor}
              slowDrain={phase === "end"}
              reduce={reduce}
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={statusLine.text}
                className={cn("flex items-center gap-1.5 text-[13px] font-bold", statusLine.tone)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <Icon name={statusLine.icon} size={14} strokeWidth={2.4} />
                {statusLine.text}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Stage */}
          <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <AnimatePresence mode="wait" initial={false}>
              {phase === "charge" ? (
                <motion.div
                  key={`charge-${run}`}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="eyebrow text-ash-300">Your Chakra sources</p>
                    <p className="text-[12px] font-semibold text-ash-500">
                      Naruto, Choji and a face-down ally are already on your side of the board.
                    </p>
                  </div>
                  <ul className="mt-4 grid grid-cols-2 justify-items-center gap-x-3 gap-y-5 md:grid-cols-4" aria-label="Chakra sources">
                    {SOURCES.map((s, i) => (
                      <SourceTile
                        key={s.id}
                        source={s}
                        charged={charged.has(s.id)}
                        onCharge={charge}
                        index={i}
                        reduce={reduce}
                        compact={compact}
                      />
                    ))}
                  </ul>
                  <AnimatePresence>
                    {fullyCharged && (
                      <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.2 }}
                        className="mt-6 flex flex-col gap-3 rounded-2xl border border-energy-300/30 bg-gradient-to-r from-energy-500/20 via-energy-500/[0.06] to-transparent p-4 shadow-[0_0_40px_-18px_rgba(56,196,255,0.8)] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-energy-200 to-energy-500 text-shadow-950 shadow-[0_0_18px_rgba(56,196,255,0.7)]"
                          >
                            <Icon name="bolt" size={20} strokeWidth={2.4} />
                          </span>
                          <div className="min-w-0">
                            <p className="font-black text-white">{TOTAL_CHAKRA} Chakra ready</p>
                            <p className="text-[13px] leading-snug text-ash-400">{CHARGE_SUMMARY}. Now spend every drop.</p>
                          </div>
                        </div>
                        <Button variant="energy" onClick={startSpend} className="self-start sm:self-auto">
                          Start the Action phase
                          <Icon name="arrow-right" size={16} />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key={`hand-${run}`}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="eyebrow text-ash-300">Your hand</p>
                    <p className="text-[12px] font-semibold text-ash-500">
                      In a real Round you play one card per turn; here you plan the whole spend.
                    </p>
                  </div>
                  <ul className="mt-5 grid grid-cols-2 justify-items-center gap-x-3 gap-y-6 md:grid-cols-4" aria-label="Cards in hand">
                    {HAND.map((h, i) => (
                      <HandSlot
                        key={h.card.id}
                        card={h.card}
                        play={plays.find((p) => p.cardId === h.card.id)}
                        remaining={remaining}
                        locked={phase === "end"}
                        compact={compact}
                        index={i}
                        flash={flashes[h.card.id] ?? 0}
                        focusTarget={focusTarget}
                        reduce={reduce}
                        registerEl={registerEl}
                        onPlay={play}
                        onUndo={undo}
                      />
                    ))}
                  </ul>

                  <AnimatePresence mode="wait" initial={false}>
                    {phase === "spend" ? (
                      <motion.div
                        key="end-bar"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.25 }}
                        className={cn(
                          "mt-6 flex flex-col gap-3 rounded-2xl border p-4 transition-colors duration-500 sm:flex-row sm:items-center sm:justify-between",
                          remaining === 0 ? "border-leaf-400/35 bg-leaf-500/[0.07]" : "border-white/[0.07] bg-white/[0.03]",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span ref={meterRef} aria-hidden="true" className="flex max-w-[132px] shrink-0 flex-wrap gap-1">
                            {Array.from({ length: TOTAL_CHAKRA }, (_, i) => (
                              <span
                                key={i}
                                className={cn(
                                  "h-2.5 w-2.5 rounded-full transition-all duration-300",
                                  i < remaining
                                    ? "bg-gradient-to-br from-energy-200 to-energy-500 shadow-[0_0_6px_rgba(56,196,255,0.9)]"
                                    : "border border-chakra-400/40 bg-chakra-500/10",
                                )}
                              />
                            ))}
                          </span>
                          <p className="text-[13px] leading-snug text-ash-300">
                            {remaining === 0 ? (
                              <>
                                <strong className="font-black text-leaf-300">Gauge empty.</strong> Every point is on the board.
                              </>
                            ) : (
                              <>
                                <strong className="font-black text-white">{remaining} Chakra</strong> unspent. Leftovers are discarded in
                                the End phase.
                              </>
                            )}
                          </p>
                        </div>
                        <motion.div
                          className="self-start rounded-xl sm:self-auto"
                          animate={
                            remaining === 0 && !reduce
                              ? {
                                  boxShadow: ["0 0 0px rgba(74,222,128,0)", "0 0 26px rgba(74,222,128,0.55)", "0 0 0px rgba(74,222,128,0)"],
                                }
                              : { boxShadow: "0 0 0px rgba(74,222,128,0)" }
                          }
                          transition={remaining === 0 && !reduce ? { duration: 1.8, repeat: Infinity } : { duration: 0.2 }}
                        >
                          <Button variant={remaining === 0 ? "success" : "secondary"} onClick={endRound}>
                            <Icon name="flag" size={15} />
                            Pass &amp; end the Round
                          </Button>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <ResultPanel key="result" wasted={wasted ?? 0} plays={plays} onRetry={retrySpend} onReplay={reset} />
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Formula / ledger: under the gauge on desktop, after the cards on mobile. */}
          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            {phase === "charge" ? (
              <ChargeFormula terms={chargedTerms} current={Math.floor(landed + 1e-6)} complete={fullyCharged} />
            ) : (
              <SpendLedger total={TOTAL_CHAKRA} plays={plays} remaining={remaining} ended={phase === "end"} />
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-white/[0.06] pt-5">
          <RuleLegend />
        </div>
      </div>
    </section>
  );
}
