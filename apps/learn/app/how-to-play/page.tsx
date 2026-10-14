import type { Metadata } from "next";
import { NinjaPath } from "@/components/lesson/ninja-path";
import { OverviewHero } from "@/components/lesson/overview-hero";
import { RoundAtAGlance } from "@/components/lesson/round-glance";
import { toLessonSummary } from "@/components/lesson/lesson-summary";
import { LESSONS } from "@/content/lessons";

export const metadata: Metadata = {
  title: "How to Play",
  description:
    "Five animated lessons on the NARUTO Mythos TCG: deck setup, Chakra, hidden characters and ambushes, mission evaluation and the Edge token.",
};

export default function HowToPlayPage() {
  const lessons = LESSONS.map(toLessonSummary);
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <OverviewHero lessons={lessons} />
      <NinjaPath lessons={lessons} />
      <RoundAtAGlance lessons={lessons} />
    </div>
  );
}
