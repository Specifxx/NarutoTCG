"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button, buttonClasses } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { RichText } from "@/components/ui/rich-text";
import type { QuizQuestion, TutorialLesson } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { useProgress, XP } from "@/lib/progress";
import { plainText } from "@/lib/rich-text";
import { ProgressRing } from "./progress-ring";
import type { LessonKeys } from "./types";

const LETTERS = ["A", "B", "C", "D"] as const;
const STICKY_OFFSET = 184;
const LOCAL_KEYS = "input, textarea, select, [role='tablist'], [role='slider'], [role='listbox'], [role='menu']";

type ChoiceState = "idle" | "correct" | "wrong" | "muted";

const CHOICE_STYLES: Record<ChoiceState, { box: string; badge: string }> = {
  idle: {
    box: "border-white/10 bg-white/[0.03] text-ash-100 hover:border-white/25 hover:bg-white/[0.06]",
    badge: "bg-white/[0.07] text-ash-300 group-hover:bg-white/[0.12] group-hover:text-white",
  },
  correct: {
    box: "border-leaf-400/60 bg-leaf-500/[0.12] text-white shadow-[0_0_32px_-8px_rgba(74,222,128,0.65)]",
    badge: "bg-leaf-400 text-shadow-950",
  },
  wrong: {
    box: "border-blood-400/60 bg-blood-500/[0.12] text-white shadow-[0_0_32px_-10px_rgba(239,64,96,0.6)]",
    badge: "bg-blood-500 text-white",
  },
  muted: { box: "border-white/5 bg-white/[0.02] text-ash-500", badge: "bg-white/[0.04] text-ash-500" },
};

function ChoiceButton({
  index,
  text,
  state,
  locked,
  picked,
  burst,
  onPick,
}: {
  index: number;
  text: string;
  state: ChoiceState;
  locked: boolean;
  picked: boolean;
  burst: number;
  onPick: () => void;
}) {
  const s = CHOICE_STYLES[state];
  const tag = state === "correct" ? (picked ? "Correct" : "Right answer") : state === "wrong" ? "Your answer" : null;
  return (
    <motion.button
      type="button"
      onClick={onPick}
      aria-disabled={locked || undefined}
      animate={state === "wrong" ? { x: [0, -10, 10, -7, 7, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      whileTap={locked ? undefined : { scale: 0.985 }}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:gap-4 sm:p-4",
        s.box,
        locked && "cursor-default",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black transition-colors duration-200",
          s.badge,
        )}
        aria-hidden="true"
      >
        {state === "correct" ? (
          <Icon name="check" size={18} strokeWidth={3} />
        ) : state === "wrong" ? (
          <Icon name="x" size={18} strokeWidth={3} />
        ) : (
          LETTERS[index]
        )}
      </span>
      <span className="sr-only">Choice {LETTERS[index]}: </span>
      <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug sm:text-base">{text}</span>
      {tag && (
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wider",
            state === "correct" ? "bg-leaf-400/15 text-leaf-300" : "bg-blood-500/20 text-blood-400",
          )}
        >
          <span className="sr-only">, </span>
          {tag}
        </span>
      )}
      <ParticleBurst fire={state === "correct" && picked ? burst : 0} palette="leaf" shape="mixed" count={20} spread={120} />
    </motion.button>
  );
}

