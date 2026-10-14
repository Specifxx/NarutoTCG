import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPuzzle, PUZZLES } from "@/content/puzzles";

export function generateStaticParams() {
  return PUZZLES.map((p) => ({ puzzle: p.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ puzzle: string }> }): Promise<Metadata> {
  const puzzle = getPuzzle((await params).puzzle);
  return { title: puzzle ? puzzle.title : "Puzzle" };
}

export default async function PuzzlePage({ params }: { params: Promise<{ puzzle: string }> }) {
  const puzzle = getPuzzle((await params).puzzle);
  if (!puzzle) notFound();
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-black text-white">{puzzle.title}</h1>
    </section>
  );
}
