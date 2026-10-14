"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Cpu, ExternalLink, EyeOff, Hand, Layers, Medal, Scroll, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { compileAbilities } from "@/lib/game-engine/abilities";
import { FORMAT, MISSION_RANKS, RANK_BONUS } from "@/lib/game-engine/format";
import { cx } from "../ui/Button";
import { RankBadge } from "../playmat/MissionLane";

const SECTIONS = [
  { id: "goal", label: "Goal" },
  { id: "decks", label: "Deck rules" },
  { id: "zones", label: "Zones" },
  { id: "round", label: "Round structure" },
  { id: "actions", label: "Actions" },
  { id: "missions", label: "Missions & scoring" },
  { id: "edge", label: "The Edge" },
  { id: "keywords", label: "Keywords" },
  { id: "grammar", label: "Card text lab" },
];

const PHASES = [
  {
    name: "Start Phase",
    icon: Layers,
    points: [
      "Reveal the next mission: D in round 1, then C, B and A.",
      `Each player gains ${FORMAT.baseChakra} Chakra + ${FORMAT.chakraPerCharacter} per character they have in play (hidden ones count; an evolved stack counts once) + any CHAKRA +X.`,
      `Each player draws ${FORMAT.drawPerRound} cards.`,
    ],
  },
  {
    name: "Action Phase",
    icon: Swords,
    points: [
      "The Edge holder acts first. Players alternate, one action per turn.",
      "Passing ends your actions for the round. The first player to pass takes (or keeps) the Edge.",
      "Once one player has passed, the other keeps acting until they pass too.",
    ],
  },
  {
    name: "Mission Evaluation",
    icon: Trophy,
    points: [
      "Every revealed mission is evaluated in order D → C → B → A.",
      `The higher total Power wins. Ties go to the Edge holder. You need at least ${FORMAT.minPowerToWin} Power to win.`,
      "The winner scores printed points + rank bonus and resolves SCORE effects.",
    ],
  },
  {
    name: "End Phase",
    icon: Scroll,
    points: ["Unspent Chakra is lost.", "All Power tokens and \"this round\" modifiers are removed.", `Characters stay in play. After round ${FORMAT.rounds}, the most mission points wins; a tie goes to the Edge holder.`],
  },
];

const ACTIONS: Array<[string, string, string]> = [
  ["Play a character", "Its cost", "Face-up into any revealed mission. MAIN triggers. Only one face-up character of each name per mission on your side."],
  ["Play Hidden", `${FORMAT.hiddenCost} Chakra`, "Face-down into a mission's Hidden slot. 0 Power and no effects, but it still adds Chakra each Start Phase."],
  ["Reveal (Ambush)", "Full cost", "Flip one of your hidden characters in its mission. MAIN then AMBUSH trigger. Power tokens on it stay."],
  ["Evolve Character", "Cost difference", "Play a same-name character with a higher cost on top of your face-up one. Tokens and items carry over. MAIN then UPGRADE trigger."],
  ["Cast a jutsu", "Its cost", "Choose a revealed mission; its MAIN effect resolves there, then it goes to the discard pile."],
  ["Equip an item", "Its cost", "Attach to one of your face-up characters. EQUIP bonuses apply while attached."],
  ["Leader Technique", "Printed [n]", "Once per round: your Leader's TECHNIQUE resolves on a revealed mission you choose."],
  ["Add Power Token", `${FORMAT.powerTokenCost} Chakra`, "Put a +1 Power token on one of your face-up characters (removed in the End Phase)."],
  ["Draw Card", `${FORMAT.drawCardCost} Chakra`, "Draw one card."],
  ["Pass Turn", "—", "Stop acting this round. First to pass takes the Edge."],
];

const KEYWORDS: Array<[string, string]> = [
  ["MAIN", "Resolves when the card is played face-up, revealed, or evolved onto."],
  ["AMBUSH", "Resolves only when the character is revealed from Hidden."],
  ["UPGRADE", "Resolves when this card is evolved onto a lower-cost version of the same character."],
  ["SCORE", "Resolves when you win the mission this card is in (or this mission card is scored)."],
  ["CONTINUOUS", "Always on while the card is face-up in play."],
  ["EQUIP", "Items: bonus for the character they are attached to."],
  ["CHAKRA +X", "Gain X extra Chakra in each Start Phase while face-up (Leaders always)."],
  ["TECHNIQUE [n]", "Leaders: pay n, once per round, on a mission you choose."],
  ["POWERUP X", "Put X Power tokens (+1 Power each until the End Phase) on the target — the card itself if none is named."],
  ["Defeat", "Discard a character along with every card beneath it and its items."],
];

