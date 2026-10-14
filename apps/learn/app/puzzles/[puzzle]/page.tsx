import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PuzzlePlayer } from "@/components/puzzles/puzzle-player";
import { getPuzzle, PUZZLES } from "@/content/puzzles";

export function generateStaticParams() {
  return PUZZLES.map((p) => ({ puzzle: p.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ puzzle: string }> }): Promise<Metadata> {
  const puzzle = getPuzzle((await params).puzzle);
  if (!puzzle) return { title: "Puzzle" };
  return {
    title: `${puzzle.title} · Lethal Puzzle`,
    description: `${puzzle.difficulty} puzzle. ${puzzle.tagline} ${puzzle.objective}`,
  };
}

export default async function PuzzlePage({ params }: { params: Promise<{ puzzle: string }> }) {
  const puzzle = getPuzzle((await params).puzzle);
  if (!puzzle) notFound();
  return <PuzzlePlayer puzzleId={puzzle.id} />;
}
