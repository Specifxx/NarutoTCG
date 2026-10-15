import type { Metadata } from "next";
import { HowItWorks } from "@/components/puzzles/how-it-works";
import { PuzzleGrid } from "@/components/puzzles/puzzle-grid";
import { PuzzlesHero } from "@/components/puzzles/puzzles-hero";

export const metadata: Metadata = {
  title: "Lethal Puzzles",
  description:
    "Final-Round NARUTO Mythos TCG puzzles: play the exact winning sequence of cards against a scripted opponent, with hints, undo and a guided solution.",
};

export default function PuzzlesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <PuzzlesHero />
      <HowItWorks />
      <PuzzleGrid />
    </div>
  );
}
