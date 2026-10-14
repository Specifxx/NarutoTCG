import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";

export const metadata: Metadata = { title: "Scroll not found" };

const LINKS = [
  { href: "/how-to-play", label: "How to Play" },
  { href: "/puzzles", label: "Lethal Puzzles" },
  { href: "/keywords", label: "Search keywords" },
] as const;

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      <span className="animate-float text-mist-400 drop-shadow-[0_0_18px_rgba(139,92,246,0.8)] motion-reduce:animate-none">
        <Emblem name="mask" size={72} />
      </span>
      <p className="eyebrow text-mist-300">Lost in the mist</p>
      <h1 className="text-4xl font-black tracking-tight text-white">This scroll doesn&apos;t exist</h1>
      <p className="text-ash-400">The page you&apos;re looking for has been hidden or never left the village.</p>
      <ButtonLink href="/">Return to the Dojo</ButtonLink>
      <nav aria-label="Other places to train" className="flex flex-wrap justify-center gap-2">
        {LINKS.map((l) => (
          <ButtonLink key={l.href} href={l.href} variant="ghost" size="sm">
            {l.label}
          </ButtonLink>
        ))}
      </nav>
    </section>
  );
}