const GRAMMAR = [
  "POWERUP n · POWERUP n on your weakest|strongest character in this mission · on each [other] friendly character in this mission",
  "Draw n card(s) · Gain n Chakra · Take the Edge token",
  "Remove up to n Power tokens from the weakest|strongest|each enemy character in this mission",
  "The weakest|strongest|Each enemy character in this mission gets -n Power this round",
  "Defeat the weakest|strongest enemy character in this mission [with Power n or less]",
  "Defeat an enemy hidden character in this mission",
  "Put the top card of your deck into this mission as a hidden character",
  "Prefixes: If you hold the Edge token, … · If you control another <group> character in this mission, …",
  "CONTINUOUS: Other friendly characters in this mission get +n Power · Friendly <group> characters [in this mission] get +n Power · This character gets +n Power while you hold the Edge token · <group> characters in this mission get +n Power",
];

export function RulesGuide() {
  const [phase, setPhase] = useState(0);
  const [text, setText] = useState("MAIN: If you control another Team 7 character in this mission, POWERUP 2.\nAMBUSH: Defeat an enemy hidden character in this mission.\nCHAKRA +1");
  const compiled = useMemo(() => compileAbilities(text), [text]);
  const Active = PHASES[phase].icon;

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 pb-24 pt-8 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav className="hidden lg:block" aria-label="Rules sections">
        <ul className="sticky top-20 space-y-1 text-sm">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="block rounded-md px-2 py-1 text-ash-400 hover:bg-white/5 hover:text-ash-50">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="min-w-0 space-y-10">
        <header>
          <p className="panel-title flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Learn
          </p>
          <h1 className="font-display text-3xl font-bold uppercase tracking-[0.1em] text-ash-50">How to play</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ash-400">
            The simulator follows the round structure of the{" "}
            <a className="text-chakra-300 hover:underline" href="https://www.narutotcgmythos.com/how-to-play" target="_blank" rel="noreferrer">
              Naruto Mythos TCG <ExternalLink className="inline h-3 w-3" />
            </a>{" "}
            — missions, Hidden play, Ambush, Upgrades and the Edge token — with the {FORMAT.name} deck format. Everything on this page is read from the
            same rule constants the engine enforces.
          </p>
        </header>

        <Section id="goal" title="Goal">
          <p>
            Score the most <strong>mission points</strong> over {FORMAT.rounds} rounds. Each round a new mission is revealed and every revealed mission is
            contested again, so early missions pay out repeatedly. If scores are tied after round {FORMAT.rounds}, the player holding the Edge token wins.
          </p>
        </Section>

        <Section id="decks" title="Deck rules">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [`${FORMAT.mainDeckSize}`, "card main deck — characters, jutsu and items"],
              [`${FORMAT.leaderCount}`, "Leader, kept in the Leader slot (not shuffled in)"],
              [`${FORMAT.missionCount}`, `missions with different names; ${FORMAT.missionsPerPlayer} are drawn at random each game`],
              [`≤${FORMAT.maxCopiesPerName}`, "copies of any card name (name + version title)"],
            ].map(([n, t]) => (
              <div key={t} className="panel flex items-center gap-3 p-3">
                <span className="font-display text-2xl font-bold text-chakra-300">{n}</span>
                <span className="text-sm text-ash-300">{t}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ash-500">
            Official Mythos tournament decks differ (30+ cards, 2 copies per collection number, no Leader). The format lives in one config file, so it can be
            switched.
          </p>
        </Section>

        <Section id="zones" title="Zones">
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              ["Leader slot", "Your Leader: passive CONTINUOUS/CHAKRA abilities and a once-per-round TECHNIQUE."],
              ["Hand", "No hand size limit. Drag cards from here onto the board."],
              ["Missions", "Four slots, D → A. Each side has a face-up row and a Hidden slot."],
              ["Hidden slot", "Face-down characters: 0 Power, no effects, still worth Chakra. Only you can see yours."],
              ["Chakra pool", "Refilled each Start Phase. Spending taps chakra; anything unspent is lost at End."],
              ["Discard / Graveyard", "Defeated characters (with everything beneath them), cast jutsu and lost items."],
            ].map(([z, d]) => (
              <li key={z} className="panel p-3">
                <p className="font-display text-sm font-bold uppercase tracking-wider text-ash-50">{z}</p>
                <p className="mt-0.5 text-sm text-ash-400">{d}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="round" title="Round structure">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Phases">
            {PHASES.map((p, i) => (
              <button
                key={p.name}
                role="tab"
                aria-selected={phase === i}
                onClick={() => setPhase(i)}
                className={cx(
                  "relative rounded-lg px-3 py-2 font-display text-xs font-bold uppercase tracking-[0.12em]",
                  phase === i ? "text-ash-50" : "text-ash-400 hover:text-ash-100",
                )}
              >
                {phase === i && <motion.span layoutId="learn-phase" className="absolute inset-0 rounded-lg border border-chakra-400/50 bg-chakra-500/15" />}
                <span className="relative">
                  {i + 1}. {p.name}
                </span>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={phase} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="panel mt-3 flex gap-4 p-4">
              <Active className="mt-1 h-6 w-6 shrink-0 text-chakra-400" />
              <ul className="list-disc space-y-1.5 pl-4 text-sm text-ash-300">
                {PHASES[phase].points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
          <p className="mt-2 text-xs text-ash-500">Before round 1 each player draws {FORMAT.openingHand} and may mulligan once; the Edge holder decides first.</p>
        </Section>

        <Section id="actions" title="Actions on your turn">
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-ash-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Cost</th>
                  <th className="px-3 py-2 font-medium">What happens</th>
                </tr>
              </thead>
              <tbody>
                {ACTIONS.map(([a, c, d]) => (
                  <tr key={a} className="border-t border-white/5 align-top">
                    <td className="whitespace-nowrap px-3 py-2 font-display font-semibold text-ash-50">{a}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-chakra-300">{c}</td>
                    <td className="px-3 py-2 text-ash-400">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ash-500">
            <EyeOff className="h-3.5 w-3.5 text-yin-400" /> A hidden card may share a name with your face-up character in the same mission, but cannot be
            revealed there while that character remains.
          </p>
        </Section>

        <Section id="missions" title="Missions & scoring">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MISSION_RANKS.map((r, i) => (
              <div key={r} className="panel flex items-center gap-3 p-3">
                <RankBadge rank={r} />
                <div className="text-xs">
                  <p className="text-ash-50">
                    +{RANK_BONUS[r]} rank bonus
                  </p>
                  <p className="text-ash-500">
                    Revealed round {i + 1} · scored up to {FORMAT.rounds - i}×
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-ash-400">
            The first player&apos;s two missions fill slots D and B; the other player&apos;s fill C and A. Mission D is evaluated in all four rounds, so the
            fight for it starts immediately.
          </p>
        </Section>

        <Section id="edge" title="The Edge token">
          <div className="panel flex gap-4 p-4">
            <Medal className="h-8 w-8 shrink-0 text-edge-400" />
            <ul className="list-disc space-y-1 pl-4 text-sm text-ash-300">
              <li>The first player starts with it.</li>
              <li>The first player to pass in an Action Phase takes it (or keeps it).</li>
              <li>The holder acts first next round, wins every tied mission and wins a tied game.</li>
              <li>Some effects take it directly — and CONTINUOUS abilities can reward holding it.</li>
            </ul>
          </div>
        </Section>

        <Section id="keywords" title="Keywords">
          <dl className="grid gap-2 sm:grid-cols-2">
            {KEYWORDS.map(([k, d]) => (
              <div key={k} className="panel p-3">
                <dt className="font-display text-sm font-bold text-chakra-300">{k}</dt>
                <dd className="mt-0.5 text-sm text-ash-400">{d}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-ash-500">
            Targets such as “the weakest enemy character” pick the lowest current Power; ties go to the character that entered play first.
          </p>
        </Section>

        <Section id="grammar" title="Card text lab">
          <p className="mb-3 text-sm text-ash-400">
            Card abilities are compiled from their text. Paste a card&apos;s text to see whether the engine automates it — useful when importing scraped
            cards into <code className="text-chakra-300">public/data/cards.json</code>.
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              aria-label="Card text"
              className="w-full rounded-lg border border-white/10 bg-shadow-950 p-3 font-mono text-xs text-ash-100 focus:border-chakra-400/60 focus:outline-none"
            />
            <div className="panel p-3 text-xs">
              <ul className="space-y-1.5">
                {compiled.lines.map((l, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {l.automated ? <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jade-400" /> : <Hand className="mt-0.5 h-3.5 w-3.5 shrink-0 text-edge-400" />}
                    <span className={l.automated ? "text-ash-200" : "text-edge-400"}>
                      <span className="font-display font-bold">{l.label}</span> {l.automated ? "automated" : "not recognised — would be shown as manual"}
                    </span>
                  </li>
                ))}
                {compiled.lines.length === 0 && <li className="text-ash-500">Type some card text.</li>}
              </ul>
              <pre className="scroll-thin mt-3 max-h-48 overflow-auto rounded bg-shadow-950 p-2 text-[10px] text-ash-400">
                {JSON.stringify({ triggered: compiled.triggered, auras: compiled.auras, chakraBonus: compiled.chakraBonus, technique: compiled.technique }, null, 1)}
              </pre>
            </div>
          </div>
          <ul className="mt-3 space-y-1 text-xs text-ash-500">
            {GRAMMAR.map((g) => (
              <li key={g} className="font-mono">
                {g}
              </li>
            ))}
          </ul>
        </Section>

        <div className="flex flex-wrap gap-3">
          <Link href="/simulator" className="rounded-lg bg-gradient-to-b from-chakra-400 to-chakra-500 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-[0.12em] text-shadow-950">
            Play a game
          </Link>
          <a
            href="https://irp.cdn-website.com/99e556bf/files/uploaded/Naruto-Mythos-TCG-Rulebook-EN.pdf"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-[0.12em] text-ash-200 hover:border-chakra-400/50"
          >
            Official rulebook (PDF) <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </article>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-[0.14em] text-ash-50">{title}</h2>
      <div className="text-sm leading-relaxed text-ash-300">{children}</div>
    </section>
  );
}
