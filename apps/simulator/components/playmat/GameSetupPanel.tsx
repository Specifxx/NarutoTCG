"use client";

import type { Deck } from "@naruto-tcg/types";
import { Bot, CheckCircle2, Dices, Play, ShieldAlert, Swords, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useCardPoolStore } from "@/lib/cards/store";
import { classifyArchetype } from "@/lib/deck/analytics";
import { toDeckSetup } from "@/lib/deck/deck";
import { useAllDecks } from "@/lib/deck/useDecks";
import { validateDeck } from "@/lib/deck/validate";
import { FORMAT } from "@/lib/game-engine/format";
import { randomSeed } from "@/lib/game-engine/rng";
import { SPEEDS, useGameStore, type Speed } from "@/lib/game-engine/store";
import type { PlayerId } from "@/lib/game-engine/types";
import { Btn, cx } from "../ui/Button";
import { Segmented } from "../ui/Chip";
import { toast } from "../ui/Toast";
import { PLAYER_COLORS } from "./MissionLane";

type Mode = "ai" | "hotseat";
type First = "random" | "0" | "1";

export function GameSetupPanel() {
  const params = useSearchParams();
  const db = useCardPoolStore((s) => s.db);
  const { all, starters, saved } = useAllDecks();
  const start = useGameStore((s) => s.start);
  const speed = useGameStore((s) => s.speed);
  const setSpeed = useGameStore((s) => s.setSpeed);

  const requested = params?.get("deck");
  const initialA = all.find((d) => d.id === requested)?.id ?? saved.find((d) => validateDeck(d, db).legal)?.id ?? starters[0]?.id ?? "";
  const [deckA, setDeckA] = useState(initialA);
  const [deckB, setDeckB] = useState(() => {
    const mine = all.find((d) => d.id === initialA);
    const sameList = (d: Deck) => !!mine && JSON.stringify(d.cards) === JSON.stringify(mine.cards);
    return starters.find((d) => d.id !== initialA && !sameList(d))?.id ?? starters[0]?.id ?? "";
  });
  const [mode, setMode] = useState<Mode>("ai");
  const [first, setFirst] = useState<First>("random");
  const [seed, setSeed] = useState(() => String(randomSeed()));
  const [name, setName] = useState("Player");

  const a = all.find((d) => d.id === deckA) ?? null;
  const b = all.find((d) => d.id === deckB) ?? null;
  const va = useMemo(() => (a ? validateDeck(a, db) : null), [a, db]);
  const vb = useMemo(() => (b ? validateDeck(b, db) : null), [b, db]);
  const ready = !!(va?.legal && vb?.legal);

  const begin = () => {
    if (!a || !b) return;
    const parsed = Number.parseInt(seed, 10);
    const error = start(
      {
        seed: Number.isFinite(parsed) && parsed > 0 ? parsed >>> 0 : randomSeed(),
        firstPlayer: first === "random" ? undefined : (Number(first) as PlayerId),
        players: [
          { name: name.trim() || (mode === "ai" ? "Player" : "Player 1"), controller: "human", deck: toDeckSetup(a, db) },
          { name: mode === "ai" ? "Rogue Ninja AI" : "Player 2", controller: mode === "ai" ? "ai" : "human", deck: toDeckSetup(b, db) },
        ],
      },
      { cards: db },
    );
    if (error) toast(error, "error");
  };

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
      <p className="panel-title">Simulator</p>
      <h1 className="font-display text-3xl font-bold uppercase tracking-[0.1em] text-ash-50">Prepare for battle</h1>
      <p className="mt-1 max-w-2xl text-sm text-ash-400">
        {FORMAT.rounds} rounds, missions ranked D → A. Every action is checked against the rules — Hidden plays, Ambush reveals, Evolution, the Edge token
        and mission scoring are resolved by the engine.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <DeckPick label="Your deck" color={PLAYER_COLORS[0]} decks={all} value={deckA} onChange={setDeckA} deck={a} legal={va?.legal ?? false} problems={va?.checks.filter((c) => !c.ok).map((c) => c.detail) ?? []} />
        <DeckPick label={mode === "ai" ? "Opponent deck (AI)" : "Player 2 deck"} color={PLAYER_COLORS[1]} decks={all} value={deckB} onChange={setDeckB} deck={b} legal={vb?.legal ?? false} problems={vb?.checks.filter((c) => !c.ok).map((c) => c.detail) ?? []} />
      </div>

      <div className="panel mt-4 grid gap-5 p-5 sm:grid-cols-2">
        <Field label="Opponent">
          <Segmented<Mode>
            label="Opponent"
            value={mode}
            onChange={setMode}
            options={[
              { value: "ai", label: (<span className="flex items-center gap-1.5"><Bot className="h-3.5 w-3.5" /> AI</span>), title: "Play against the Rogue Ninja AI" },
              { value: "hotseat", label: (<span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Hot-seat</span>), title: "Control both players on this device" },
            ]}
          />
        </Field>
        <Field label="First player (takes the Edge)">
          <Segmented<First>
            label="First player"
            value={first}
            onChange={setFirst}
            options={[
              { value: "random", label: "Random" },
              { value: "0", label: mode === "ai" ? "Me" : "P1" },
              { value: "1", label: mode === "ai" ? "AI" : "P2" },
            ]}
          />
        </Field>
        <Field label="Your name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            aria-label="Your name"
            className="h-9 w-56 rounded-lg border border-white/10 bg-shadow-950 px-3 text-sm text-ash-100 focus:border-chakra-400/60 focus:outline-none"
          />
        </Field>
        <Field label="Speed">
          <Segmented<Speed> label="Speed" value={speed} onChange={setSpeed} options={(Object.keys(SPEEDS) as Speed[]).map((s) => ({ value: s, label: SPEEDS[s].label }))} />
        </Field>
        <Field label="Seed (replayable shuffles)">
          <div className="flex gap-2">
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              aria-label="Seed"
              className="h-9 w-40 rounded-lg border border-white/10 bg-shadow-950 px-3 font-mono text-sm text-ash-100 focus:border-chakra-400/60 focus:outline-none"
            />
            <Btn size="sm" icon={<Dices className="h-4 w-4" />} onClick={() => setSeed(String(randomSeed()))}>
              Roll
            </Btn>
          </div>
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Btn variant="primary" size="lg" icon={<Play className="h-5 w-5" />} onClick={begin} disabled={!ready}>
          Start duel
        </Btn>
        {!ready && <span className="text-sm text-blood-400">Both decks must be legal.</span>}
        <Link href="/decks" className="ml-auto text-sm text-ash-400 underline-offset-4 hover:text-chakra-300 hover:underline">
          Build a deck →
        </Link>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="panel-title mb-2">{label}</p>
      {children}
    </div>
  );
}

