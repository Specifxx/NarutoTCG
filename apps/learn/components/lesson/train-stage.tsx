"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { RichText } from "@/components/ui/rich-text";
import { LessonWidget } from "@/components/widgets/registry";
import { WidgetSkeleton } from "@/components/widgets/widget-shell";
import type { TutorialLesson } from "@/content/schema";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { useProgress, XP } from "@/lib/progress";
import type { LessonKeys } from "./types";

const RIBBON_CLIP = "polygon(0 0, 100% 0, 95% 50%, 100% 100%, 0 100%, 5% 50%)";

/** Notched "Training complete" ribbon. */
function TrainingRibbon() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, rotate: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 14 }}
      className="relative"
    >
      <span
        className="relative flex items-center gap-2 bg-gradient-to-r from-leaf-300 via-leaf-400 to-leaf-500 px-6 py-2 text-[13px] font-black uppercase tracking-[0.14em] text-shadow-950 shadow-[0_0_30px_-6px_rgba(74,222,128,0.7)]"
        style={{ clipPath: RIBBON_CLIP }}
      >
        <Icon name="check" size={16} strokeWidth={3} />
        Training complete
      </span>
    </motion.div>
  );
}

/**
 * Train stage: the lesson's mini-widget with its brief. Completing the widget
 * awards the Train star (once) and unlocks a hand-off to the checkpoint.
 */
export function TrainStage({
  lesson,
  keys,
  celebrateLearn,
  onStarEarned,
  onContinue,
}: {
  lesson: TutorialLesson;
  keys: LessonKeys;
  /** Show the "Lesson complete" hand-off banner (just finished Learn). */
  celebrateLearn: boolean;
  onStarEarned: () => void;
  onContinue: () => void;
}) {
  const { hydrated, has, award } = useProgress();
  const a = ACCENT_STYLES[lesson.accent];
  const done = hydrated && has(keys.widget);
  const quizDone = hydrated && has(keys.quiz);
  const learnDone = hydrated && has(keys.complete);
  const remaining = !quizDone && !learnDone ? "Finish the steps and ace the checkpoint" : !quizDone ? "One more to go: ace the checkpoint" : !learnDone ? "One more to go: finish the Learn steps" : "";
  const [burst, setBurst] = useState(0);
  const title = lesson.widget.title;

  const onComplete = useCallback(() => {
    if (award(keys.widget, XP.widgetComplete, `${title} cleared`)) {
      setBurst((b) => b + 1);
      onStarEarned();
    }
  }, [award, keys.widget, title, onStarEarned]);

  return (
    <section aria-labelledby="train-title" className="space-y-6">
      <AnimatePresence initial={false}>
        {celebrateLearn && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative flex items-center gap-3 rounded-2xl border border-gold-400/30 bg-gradient-to-r from-gold-400/15 via-gold-400/5 to-transparent px-4 py-3"
            role="status"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-200 to-gold-500 text-shadow-950">
              <Icon name="star" size={18} strokeWidth={2.4} />
            </span>
            <p className="text-sm text-ash-200">
              <span className="font-black text-gold-200">Lesson complete.</span> You&apos;ve learned the rules. Now put them
              into practice.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className={cn("eyebrow flex items-center gap-2", a.text)}>
            <Icon name="target" size={13} />
            Training ground
          </p>
          <h2 id="train-title" className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
          <RichText as="p" text={lesson.widget.brief} className="mt-2 text-[15px] leading-relaxed text-ash-400 sm:text-base" />
        </div>
        <div className="relative shrink-0 self-start sm:self-end" aria-live="polite">
          <ParticleBurst fire={burst} palette="leaf" shape="mixed" count={28} spread={130} />
          {done ? (
            <TrainingRibbon />
          ) : (
            <span className="flex items-center gap-2 rounded-xl border border-gold-400/25 bg-gold-400/[0.07] px-3 py-2 text-[13px] font-bold text-gold-200">
              <Icon name="sparkles" size={15} />
              Clear it for +{XP.widgetComplete} XP
            </span>
          )}
        </div>
      </div>

      <div className="relative min-w-0">
        {hydrated ? (
          <LessonWidget id={lesson.widget.id} completed={done} onComplete={onComplete} />
        ) : (
          <WidgetSkeleton />
        )}
      </div>

      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.2 }}
            className="panel flex flex-col items-start gap-4 border-leaf-400/20 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-leaf-500/15 text-leaf-300 ring-1 ring-leaf-400/30">
                <Icon name="check" size={20} strokeWidth={2.6} />
              </span>
              <div>
                <p className="font-bold text-white">Train star earned</p>
                <p className="text-sm text-ash-400">
                  {remaining ? `${remaining} to master this lesson.` : "Every star for this lesson is yours."}
                </p>
              </div>
            </div>
            <Button variant="success" onClick={onContinue}>
              {quizDone ? "Retake the checkpoint" : "Take the checkpoint"}
              <Icon name="arrow-right" size={16} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
