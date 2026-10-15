"use client";

import type { Deck } from "@naruto-tcg/types";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Play, ShieldAlert, Square } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ELEMENT_META, fullName } from "@/lib/cards/meta";
import { useCardPoolStore } from "@/lib/cards/store";
import type { CardDb, SimCard } from "@/lib/cards/types";
import { classifyArchetype, costCurve, deckStats } from "@/lib/deck/analytics";
import { splitDeck, toDeckSetup } from "@/lib/deck/deck";
import { useAllDecks } from "@/lib/deck/useDecks";
import { validateDeck } from "@/lib/deck/validate";
import { simulateGame } from "@/lib/game-engine/simulate";
import { HoverPreviewLayer, hoverProps } from "../cards/HoverPreview";
import { Btn, cx } from "../ui/Button";
import { Segmented } from "../ui/Chip";

const A_COLOR = "var(--color-series-1)";
const B_COLOR = "var(--color-series-2)";

export function DeckCompare() {
  const db = useCardPoolStore((s) => s.db);
  const { all, starters } = useAllDecks();
  const [aId, setA] = useState(starters[0]?.id ?? "");
  const [bId, setB] = useState(starters[1]?.id ?? starters[0]?.id ?? "");
  const a = all.find((d) => d.id === aId) ?? null;
  const b = all.find((d) => d.id === bId) ?? null;

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-6 sm:px-6">
      <HoverPreviewLayer />
      <p className="panel-title">Compare</p>
      <h1 className="font-display text-2xl font-bold uppercase tracking-[0.1em] text-ash-50">Deck vs deck</h1>
      <p className="mt-1 text-sm text-ash-400">Curves, card overlap and a head-to-head AI matchup simulation.</p>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        <Picker label="Deck A" color={A_COLOR} decks={all} value={aId} onChange={setA} />
        <Picker label="Deck B" color={B_COLOR} decks={all} value={bId} onChange={setB} />
      </div>

      {a && b ? (
        <>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
            <Summary deck={a} db={db} color={A_COLOR} />
            <Summary deck={b} db={db} color={B_COLOR} />
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="panel p-4">
              <CurveOverlay a={a} b={b} db={db} />
            </div>
            <div className="panel p-4">
              <Matchup a={a} b={b} db={db} />
            </div>
          </div>
          <Overlap a={a} b={b} db={db} />
        </>
      ) : (
        <p className="mt-10 text-center text-ash-500">Pick two decks.</p>
      )}
    </main>
  );
}

