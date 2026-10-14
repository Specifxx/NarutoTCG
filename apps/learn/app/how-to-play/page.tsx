import type { Metadata } from "next";
import Link from "next/link";
import { LESSONS } from "@/content/lessons";

export const metadata: Metadata = { title: "How to Play" };

export default function HowToPlayPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-black text-white">How to Play</h1>
      <ul className="mt-6 space-y-2">
        {LESSONS.map((l) => (
          <li key={l.id}>
            <Link href={`/how-to-play/${l.id}`} className="text-chakra-300">
              {l.order}. {l.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
