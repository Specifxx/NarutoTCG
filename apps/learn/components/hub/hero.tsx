"use client";

import { AnimatePresence, motion, useMotionValue, type Variants } from "framer-motion";
import type { PointerEvent } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";
import { Icon, type IconName } from "@/components/ui/icon";
import { HeroArt } from "./hero-art";
import { HeroHeadline } from "./hero-headline";
import { useCalmMotion } from "./primitives";
import type { HubData } from "./types";
import { lessonHref, type HubProgress } from "./use-hub-progress";

const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 150, damping: 20, delay },
  }),
};

interface Cta {
  key: string;
  href: string;
  icon: IconName;
  lead: string;
  label?: string;
}

function pickCta(data: HubData, progress: HubProgress): Cta {
  const first = data.lessons[0];
  const start: Cta = { key: "start", href: first ? lessonHref(first.id) : "/how-to-play", icon: "play", lead: "Start Lesson 1" };
  if (!progress.hydrated) return start;
  if (progress.allLessonsComplete) return { key: "puzzles", href: "/puzzles", icon: "puzzle", lead: "Try the Lethal Puzzles" };
  const next = progress.nextLesson;
  if (progress.lessonsComplete === 0 || !next) return start;
  return { key: `continue-${next.id}`, href: lessonHref(next.id), icon: "arrow-right", lead: "Continue:", label: next.title };
}

function FeatureChip({ icon, children }: { icon: IconName; children: string }) {
  return (
    <li className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[12.5px] font-semibold text-ash-200 backdrop-blur">
      <Icon name={icon} size={14} className="text-chakra-300" />
      {children}
    </li>
  );
}

/** Dojo hero: animated headline, adaptive call to action and the chakra seal. */
export function Hero({ data, progress }: { data: HubData; progress: HubProgress }) {
  const reduce = useCalmMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const cta = pickCta(data, progress);

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    py.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <section
      aria-labelledby="dojo-hero-title"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative pb-10 pt-10 sm:pt-14 lg:pb-16 lg:pt-16"
    >
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-6">
        <div className="min-w-0">
          <motion.p
            variants={rise}
            initial="hidden"
            animate="show"
            className="eyebrow inline-flex items-center gap-2 rounded-full border border-chakra-400/25 bg-chakra-500/10 px-3 py-1.5 text-chakra-200 shadow-[0_0_24px_-8px_rgba(255,122,26,0.6)]"
          >
            <Emblem name="leaf" size={13} className="text-chakra-300" />
            Naruto Mythos TCG · Learn
          </motion.p>

          <HeroHeadline id="dojo-hero-title" />

          <motion.p
            variants={rise}
            custom={1.05}
            initial="hidden"
            animate="show"
            className="mt-6 max-w-xl text-base leading-relaxed text-ash-400 sm:text-lg"
          >
            The Dojo turns the rulebook into play. Work through{" "}
            <strong className="font-semibold text-ash-100">five animated lessons</strong> with hands-on mini-games, prove your
            timing in <strong className="font-semibold text-ash-100">Lethal Puzzles</strong>, and look up any mechanic in the{" "}
            <strong className="font-semibold text-ash-100">keyword glossary</strong>. Earn XP and climb from Academy Student to
            Kage.
          </motion.p>

          <motion.div
            variants={rise}
            custom={1.2}
            initial="hidden"
            animate="show"
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <ButtonLink href={cta.href} size="lg" className="max-w-full">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={cta.key}
                  className="flex min-w-0 items-center gap-2.5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <Icon name={cta.icon} size={17} className="shrink-0" />
                  <span className="shrink-0">{cta.lead}</span>
                  {cta.label && <span className="min-w-0 truncate">{cta.label}</span>}
                </motion.span>
              </AnimatePresence>
            </ButtonLink>
            <ButtonLink href="/keywords" variant="secondary" size="lg">
              <Icon name="search" size={16} />
              Browse keywords
            </ButtonLink>
          </motion.div>

          <motion.ul
            variants={rise}
            custom={1.35}
            initial="hidden"
            animate="show"
            className="mt-7 flex flex-wrap gap-2"
            aria-label="What's inside"
          >
            <FeatureChip icon="book">{`${data.lessons.length} animated lessons`}</FeatureChip>
            <FeatureChip icon="puzzle">{`${data.puzzles.length} Lethal Puzzles`}</FeatureChip>
            <FeatureChip icon="search">{`${data.keywordKeys.length} keywords`}</FeatureChip>
          </motion.ul>
        </div>

        <HeroArt lessons={data.lessons} cards={data.heroCards} px={px} py={py} />
      </div>
    </section>
  );
}
