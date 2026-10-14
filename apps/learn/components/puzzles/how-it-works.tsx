"use client";

import { motion, type Variants } from "framer-motion";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const STEPS: ReadonlyArray<{ icon: IconName; title: string; body: string; tone: string; ring: string }> = [
  {
    icon: "hand",
    title: "Select a card",
    body: "Tap a card in your hand, or one of your own hidden characters on the board.",
    tone: "text-chakra-300",
    ring: "from-chakra-300/70 to-chakra-600/40",
  },
  {
    icon: "layers",
    title: "Choose how to play it",
    body: "Face-up for its cost, hidden for 1, an upgrade for the difference, or a reveal. Illegal moves tell you why.",
    tone: "text-mist-300",
    ring: "from-mist-300/70 to-mist-600/40",
  },
  {
    icon: "flag",
    title: "Pass to evaluate",
    body: "Once both players pass, missions score from D to A. Win the game on points and the puzzle is cleared.",
    tone: "text-gold-300",
    ring: "from-gold-200/70 to-gold-600/40",
  },
];

const list: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const step: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 160, damping: 20 } },
};

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-title" className="relative py-8">
      <h2 id="how-it-works-title" className="eyebrow text-ash-400">
        How a puzzle works
      </h2>
      <div className="relative mt-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-[16%] right-[16%] top-[44px] hidden h-px bg-gradient-to-r from-chakra-400/0 via-mist-400/40 to-gold-400/0 md:block"
        />
        <motion.ol
          className="relative grid gap-3 md:grid-cols-3 md:gap-4"
          variants={list}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {STEPS.map((s, i) => (
            <motion.li key={s.title} variants={step} className="panel relative flex gap-4 p-4 sm:p-5">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                <span className={cn("absolute inset-0 rounded-2xl bg-gradient-to-br p-px", s.ring)}>
                  <span className="block h-full w-full rounded-[15px] bg-shadow-900" />
                </span>
                <Icon name={s.icon} size={22} className={cn("relative", s.tone)} />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-shadow-950 text-[10px] font-black text-white ring-1 ring-white/15">
                  {i + 1}
                </span>
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-black text-white">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ash-400">{s.body}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