function DeckPick({
  label,
  color,
  decks,
  value,
  onChange,
  deck,
  legal,
  problems,
}: {
  label: string;
  color: string;
  decks: Deck[];
  value: string;
  onChange: (id: string) => void;
  deck: Deck | null;
  legal: boolean;
  problems: string[];
}) {
  const db = useCardPoolStore((s) => s.db);
  const report = useMemo(() => (deck ? classifyArchetype(deck, db) : null), [deck, db]);
  const leader = deck?.cards.map((e) => db[e.cardId]).find((c) => c?.type === "leader");
  return (
    <div className="panel p-4" style={{ boxShadow: `inset 3px 0 0 ${color}` }}>
      <p className="panel-title mb-2 flex items-center gap-1.5" style={{ color }}>
        <Swords className="h-3.5 w-3.5" /> {label}
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-10 w-full rounded-lg border border-white/10 bg-shadow-900 px-3 text-sm text-ash-50 focus:border-chakra-400/60 focus:outline-none"
      >
        {decks.map((d) => (
          <option key={d.id} value={d.id}>
            {d.owner === "Starter" ? "★ " : ""}
            {d.name}
          </option>
        ))}
      </select>
      {deck && (
        <div className="mt-3 space-y-1 text-xs">
          <p className="text-ash-300">
            Leader: <span className="text-ash-50">{leader ? `${leader.name}${leader.title ? ` — ${leader.title}` : ""}` : "none"}</span>
          </p>
          {report?.primary && (
            <p className="text-ash-400">
              {report.primary.name} · {report.identity}
            </p>
          )}
          <p className={cx("flex items-center gap-1.5", legal ? "text-jade-400" : "text-blood-400")}>
            {legal ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            {legal ? "Tournament legal" : problems.join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}
