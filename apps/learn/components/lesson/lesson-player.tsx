"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TutorialLesson } from "@/content/schema";
import { useProgress, XP } from "@/lib/progress";
import { LearnStage } from "./learn-stage";
import { LessonHeader } from "./lesson-header";
import { LessonPager } from "./lesson-pager";
import { MasteryBanner } from "./mastery-banner";
import { STAGE_PANEL_ID, StageTabs, stageTabId } from "./stage-tabs";
import { TestStage } from "./test-stage";
import { TrainStage } from "./train-stage";
import { isStage, stageIndex, type LessonKeys, type LessonSummary, type Stage } from "./types";
import { useLessonStars } from "./use-lesson-progress";

/** Height of the sticky site header plus the sticky stage tabs, with breathing room. */
const STICKY_OFFSET = 184;

const stageSlide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 40 }),
  center: {
    opacity: 1,
    x: 0,
    transition: { x: { type: "spring", stiffness: 260, damping: 30 }, opacity: { duration: 0.25 } },
  },
  exit: (dir: number) => ({ opacity: 0, x: dir * -40, transition: { duration: 0.16, ease: "easeIn" } }),
};

/**
 * Interactive lesson: header, sticky Learn → Train → Test tabs, the active
 * stage, the mastery banner and lesson pager. Supports `?stage=train|test`
 * deep links (read on mount, mirrored back into the URL).
 */
export function LessonPlayer({
  lesson,
  keys,
  total,
  prev,
  next,
}: {
  lesson: TutorialLesson;
  keys: LessonKeys;
  total: number;
  prev?: LessonSummary;
  next?: LessonSummary;
}) {
  const { award } = useProgress();
  const reduce = useReducedMotion();
  const stars = useLessonStars(keys);

  const [stage, setStage] = useState<Stage>("learn");
  const [stageDir, setStageDir] = useState(1);
  const [pos, setPos] = useState({ index: 0, max: 0 });
  const [bursts, setBursts] = useState<Record<Stage, number>>({ learn: 0, train: 0, test: 0 });
  const [celebrateLearn, setCelebrateLearn] = useState(false);
  const [masteryCelebration, setMasteryCelebration] = useState(0);

  const panelRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLElement>(null);
  const wasMastered = useRef<boolean | null>(null);
  const urlSynced = useRef(false);

  // Deep link: /how-to-play/<id>?stage=train|test
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("stage");
    if (isStage(requested) && requested !== "learn") setStage(requested);
  }, []);

  // Mirror the stage into the query string so the view can be shared or reloaded.
  useEffect(() => {
    if (!urlSynced.current) {
      urlSynced.current = true;
      return;
    }
    const url = new URL(window.location.href);
    if (stage === "learn") url.searchParams.delete("stage");
    else url.searchParams.set("stage", stage);
    if (url.href !== window.location.href) window.history.replaceState(null, "", url.href);
  }, [stage]);

  // Celebrate the moment all three stars land (not when revisiting a mastered lesson).
  useEffect(() => {
    if (!stars.hydrated) return;
    if (wasMastered.current === null) {
      wasMastered.current = stars.mastered;
      return;
    }
    if (stars.mastered === wasMastered.current) return;
    wasMastered.current = stars.mastered;
    if (!stars.mastered) return;
    setMasteryCelebration((c) => c + 1);
    const t = window.setTimeout(() => {
      bannerRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    }, 700);
    return () => window.clearTimeout(t);
  }, [stars.hydrated, stars.mastered, reduce]);

  const burstStage = useCallback((s: Stage) => setBursts((b) => ({ ...b, [s]: b[s] + 1 })), []);
  const onTrainStar = useCallback(() => burstStage("train"), [burstStage]);
  const onTestStar = useCallback(() => burstStage("test"), [burstStage]);
  const onGo = useCallback((to: number) => setPos((p) => ({ index: to, max: Math.max(p.max, to) })), []);

  const goStage = (to: Stage) => {
    if (to === stage) return;
    setStageDir(stageIndex(to) > stageIndex(stage) ? 1 : -1);
    setStage(to);
    // Coming from the bottom of a long stage: bring the new stage's top into view.
    requestAnimationFrame(() => {
      const el = panelRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (top < STICKY_OFFSET - 20) {
        window.scrollTo({ top: window.scrollY + top - STICKY_OFFSET, behavior: reduce ? "auto" : "smooth" });
      }
    });
  };

  const finishLearn = () => {
    const newly = award(keys.complete, XP.lessonComplete, `${lesson.title} complete`);
    burstStage("learn");
    if (newly) setCelebrateLearn(true);
    goStage("train");
  };

  const reviewLesson = () => {
    setPos((p) => ({ ...p, index: 0 }));
    goStage("learn");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <LessonHeader lesson={lesson} total={total} stars={stars} />

      <StageTabs
        stage={stage}
        onSelect={goStage}
        accent={lesson.accent}
        earned={stars.earned}
        hydrated={stars.hydrated}
        hints={{
          learn: `${lesson.steps.length} steps`,
          train: "Mini-widget",
          test: `${lesson.quiz.length} question${lesson.quiz.length === 1 ? "" : "s"}`,
        }}
        bursts={bursts}
      />

      <div
        ref={panelRef}
        id={STAGE_PANEL_ID}
        role="tabpanel"
        aria-labelledby={stageTabId(stage)}
        className="relative mt-6 sm:mt-8"
      >
        <AnimatePresence mode="wait" initial={false} custom={stageDir}>
          <motion.div key={stage} custom={stageDir} variants={stageSlide} initial="enter" animate="center" exit="exit">
            {stage === "learn" && (
              <LearnStage
                lesson={lesson}
                index={pos.index}
                maxSeen={pos.max}
                learned={stars.earned[0]}
                onGo={onGo}
                onFinish={finishLearn}
              />
            )}
            {stage === "train" && (
              <TrainStage
                lesson={lesson}
                keys={keys}
                celebrateLearn={celebrateLearn}
                onStarEarned={onTrainStar}
                onContinue={() => goStage("test")}
              />
            )}
            {stage === "test" && (
              <TestStage lesson={lesson} keys={keys} onStarEarned={onTestStar} onReview={reviewLesson} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {stars.mastered && (
        <MasteryBanner
          ref={bannerRef}
          title={lesson.title}
          order={lesson.order}
          emblem={lesson.emblem}
          accent={lesson.accent}
          next={next}
          celebrate={masteryCelebration}
        />
      )}

      <LessonPager prev={prev} next={next} />
    </div>
  );
}
