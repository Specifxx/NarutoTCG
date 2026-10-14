"use client";

import { Hero } from "./hero";
import { LessonPath } from "./lesson-path";
import { ModuleCards } from "./module-cards";
import { PlayerCard } from "./player-card";
import { SectionHeading } from "./primitives";
import { RoundGlance } from "./round-glance";
import { SaveFooter } from "./save-footer";
import type { HubData } from "./types";
import { useHubProgress } from "./use-hub-progress";

/**
 * The Dojo hub. Reads saved progress once and hands it to every section, so
 * the hero CTA, player card, module cards and lesson path always agree.
 */
export function DojoHub({ data }: { data: HubData }) {
  const progress = useHubProgress(data);
  return (
    <>
      <Hero data={data} progress={progress} />
      <ModuleCards data={data} progress={progress} />

      <section aria-labelledby="dojo-progress-title" className="relative pt-16 sm:pt-20">
        <SectionHeading
          id="dojo-progress-title"
          eyebrow="Your progress"
          eyebrowClassName="text-gold-300"
          title="From Academy Student to Kage"
          description="Each lesson has three stars to earn: Learn, Train and Test. Stars, cleared puzzles and explored keywords all pay XP toward your next rank."
        />
        <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <PlayerCard progress={progress} />
          <LessonPath progress={progress} />
        </div>
      </section>

      <RoundGlance lessons={data.lessons} />
      <SaveFooter progress={progress} />
    </>
  );
}
