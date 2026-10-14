import { ArrowRight, BookOpen, GitCompare, Layers, Swords } from "lucide-react";
import Link from "next/link";
import { FORMAT } from "@/lib/game-engine/format";

const TILES = [
  {
    href: "/simulator",
    title: "Simulator",
    icon: Swords,
    blurb: "Rule-enforced playmat vs the Rogue Ninja AI or hot-seat. Hidden plays, Ambush reveals, Evolution and the Edge token.",
    accent: "#ff7a1a",
  },
  {
    href: "/decks",
    title: "Decks",
    icon: Layers,
    blurb: `Split-screen deck builder with a strict ${FORMAT.mainDeckSize}/${FORMAT.leaderCount}/${FORMAT.maxCopiesPerName} validator, Chakra curve and archetype classifier.`,
    accent: "#3987e5",
  },
  {
    href: "/compare",
    title: "Compare",
    icon: GitCompare,
    blurb: "Overlay two decks' curves, diff their lists and simulate the matchup with AI-vs-AI games.",
    accent: "#3fd6a5",
  },
  {
    href: "/learn",
    title: "Learn",
    icon: BookOpen,
    blurb: "Rounds, missions, Hidden, Ambush, Upgrades, the Edge — plus a card-text lab for new cards.",
    accent: "#9a6bff",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-14 sm:px-6">
      <section className="max-w-3xl">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-chakra-400">Naruto TCG · Shinobi Sim</p>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-[1.05] tracking-[0.04em] text-ash-50 sm:text-6xl">
          Strike from <span className="bg-gradient-to-r from-chakra-300 via-chakra-500 to-blood-500 bg-clip-text text-transparent">the shadows</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ash-400">
          A rule-enforced Naruto TCG simulator. Build a deck, contest four missions over {FORMAT.rounds} rounds, hide characters for{" "}
          {FORMAT.hiddenCost} Chakra and reveal them at the perfect moment.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/simulator"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-b from-chakra-400 to-chakra-500 px-6 font-display text-sm font-bold uppercase tracking-[0.14em] text-shadow-950 shadow-[0_12px_40px_-12px_rgba(255,122,26,0.9)] hover:from-chakra-300"
          >
            <Swords className="h-5 w-5" /> Start a duel
          </Link>
          <Link
            href="/decks"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-shadow-900/70 px-6 font-display text-sm font-bold uppercase tracking-[0.14em] text-ash-100 hover:border-chakra-400/50"
          >
            <Layers className="h-5 w-5" /> Build a deck
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2">
        {TILES.map(({ href, title, icon: Icon, blurb, accent }) => (
          <Link
            key={href}
            href={href}
            className="panel group flex gap-4 p-5 transition-transform duration-200 hover:-translate-y-1"
            style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px ${accent}22` }}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `${accent}1f`, color: accent }}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-[0.12em] text-ash-50">
                {title}
                <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: accent }} />
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-ash-400">{blurb}</span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