function Picker({ label, color, decks, value, onChange }: { label: string; color: string; decks: Deck[]; value: string; onChange: (v: string) => void }) {
  return (
    <label className="panel block p-3" style={{ boxShadow: `inset 3px 0 0 ${color}` }}>
      <span className="panel-title mb-1.5 block" style={{ color }}>
        {label}
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-shadow-900 px-3 text-sm text-ash-50 focus:outline-none">
        {decks.map((d) => (
          <option key={d.id} value={d.id}>
            {d.owner === "Starter" ? "★ " : ""}
            {d.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Summary({ deck, db, color }: { deck: Deck; db: CardDb; color: string }) {
  const v = useMemo(() => validateDeck(deck, db), [deck, db]);
  const report = useMemo(() => classifyArchetype(deck, db), [deck, db]);
  const stats = useMemo(() => deckStats(deck, db), [deck, db]);
  const leader = splitDeck(deck, db).leaders[0]?.card;
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold text-ash-50">{deck.name}</p>
          <p className="text-xs text-ash-400">{leader ? fullName(leader) : "No leader"}</p>
        </div>
        <span className={cx("flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", v.legal ? "bg-jade-400/10 text-jade-400" : "bg-blood-500/10 text-blood-400")}>
          {v.legal ? <CheckCircle2 className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
          {v.legal ? "Legal" : "Not legal"}
        </span>
      </div>
      <p className="mt-2 font-display text-sm font-semibold uppercase tracking-wider" style={{ color }}>
        {report.primary?.name ?? "Unclassified"}
      </p>
      <p className="text-xs text-ash-500">{report.identity}</p>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          ["Chars", stats.characters],
          ["Jutsu", stats.jutsu],
          ["Items", stats.items],
          ["Avg cost", stats.averageCost.toFixed(2)],
        ].map(([k, val]) => (
          <div key={k} className="rounded-md bg-shadow-950/60 py-1.5">
            <dd className="font-display font-bold text-ash-50">{val}</dd>
            <dt className="text-[10px] uppercase text-ash-500">{k}</dt>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex h-2 gap-[2px] overflow-hidden rounded-full">
        {stats.elements.map((e) => (
          <div key={e.element} title={`${ELEMENT_META[e.element].label}: ${e.count}`} style={{ flex: e.count, background: ELEMENT_META[e.element].color }} />
        ))}
      </div>
    </div>
  );
}

const H = 150;

function CurveOverlay({ a, b, db }: { a: Deck; b: Deck; db: CardDb }) {
  const ca = useMemo(() => costCurve(a, db), [a, db]);
  const cb = useMemo(() => costCurve(b, db), [b, db]);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(4, ca.peak, cb.peak);
  return (
    <figure>
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="panel-title">Chakra curve</span>
        <span className="flex gap-3 text-[11px] text-ash-400">
          <Legend color={A_COLOR} label={`${a.name} · avg ${ca.average.toFixed(2)}`} />
          <Legend color={B_COLOR} label={`${b.name} · avg ${cb.average.toFixed(2)}`} />
        </span>
      </figcaption>
      <div className="relative">
        <div className="flex items-end gap-3 border-b border-white/10" style={{ height: H }} onPointerLeave={() => setHover(null)}>
          {ca.buckets.map((bucket, i) => (
            <div key={bucket.cost} className="relative flex h-full flex-1 items-end justify-center gap-[2px]" onPointerEnter={() => setHover(i)}>
              {[
                { v: bucket.total, c: A_COLOR },
                { v: cb.buckets[i].total, c: B_COLOR },
              ].map((s, si) => (
                <motion.div
                  key={si}
                  className="w-1/2 max-w-5"
                  initial={false}
                  animate={{ height: (s.v / max) * (H - 8) }}
                  transition={{ type: "spring", stiffness: 240, damping: 28 }}
                  style={{ background: s.c, borderRadius: "4px 4px 0 0", opacity: hover === null || hover === i ? 1 : 0.45 }}
                />
              ))}
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md border border-white/10 bg-shadow-850 px-2.5 py-1.5 text-[11px] shadow-xl">
                  <p className="font-display font-semibold text-ash-50">Cost {bucket.label}</p>
                  <p className="text-ash-300">
                    <span style={{ color: A_COLOR }}>■</span> A {bucket.total} · <span style={{ color: B_COLOR }}>■</span> B {cb.buckets[i].total}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-3">
          {ca.buckets.map((bucket) => (
            <span key={bucket.cost} className="flex-1 text-center font-display text-[10px] text-ash-500">
              {bucket.label}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

interface SimResult {
  played: number;
  winsA: number;
  winsB: number;
  scoreA: number;
  scoreB: number;
  edgeDecided: number;
}

function Matchup({ a, b, db }: { a: Deck; b: Deck; db: CardDb }) {
  const [games, setGames] = useState<"20" | "50" | "100">("20");
  const [result, setResult] = useState<SimResult | null>(null);
  const [running, setRunning] = useState(false);
  const cancel = useRef(false);
  const legal = validateDeck(a, db).legal && validateDeck(b, db).legal;
  const total = Number(games);

  useEffect(() => {
    cancel.current = true;
    setResult(null);
    setRunning(false);
  }, [a, b]);

  const run = () => {
    cancel.current = false;
    setRunning(true);
    const acc: SimResult = { played: 0, winsA: 0, winsB: 0, scoreA: 0, scoreB: 0, edgeDecided: 0 };
    const setupA = toDeckSetup(a, db);
    const setupB = toDeckSetup(b, db);
    const baseSeed = (Date.now() >>> 0) || 1;
    const step = () => {
      if (cancel.current) return setRunning(false);
      const until = Math.min(total, acc.played + 2);
      for (; acc.played < until; acc.played++) {
        const aFirstSeat = acc.played % 2 === 0;
        const s = simulateGame(
          {
            seed: baseSeed + acc.played * 7919,
            players: aFirstSeat
              ? [
                  { name: "A", controller: "ai", deck: setupA },
                  { name: "B", controller: "ai", deck: setupB },
                ]
              : [
                  { name: "B", controller: "ai", deck: setupB },
                  { name: "A", controller: "ai", deck: setupA },
                ],
          },
          { cards: db },
        );
        const aSeat = aFirstSeat ? 0 : 1;
        if (s.result!.winner === aSeat) acc.winsA++;
        else acc.winsB++;
        acc.scoreA += s.players[aSeat].score;
        acc.scoreB += s.players[aSeat === 0 ? 1 : 0].score;
        if (s.result!.reason === "edge-tiebreak") acc.edgeDecided++;
      }
      setResult({ ...acc });
      if (acc.played < total) setTimeout(step, 0);
      else setRunning(false);
    };
    setTimeout(step, 0);
  };

  const pctA = result && result.played ? result.winsA / result.played : 0.5;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="panel-title">AI matchup simulation</span>
        <Segmented<"20" | "50" | "100">
          label="Games"
          value={games}
          onChange={setGames}
          options={[
            { value: "20", label: "20" },
            { value: "50", label: "50" },
            { value: "100", label: "100" },
          ]}
        />
      </div>
      <p className="mb-3 text-xs text-ash-500">Both sides are played by the Rogue Ninja AI with full rules enforcement. Seats alternate every game.</p>

      <div className="relative h-9 overflow-hidden rounded-lg bg-white/5" role="img" aria-label={result ? `Deck A wins ${Math.round(pctA * 100)}%` : "No simulation yet"}>
        {result && result.played > 0 ? (
          <>
            <motion.div className="absolute inset-y-0 left-0" style={{ background: A_COLOR }} initial={false} animate={{ width: `${pctA * 100}%` }} />
            <motion.div className="absolute inset-y-0 right-0" style={{ background: B_COLOR }} initial={false} animate={{ width: `${(1 - pctA) * 100}%` }} />
            <div className="absolute inset-y-0 left-[calc(50%-1px)] w-[2px] bg-shadow-950/80" />
          </>
        ) : (
          <span className="absolute inset-0 grid place-items-center text-xs text-ash-500">No simulation yet</span>
        )}
        {result && result.played > 0 && (
          <div className="absolute inset-0 flex items-center justify-between px-3 font-display text-sm font-bold text-ash-50 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
            <span>A {Math.round(pctA * 100)}%</span>
            <span>{Math.round((1 - pctA) * 100)}% B</span>
          </div>
        )}
      </div>

      {result && (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md bg-shadow-950/60 py-2">
            <dd className="font-display text-base font-bold text-ash-50">
              {result.winsA}–{result.winsB}
            </dd>
            <dt className="text-[10px] uppercase text-ash-500">
              Record ({result.played}/{total})
            </dt>
          </div>
          <div className="rounded-md bg-shadow-950/60 py-2">
            <dd className="font-display text-base font-bold text-ash-50">
              {(result.scoreA / Math.max(1, result.played)).toFixed(1)} – {(result.scoreB / Math.max(1, result.played)).toFixed(1)}
            </dd>
            <dt className="text-[10px] uppercase text-ash-500">Avg points</dt>
          </div>
          <div className="rounded-md bg-shadow-950/60 py-2">
            <dd className="font-display text-base font-bold text-ash-50">{result.edgeDecided}</dd>
            <dt className="text-[10px] uppercase text-ash-500">Edge tie-breaks</dt>
          </div>
        </dl>
      )}

      <div className="mt-4 flex items-center gap-2">
        {running ? (
          <Btn variant="danger" icon={<Square className="h-4 w-4" />} onClick={() => (cancel.current = true)}>
            Stop
          </Btn>
        ) : (
          <Btn variant="primary" icon={<Play className="h-4 w-4" />} onClick={run} disabled={!legal}>
            Simulate {total} games
          </Btn>
        )}
        {running && <Loader2 className="h-4 w-4 animate-spin text-chakra-400" />}
        {!legal && <span className="text-xs text-blood-400">Both decks must be legal.</span>}
      </div>
    </section>
  );
}

function Overlap({ a, b, db }: { a: Deck; b: Deck; db: CardDb }) {
  const data = useMemo(() => {
    const qa = new Map(a.cards.map((e) => [e.cardId, e.quantity]));
    const qb = new Map(b.cards.map((e) => [e.cardId, e.quantity]));
    const ids = [...new Set([...qa.keys(), ...qb.keys()])].filter((id) => db[id]);
    let min = 0;
    let max = 0;
    const rows = ids.map((id) => {
      const x = qa.get(id) ?? 0;
      const y = qb.get(id) ?? 0;
      min += Math.min(x, y);
      max += Math.max(x, y);
      return { card: db[id], a: x, b: y };
    });
    const sort = <T extends { card: SimCard }>(r: T[]) => r.sort((p, q) => p.card.type.localeCompare(q.card.type) || p.card.cost - q.card.cost || p.card.name.localeCompare(q.card.name));
    return {
      similarity: max ? min / max : 0,
      shared: sort(rows.filter((r) => r.a && r.b)),
      onlyA: sort(rows.filter((r) => r.a && !r.b)),
      onlyB: sort(rows.filter((r) => !r.a && r.b)),
    };
  }, [a, b, db]);

  return (
    <div className="panel mt-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="panel-title">Card overlap</span>
        <span className="font-display text-sm text-ash-300">
          Similarity <span className="font-bold text-ash-50">{Math.round(data.similarity * 100)}%</span>
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
        <CardColumn title={`Only in A (${data.onlyA.length})`} color={A_COLOR} rows={data.onlyA.map((r) => ({ card: r.card, label: `×${r.a}` }))} />
        <CardColumn title={`Shared (${data.shared.length})`} color="#9aa0b4" rows={data.shared.map((r) => ({ card: r.card, label: `${r.a} / ${r.b}` }))} />
        <CardColumn title={`Only in B (${data.onlyB.length})`} color={B_COLOR} rows={data.onlyB.map((r) => ({ card: r.card, label: `×${r.b}` }))} />
      </div>
    </div>
  );
}

function CardColumn({ title, color, rows }: { title: string; color: string; rows: Array<{ card: SimCard; label: string }> }) {
  return (
    <div>
      <p className="mb-2 font-display text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>
        {title}
      </p>
      <ul className="scroll-thin max-h-80 space-y-0.5 overflow-y-auto pr-1">
        {rows.map(({ card, label }) => (
          <li key={card.id} {...hoverProps(card)} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-white/[0.04]" style={{ boxShadow: `inset 2px 0 0 ${ELEMENT_META[card.element].color}` }}>
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-to-br from-chakra-300 to-chakra-500 font-display text-[10px] font-bold text-shadow-950">
              {card.type === "leader" || card.type === "mission" ? card.type[0].toUpperCase() : card.cost}
            </span>
            <span className="min-w-0 flex-1 truncate text-ash-200">{fullName(card)}</span>
            <span className="font-display text-ash-400">{label}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-xs text-ash-500">None</li>}
      </ul>
    </div>
  );
}
