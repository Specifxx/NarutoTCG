import type { Metadata } from "next";
import Link from "next/link";
import { PUZZLES } from "@/content/puzzles";

export const metadata: Metadata = { title: "Lethal Puzzles" };

export default function PuzzlesPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-black text-white">Lethal Puzzles</h1>
      <ul className="mt-6 space-y-2">
        {PUZZLES.map((p) => (
          <li key={p.id}>
            <Link href={`/puzzles/${p.id}`} className="text-chakra-300">
              {p.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