function ScoreSummary({
  score,
  total,
  passedBefore,
  awarded,
  attempt,
  onRetry,
  onReview,
  results,
  quiz,
}: {
  score: number;
  total: number;
  passedBefore: boolean;
  awarded: boolean;
  attempt: number;
  onRetry: () => void;
  onReview: () => void;
  results: ReadonlyArray<boolean | undefined>;
  quiz: readonly QuizQuestion[];
}) {
  const perfect = score === total;
  const [fire, setFire] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    if (!perfect) return;
    const t = window.setTimeout(() => setFire((f) => f + 1), 250);
    const t2 = window.setTimeout(() => setFire((f) => f + 1), 700);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [perfect, attempt]);

  const heading = perfect ? "Flawless checkpoint!" : score === 0 ? "Back to the scrolls" : "So close";
  const message = perfect
    ? awarded
      ? `Test star earned · +${XP.quizPerfect} XP`
      : passedBefore
        ? "You already hold this star. A sharp refresher!"
        : "Perfect score."
    : `You answered ${score} of ${total} correctly. A perfect run earns the Test star and +${XP.quizPerfect} XP.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: "spring", stiffness: 200, damping: 22, opacity: { duration: 0.25 } },
      }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.16, ease: "easeIn" } }}
      className={cn("panel relative mx-auto max-w-2xl p-6 text-center sm:p-10", perfect && "border-gold-400/30")}
    >
      {perfect && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-40 max-w-md rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(245,197,66,0.55), transparent 70%)" }}
        />
      )}
      <div className="relative mx-auto w-fit">
        <ParticleBurst fire={fire} palette="gold" shape="star" count={34} spread={190} duration={1.1} />
        <ProgressRing
          value={score / Math.max(1, total)}
          size={150}
          stroke={10}
          colors={perfect ? ["#fdeaa8", "#f5c542", "#d9a514"] : ["#ffd8b0", "#ff7a1a", "#ef4060"]}
          label={`${score} of ${total} correct`}
        >
          <span className="text-4xl font-black tabular-nums text-white">
            <AnimatedNumber value={score} />
            <span className="text-lg text-ash-500">/{total}</span>
          </span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ash-400">correct</span>
        </ProgressRing>
      </div>

      <h2
        ref={headingRef}
        tabIndex={-1}
        className={cn(
          "relative mt-6 text-3xl font-black tracking-tight focus:outline-none sm:text-4xl",
          perfect ? "text-gold-gradient" : "text-white",
        )}
      >
        {heading}
      </h2>
      <p className="relative mt-2 text-[15px] text-ash-300" role="status">
        {message}
      </p>

      <ol className="relative mx-auto mt-6 max-w-lg space-y-2 text-left" aria-label="Your answers">
        {quiz.map((q, i) => {
          const ok = results[i] === true;
          return (
            <motion.li
              key={q.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5"
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  ok ? "bg-leaf-400 text-shadow-950" : "bg-blood-500 text-white",
                )}
              >
                <Icon name={ok ? "check" : "x"} size={12} strokeWidth={3.2} />
              </span>
              <span className="min-w-0 text-[13.5px] leading-snug text-ash-300">
                <span className="sr-only">{ok ? "Correct: " : "Incorrect: "}</span>
                {plainText(q.prompt)}
              </span>
            </motion.li>
          );
        })}
      </ol>

      <div className="relative mt-7 flex flex-wrap justify-center gap-3">
        {perfect ? (
          <Button variant="secondary" onClick={onRetry}>
            <Icon name="refresh" size={16} />
            Retake checkpoint
          </Button>
        ) : (
          <>
            <Button onClick={onRetry}>
              <Icon name="refresh" size={16} />
              Retry checkpoint
            </Button>
            <Button variant="secondary" onClick={onReview}>
              <Icon name="book" size={16} />
              Review the lesson
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Test stage: a one-question-at-a-time checkpoint with instant feedback.
 * A perfect score awards the Test star; otherwise the learner can retry.
 */
export function TestStage({
  lesson,
  keys,
  onStarEarned,
  onReview,
}: {
  lesson: TutorialLesson;
  keys: LessonKeys;
  onStarEarned: () => void;
  onReview: () => void;
}) {
  const { hydrated, has, award } = useProgress();
  const reduce = useReducedMotion();
  const a = ACCENT_STYLES[lesson.accent];
  const quiz = lesson.quiz;
  const total = quiz.length;

  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<Array<boolean | undefined>>([]);
  const [summary, setSummary] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [burst, setBurst] = useState(0);
  const [awarded, setAwarded] = useState(false);

  const nextRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);

  const passed = hydrated && has(keys.quiz);
  const question = quiz[Math.min(qi, total - 1)]!;
  const score = results.filter((r) => r === true).length;
  const answered = picked !== null;
  const correct = answered && picked === question.answerIndex;

  const choose = useCallback(
    (i: number) => {
      if (picked !== null || summary) return;
      setPicked(i);
      const ok = i === question.answerIndex;
      setResults((r) => {
        const next = [...r];
        next[qi] = ok;
        return next;
      });
      if (ok) setBurst((b) => b + 1);
    },
    [picked, summary, question.answerIndex, qi],
  );

  const scrollToTop = useCallback(() => {
    const el = topRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < STICKY_OFFSET - 40) {
      window.scrollTo({ top: window.scrollY + top - STICKY_OFFSET, behavior: reduce ? "auto" : "smooth" });
    }
  }, [reduce]);

  const advance = () => {
    if (picked === null) return;
    if (qi + 1 < total) {
      pendingFocus.current = true;
      setQi(qi + 1);
      setPicked(null);
      scrollToTop();
      return;
    }
    setSummary(true);
    scrollToTop();
    const allRight = quiz.every((_, i) => results[i] === true);
    if (allRight) {
      // Only ever set (never clear) here: a stale double-click during the exit animation must not undo it.
      if (award(keys.quiz, XP.quizPerfect, `${lesson.title} checkpoint aced`)) {
        setAwarded(true);
        onStarEarned();
      }
    }
  };

  const retry = () => {
    pendingFocus.current = true;
    setQi(0);
    setPicked(null);
    setResults([]);
    setSummary(false);
    setAwarded(false);
    setAttempt((n) => n + 1);
    scrollToTop();
  };

  // After answering: reveal the explanation and move focus to "Next".
  useEffect(() => {
    if (picked === null) return;
    const t = window.setTimeout(() => {
      // Bring the explanation and Next button into view, but never push the question card under the sticky tabs.
      const fb = feedbackRef.current;
      if (fb) {
        const want = (nextRef.current ?? fb).getBoundingClientRect().bottom + 24 - window.innerHeight;
        const card = fb.closest(".panel") ?? fb;
        const cap = card.getBoundingClientRect().top - STICKY_OFFSET;
        const delta = Math.min(want, cap);
        if (delta > 0) window.scrollTo({ top: window.scrollY + delta, behavior: reduce ? "auto" : "smooth" });
      }
      nextRef.current?.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(t);
  }, [picked, reduce]);

  // 1–4 or A–D answer the current question.
  useEffect(() => {
    if (summary || picked !== null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || t.closest(LOCAL_KEYS))) return;
      const k = e.key.toLowerCase();
      let i = ["1", "2", "3", "4"].indexOf(k);
      if (i === -1) i = ["a", "b", "c", "d"].indexOf(k);
      if (i === -1 || i >= question.choices.length) return;
      e.preventDefault();
      choose(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [summary, picked, question.choices.length, choose]);

  // Stable callback ref: moves focus to a newly mounted question after Next/Retry.
  const focusOnMount = useCallback((el: HTMLHeadingElement | null) => {
    if (el && pendingFocus.current) {
      pendingFocus.current = false;
      el.focus({ preventScroll: true });
    }
  }, []);

  return (
    <section aria-labelledby="test-title" ref={topRef}>
      <h2 id="test-title" className="sr-only">
        Checkpoint quiz
      </h2>
      <AnimatePresence mode="wait" initial={false}>
        {summary ? (
          <ScoreSummary
            key={`summary-${attempt}`}
            score={score}
            total={total}
            passedBefore={passed && !awarded}
            awarded={awarded}
            attempt={attempt}
            onRetry={retry}
            onReview={onReview}
            results={results}
            quiz={quiz}
          />
        ) : (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-7"
          >
            <aside className="panel relative overflow-hidden p-4 sm:p-5 lg:sticky lg:top-[184px] lg:self-start">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${a.hex[1]}, transparent)` }}
              />
              <div className="flex items-center justify-between gap-3 lg:block">
                <div>
                  <p className={cn("eyebrow flex items-center gap-2", a.text)}>
                    <Icon name="flag" size={13} />
                    Checkpoint
                  </p>
                  <p className="mt-1 text-xl font-black tabular-nums text-white lg:text-2xl">
                    Question {qi + 1}
                    <span className="text-ash-500"> / {total}</span>
                  </p>
                </div>
                <ol className="flex flex-wrap gap-1.5 lg:mt-4" aria-label="Question progress">
                  {quiz.map((q, i) => {
                    const r = results[i];
                    const current = i === qi;
                    return (
                      <li
                        key={q.id}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] font-black transition-colors",
                          r === true && "border-leaf-400/50 bg-leaf-500/20 text-leaf-300",
                          r === false && "border-blood-400/50 bg-blood-500/20 text-blood-400",
                          r === undefined && current && cn(a.border, a.softBg, "text-white"),
                          r === undefined && !current && "border-white/10 bg-white/[0.03] text-ash-500",
                        )}
                        aria-label={`Question ${i + 1}: ${r === true ? "correct" : r === false ? "incorrect" : current ? "current" : "not answered"}`}
                      >
                        {r === true ? (
                          <Icon name="check" size={13} strokeWidth={3} />
                        ) : r === false ? (
                          <Icon name="x" size={13} strokeWidth={3} />
                        ) : (
                          i + 1
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
              <p className="mt-4 hidden text-[13px] leading-relaxed text-ash-400 sm:block">
                {passed ? (
                  <>
                    <span className="font-semibold text-gold-200">Star earned.</span> Retake it any time to stay sharp.
                  </>
                ) : (
                  <>
                    Answer every question correctly to earn the <span className="font-semibold text-gold-200">Test star</span>{" "}
                    and +{XP.quizPerfect} XP.
                  </>
                )}
              </p>
              <p className="mt-3 hidden text-[11px] text-ash-500 lg:block">
                Tip: press{" "}
                <kbd className="rounded border border-white/10 bg-white/5 px-1 font-sans text-ash-300">1</kbd>–
                <kbd className="rounded border border-white/10 bg-white/5 px-1 font-sans text-ash-300">
                  {question.choices.length}
                </kbd>{" "}
                to answer.
              </p>
            </aside>

            <div className="min-w-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${attempt}-${question.id}`}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.22 } },
                  }}
                  exit={{ opacity: 0, x: -40, transition: { duration: 0.16, ease: "easeIn" } }}
                  className="panel relative p-5 sm:p-7"
                >
                  <p className="eyebrow text-ash-500">Question {qi + 1}</p>
                  <h3
                    ref={focusOnMount}
                    tabIndex={-1}
                    className="mt-2 text-balance text-xl font-black leading-snug text-white focus:outline-none sm:text-2xl"
                  >
                    <RichText text={question.prompt} />
                  </h3>

                  <div role="group" aria-label="Answer choices" className="mt-5 grid gap-2.5 sm:gap-3">
                    {question.choices.map((choice, i) => {
                      let state: ChoiceState = "idle";
                      if (answered) {
                        if (i === question.answerIndex) state = "correct";
                        else if (i === picked) state = "wrong";
                        else state = "muted";
                      }
                      return (
                        <ChoiceButton
                          key={i}
                          index={i}
                          text={plainText(choice)}
                          state={state}
                          locked={answered}
                          picked={i === picked}
                          burst={burst}
                          onPick={() => choose(i)}
                        />
                      );
                    })}
                  </div>

                  <div ref={feedbackRef} aria-live="polite" aria-atomic="true" className="scroll-mb-6">
                    <AnimatePresence>
                      {answered && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          transition={{ type: "spring", stiffness: 240, damping: 26 }}
                          className="overflow-hidden"
                        >
                          <div
                            className={cn(
                              "mt-5 rounded-2xl border p-4 sm:p-5",
                              correct ? "border-leaf-400/30 bg-leaf-500/[0.07]" : "border-blood-400/30 bg-blood-500/[0.07]",
                            )}
                          >
                            <p
                              className={cn(
                                "flex items-center gap-2 text-base font-black",
                                correct ? "text-leaf-300" : "text-blood-400",
                              )}
                            >
                              <Icon name={correct ? "check" : "x"} size={18} strokeWidth={3} />
                              {correct ? "Correct!" : "Not quite."}
                            </p>
                            <RichText
                              as="p"
                              text={question.explanation}
                              className="mt-1.5 text-[14.5px] leading-relaxed text-ash-200"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold tabular-nums text-ash-500">
                      {score} correct so far
                    </span>
                    <button
                      ref={nextRef}
                      type="button"
                      onClick={advance}
                      disabled={!answered}
                      className={buttonClasses(correct ? "success" : "primary", "md")}
                    >
                      {qi + 1 < total ? "Next question" : "See results"}
                      <Icon name="arrow-right" size={16} />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
