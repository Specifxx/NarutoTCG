"use client";

import { motion } from "framer-motion";
import type { ComponentType } from "react";
import { categoryLabel, CATEGORY_STYLES, KeywordChip } from "@/components/ui/keyword-chip";
import { Icon } from "@/components/ui/icon";
import { keywordById } from "@/content/keywords";
import { cn } from "@/lib/cn";
import { XP } from "@/lib/progress";
import { AmbushDemo } from "./ambush-demo";
import { ExampleCard, SourceBadge } from "./card-text";
import { ExhaustDemo } from "./exhaust-demo";
import { useExplored } from "./glossary-bus";
import { PowerupDemo } from "./powerup-demo";

interface Featured {
  id: string;
  tagline: string;
  Demo: ComponentType;
  glow: string;
  border: string;
  link: string;
}

const FEATURED: readonly Featured[] = [
  {
    id: "ambush",
    tagline: "The surprise reveal",
    Demo: AmbushDemo,
    glow: "rgba(139,92,246,0.35)",
    border: "group-hover:border-mist-400/35",
    link: "text-mist-300 hover:text-mist-200",
  },
  {
    id: "powerup",
    tagline: "Stack Power tokens",
    Demo: PowerupDemo,
    glow: "rgba(245,197,66,0.3)",
    border: "group-hover:border-gold-400/35",
    link: "text-gold-300 hover:text-gold-200",
  },
  {
    id: "exhaust",
    tagline: "Our shorthand for spending Chakra",
    Demo: ExhaustDemo,
    glow: "rgba(239,64,96,0.3)",
    border: "group-hover:border-blood-400/35",
    link: "text-chakra-300 hover:text-chakra-200",
  },
];

function FeaturedCard({ item, index }: { item: Featured; index: number }) {
  const entry = keywordById(item.id);
  const explored = useExplored();
  const done = explored.ids.has(entry.id);
  const style = CATEGORY_STYLES[entry.category];
  const { Demo } = item;
  return (
    <motion.article
      aria-labelledby={`featured-${entry.id}-title`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 140, damping: 20, delay: index * 0.09 }}
      className="group relative flex min-w-0 flex-col"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-[1.3rem] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100"
        style={{ background: `radial-gradient(70% 50% at 50% 0%, ${item.glow}, transparent 70%)` }}
      />
      <div
        className={cn(
          "panel relative flex h-full flex-col overflow-hidden transition-[border-color,transform] duration-300 group-hover:-translate-y-1",
          item.border,
        )}
      >
        <Demo />
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={cn("eyebrow flex items-center gap-1.5", style.label)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} aria-hidden="true" />
              {entry.source.kind === "platform" ? "Platform term" : categoryLabel(entry.category).replace(/s$/, "")}
            </span>
            <SourceBadge entry={entry} />
          </div>

          <div>
            <h3 id={`featured-${entry.id}-title`} className="text-[1.65rem] leading-none">
              <KeywordChip query={entry.id} className="!mx-0 !rounded-lg !px-2.5 !py-1 !font-black">
                {entry.term}
              </KeywordChip>
            </h3>
            <p className="mt-2.5 text-sm font-bold text-ash-200">{item.tagline}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-ash-500">
              <Icon name="hand" size={12} />
              Hover, tap or focus the keyword for its tooltip
            </p>
          </div>

          <p className="text-[14.5px] leading-relaxed text-ash-300">{entry.short}</p>

          {entry.example && <ExampleCard example={entry.example} selfId={entry.id} />}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            <a
              href={`#${entry.id}`}
              data-glossary-link=""
              className={cn("group/link inline-flex items-center gap-1.5 rounded text-sm font-bold transition", item.link)}
            >
              Full ruling in the glossary
              <Icon name="arrow-right" size={15} className="transition-transform group-hover/link:translate-x-0.5" />
            </a>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                done ? "bg-leaf-500/15 text-leaf-300" : "bg-gold-400/10 text-gold-300",
              )}
            >
              {done ? (
                <>
                  <Icon name="check" size={12} />
                  Explored
                </>
              ) : (
                <>+{XP.keywordExplored} XP</>
              )}
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/** The three headline mechanics, each with a looping demo. */
export function FeaturedKeywords() {
  return (
    <section aria-labelledby="signature-mechanics-title" className="relative py-12 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ type: "spring", stiffness: 150, damping: 22 }}
        className="max-w-2xl"
      >
        <p className="eyebrow flex items-center gap-2.5 text-mist-300">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-mist-400" aria-hidden="true" />
          Signature mechanics
        </p>
        <h2 id="signature-mechanics-title" className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Three terms, <span className="text-chakra-gradient">seen in motion</span>
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ash-400">
          Watch each mechanic play out on a practice card. Pause any loop or tap the dots to step through it at your own pace.
        </p>
      </motion.div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3 md:[&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        {FEATURED.map((item, i) => (
          <FeaturedCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </section>
  );
}
