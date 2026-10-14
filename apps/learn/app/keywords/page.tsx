import type { Metadata } from "next";
import { FeaturedKeywords } from "@/components/keywords/featured-keywords";
import { GlossaryDirectory } from "@/components/keywords/glossary-directory";
import { KeywordsHero } from "@/components/keywords/keywords-hero";

export const metadata: Metadata = {
  title: "Keywords & Glossary",
  description:
    "Searchable NARUTO Mythos TCG glossary: AMBUSH, POWERUP, MAIN, SCORE, the Edge token and every rules term, with animated tooltips, examples and deep links.",
};

export default function KeywordsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <KeywordsHero />
      <FeaturedKeywords />
      <GlossaryDirectory />
    </div>
  );
}
