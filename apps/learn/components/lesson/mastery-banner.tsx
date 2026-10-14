"use client";

import { motion, useReducedMotion } from "framer-motion";
import { forwardRef, useEffect, useRef, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { Accent } from "@/content/schema";
import type { EmblemName } from "@/lib/game/types";
import { LessonMedallion } from "./lesson-medallion";
import { StarGlyph } from "./stage-stars";
import type { LessonSummary } from "./types";
import { lessonHref } from "./use-lesson-progress";

/**
 * Shown once all three stars are earned. When `celebrate` increments (the
 * learner just mastered the lesson) it bursts with gold particles.
 */
export const MasteryBanner = forwardRef<
  HTMLElement,
  {
    title: string;
    order: number;
    emblem: EmblemName;
    accent: Accent;
    next?: LessonSummary;
    celebrate: number;
  }
>(function MasteryBanner({ title, order, emblem, accent, next, celebrate }, ref) {
  const reduce = useReducedMotion();
  const [fire, setFire] = useState(0);
  const seen = useRef(false);

  // Fire after mount so the burst's own counter has initialised.
  useEffect(() => {
    if (celebrate <= 0) return;
    const t1 = window.setTimeout(() => setFire((f) => f + 1), 350);
    const t2 = window.setTimeout(() => setFire((f) => f + 1), 900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [celebrate]);

  return (
    <motion.section
      ref={ref}
      aria-labelledby="mastery-title"
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      onViewportEnter={() => {
        if (seen.current) return;
        seen.current = true;
        window.setTimeout(() => setFire((f) => f + 1), 300);
      }}
      transition={{ type: "spring", stiffness: 160, damping: 20 }}
      className="relative mt-12 scroll-mt-[190px] rounded-3xl border border-gold-400/30 bg-shadow-900/80 shadow-[0_30px_80px_-30px_rgba(245,197,66,0.45)]"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(245,197,66,0.22), transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(255,122,26,0.16), transparent 55%)",
          }}
        />
        {!reduce && (
          <div
            className="absolute left-1/2 top-1/2 h-[220%] w-[140%] -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-[0.12]"
            style={{
              background:
                "repeating-conic-gradient(from 0deg, rgba(253,234,168,0.9) 0deg 6deg, transparent 6deg 24deg)",
              maskImage: "radial-gradient(circle, black 0%, transparent 60%)",
              WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 60%)",
            }}
          />
        )}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300 to-transparent" />
      </div>

      <div className="relative flex flex-col items-center gap-6 p-6 text-center sm:p-8 lg:flex-row lg:gap-8 lg:text-left">
        <div className="relative shrink-0">
          <ParticleBurst fire={fire} palette="gold" shape="star" count={34} spread={170} duration={1.1} />
          <LessonMedallion emblem={emblem} accent={accent} order={order} size="lg" glow mastered />
        </div>

        <div className="min-w-0 flex-1">
          <p className="eyebrow text-gold-300">Lesson {order} · All stars earned</p>
          <h2 id="mastery-title" className="mt-1 text-4xl font-black tracking-tight text-gold-gradient sm:text-5xl">
            Mastered
          </h2>
          <div className="mt-3 flex justify-center gap-2 lg:justify-start" role="img" aria-label="Learn, Train and Test stars earned">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={`${celebrate}-${i}`}
                className="flex"
                initial={{ scale: 0, rotate: -140, opacity: 0 }}
                whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 260, damping: 13, delay: 0.3 + i * 0.16 }}
              >
                <StarGlyph filled size={36} />
              </motion.span>
            ))}
          </div>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ash-300 lg:mx-0">
            You learned it, trained it and aced the checkpoint for <span className="font-semibold text-white">{title}</span>.
          </p>
        </div>

        <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:items-center lg:items-end">
          {next ? (
            <>
              <span className="text-[12px] font-semibold text-ash-400">
                Up next: Lesson {next.order} · <span className="text-ash-200">{next.title}</span>
              </span>
              <ButtonLink href={lessonHref(next.id)} variant="gold" size="lg">
                Next lesson
                <Icon name="arrow-right" size={17} />
              </ButtonLink>
            </>
          ) : (
            <>
              <span className="text-[12px] font-semibold text-ash-400">Every rule is in your scroll.</span>
              <ButtonLink href="/puzzles" variant="gold" size="lg">
                <Icon name="puzzle" size={17} />
                Try Lethal Puzzles
              </ButtonLink>
            </>
          )}
          <ButtonLink href="/how-to-play" variant="secondary">
            <Icon name="map" size={16} />
            Back to the path
          </ButtonLink>
        </div>
      </div>
    </motion.section>
  );
});
