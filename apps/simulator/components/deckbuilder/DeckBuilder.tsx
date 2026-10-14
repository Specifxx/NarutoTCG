"use client";

import type { Deck } from "@naruto-tcg/types";
import { Copy, Download, Eraser, FilePlus2, Lock, Play, Save, Trash2, Upload, Wand2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ELEMENT_META, ELEMENTS, fullName } from "@/lib/cards/meta";
import { useCardPoolStore } from "@/lib/cards/store";
import type { SimCard } from "@/lib/cards/types";
import { buildAutoDeck, isStarterId } from "@/lib/deck/autobuild";
import { addBlocker, withCardAdded, withCardRemoved } from "@/lib/deck/deck";
import { decodeDeck, encodeDeck } from "@/lib/deck/codec";
import { useDeckStore } from "@/lib/deck/store";
import { useAllDecks } from "@/lib/deck/useDecks";
import { HoverPreviewLayer } from "../cards/HoverPreview";
import { Btn } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { Modal } from "../ui/Modal";
import { toast } from "../ui/Toast";
import { CardBrowser } from "./CardBrowser";
import { DeckPanel } from "./DeckPanel";

export function DeckBuilder() {
  const { cards, db } = useCardPoolStore();
  const { saved, starters, byId } = useAllDecks();
  const store = useDeckStore();
  const [modal, setModal] = useState<null | "import" | "export" | "auto" | "delete">(null);

  const activeId = store.activeId && byId(store.activeId) ? store.activeId : (saved[0]?.id ?? starters[0]?.id ?? null);
  const deck = byId(activeId);
  const readOnly = !deck || isStarterId(deck.id);

  useEffect(() => {
    if (activeId && activeId !== store.activeId) store.setActive(activeId);
  }, [activeId, store]);

  const commit = (next: Deck) => store.save(next);

  const add = (card: SimCard) => {
    if (!deck) return;
    if (readOnly) return toast("Starter decks are read-only — save a copy to edit.", "info");
    const blocker = addBlocker(deck, db, card);
    if (blocker) return toast(blocker, "error");
    commit(withCardAdded(deck, db, card));
  };

  const remove = (card: SimCard, all = false) => {
    if (!deck || readOnly) return;
    commit(withCardRemoved(deck, card.id, all));
  };

  return (
    <main className="mx-auto max-w-[1680px] px-4 pb-24 pt-6 sm:px-6">
      <HoverPreviewLayer />
      <header className="mb-5 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <p className="panel-title">Deck builder</p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.1em] text-ash-50">Forge your squad</h1>
        </div>
        <select
          value={activeId ?? ""}
          onChange={(e) => store.setActive(e.target.value)}
          aria-label="Choose deck"
          className="h-10 min-w-[220px] rounded-lg border border-white/10 bg-shadow-900 px-3 text-sm text-ash-50 focus:border-chakra-400/60 focus:outline-none"
        >
          {saved.length > 0 && (
            <optgroup label="My decks">
              {saved.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Starter decks">
            {starters.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </optgroup>
        </select>
        <Btn icon={<FilePlus2 className="h-4 w-4" />} onClick={() => store.create()}>
          New
        </Btn>
        <Btn icon={<Upload className="h-4 w-4" />} onClick={() => setModal("import")}>
          Import
        </Btn>
      </header>

      {deck && (
        <div className="panel mb-5 flex flex-wrap items-center gap-2 p-3">
          {readOnly ? (
            <div className="flex min-w-[200px] flex-1 items-center gap-2 px-1">
              <Lock className="h-4 w-4 text-edge-400" />
              <div>
                <p className="font-display text-base font-bold text-ash-50">{deck.name}</p>
                <p className="text-xs text-ash-500">{deck.description ?? "Starter deck"} · read-only</p>
              </div>
            </div>
          ) : (
            <input
              value={deck.name}
              onChange={(e) => store.rename(deck.id, e.target.value.slice(0, 60))}
              aria-label="Deck name"
              className="h-10 min-w-[200px] flex-1 rounded-lg border border-transparent bg-transparent px-2 font-display text-lg font-bold text-ash-50 hover:border-white/10 focus:border-chakra-400/50 focus:outline-none"
            />
          )}
          {readOnly ? (
            <Btn variant="primary" icon={<Save className="h-4 w-4" />} onClick={() => store.saveCopy(deck, `${deck.name} (copy)`)}>
              Save a copy
            </Btn>
          ) : (
            <>
              <Btn icon={<Wand2 className="h-4 w-4" />} onClick={() => setModal("auto")}>
                Auto-build
              </Btn>
              <Btn icon={<Copy className="h-4 w-4" />} onClick={() => store.saveCopy(deck, `${deck.name} (copy)`)}>
                Duplicate
              </Btn>
              <Btn icon={<Eraser className="h-4 w-4" />} onClick={() => commit({ ...deck, cards: [], updatedAt: new Date().toISOString() })} disabled={!deck.cards.length}>
                Clear
              </Btn>
              <Btn variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setModal("delete")}>
                Delete
              </Btn>
            </>
          )}
          <Btn icon={<Download className="h-4 w-4" />} onClick={() => setModal("export")}>
            Export
          </Btn>
          <Link
            href={`/simulator?deck=${encodeURIComponent(deck.id)}`}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-b from-chakra-400 to-chakra-500 px-3.5 font-display text-xs font-semibold uppercase tracking-[0.12em] text-shadow-950 shadow-[0_8px_24px_-10px_rgba(255,122,26,0.8)] hover:from-chakra-300"
          >
            <Play className="h-4 w-4" /> Play-test
          </Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="panel min-w-0 p-4" aria-label="Card pool">
          <CardBrowser cards={cards} db={db} deck={deck} readOnly={readOnly} onAdd={add} onRemove={(c) => remove(c)} />
        </section>
        <section aria-label="Deck" className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1 scroll-thin">
          {deck ? <DeckPanel deck={deck} db={db} readOnly={readOnly} onAdd={add} onRemove={remove} /> : <p className="text-ash-500">No deck.</p>}
        </section>
      </div>

      <ImportModal open={modal === "import"} onClose={() => setModal(null)} />
      {deck && <ExportModal open={modal === "export"} onClose={() => setModal(null)} deck={deck} />}
      {deck && !readOnly && <AutoBuildModal open={modal === "auto"} onClose={() => setModal(null)} deck={deck} />}
      {deck && !readOnly && (
        <Modal
          open={modal === "delete"}
          onClose={() => setModal(null)}
          title="Delete deck?"
          subtitle={`“${deck.name}” will be removed from this browser.`}
          width="max-w-md"
          footer={
            <>
              <Btn variant="ghost" onClick={() => setModal(null)}>
                Cancel
              </Btn>
              <Btn
                variant="danger"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => {
                  store.remove(deck.id);
                  setModal(null);
                  toast("Deck deleted.");
                }}
              >
                Delete
              </Btn>
            </>
          }
        >
          <p className="text-sm text-ash-400">This cannot be undone. Export the deck code first if you want a backup.</p>
        </Modal>
      )}
    </main>
  );
}

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const db = useCardPoolStore((s) => s.db);
  const saveCopy = useDeckStore((s) => s.saveCopy);

  const submit = () => {
    try {
      const deck = decodeDeck(code);
      const unknown = deck.cards.filter((e) => !db[e.cardId]).length;
      saveCopy(deck, deck.name);
      toast(unknown ? `Imported “${deck.name}” — ${unknown} unknown card(s) kept for review.` : `Imported “${deck.name}”.`, unknown ? "info" : "success");
      setCode("");
      setError(null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import deck"
      subtitle="Paste a deck code (starts with NTCG1.)"
      width="max-w-lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={submit} disabled={!code.trim()}>
            Import
          </Btn>
        </>
      }
    >
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={5}
        placeholder="NTCG1.eyJuIjoi…"
        className="w-full rounded-lg border border-white/10 bg-shadow-950 p-3 font-mono text-xs text-ash-100 focus:border-chakra-400/60 focus:outline-none"
      />
      {error && <p className="mt-2 text-sm text-blood-400">{error}</p>}
    </Modal>
  );
}

function ExportModal({ open, onClose, deck }: { open: boolean; onClose: () => void; deck: Deck }) {
  const db = useCardPoolStore((s) => s.db);
  const code = useMemo(() => encodeDeck(deck), [deck]);
  const list = useMemo(
    () =>
      deck.cards
        .map((e) => ({ e, c: db[e.cardId] }))
        .filter((x) => x.c)
        .sort((a, b) => a.c.type.localeCompare(b.c.type) || a.c.cost - b.c.cost)
        .map(({ e, c }) => `${e.quantity}x ${fullName(c)} [${c.id}]`)
        .join("\n"),
    [deck, db],
  );
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copied.`, "success");
    } catch {
      toast("Clipboard unavailable — select the text and copy it manually.", "error");
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Export deck" subtitle={deck.name} width="max-w-lg">
      <p className="panel-title mb-1.5">Deck code</p>
      <div className="flex gap-2">
        <input readOnly value={code} onFocus={(e) => e.currentTarget.select()} className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-shadow-950 px-3 font-mono text-xs text-ash-100" />
        <Btn variant="primary" onClick={() => copy(code, "Deck code")} icon={<Copy className="h-4 w-4" />}>
          Copy
        </Btn>
      </div>
      <p className="panel-title mb-1.5 mt-4">Decklist</p>
      <pre className="scroll-thin max-h-64 overflow-auto rounded-lg border border-white/10 bg-shadow-950 p-3 text-xs text-ash-300">{list || "Empty deck."}</pre>
      <div className="mt-2 flex justify-end">
        <Btn size="sm" onClick={() => copy(list, "Decklist")}>
          Copy list
        </Btn>
      </div>
    </Modal>
  );
}

function AutoBuildModal({ open, onClose, deck }: { open: boolean; onClose: () => void; deck: Deck }) {
  const cards = useCardPoolStore((s) => s.cards);
  const save = useDeckStore((s) => s.save);
  const villages = useMemo(() => [...new Set(cards.map((c) => c.village).filter((v): v is string => !!v))].sort(), [cards]);
  const leaders = useMemo(() => cards.filter((c) => c.type === "leader"), [cards]);
  const [groups, setGroups] = useState<string[]>([]);
  const [leaderName, setLeaderName] = useState("");

  const build = () => {
    const built = buildAutoDeck(cards, { id: deck.id, name: deck.name, description: deck.description ?? "", groups, leaderName: leaderName || undefined });
    save({ ...deck, cards: built.cards, updatedAt: new Date().toISOString() });
    toast("Deck auto-built. Tweak it from here.", "success");
    onClose();
  };

  const toggle = (g: string) => setGroups((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Auto-build"
      subtitle="Builds a legal 40-card deck around your picks. Replaces the current list."
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" icon={<Wand2 className="h-4 w-4" />} onClick={build}>
            Build deck
          </Btn>
        </>
      }
    >
      <p className="panel-title mb-2">Leader</p>
      <select value={leaderName} onChange={(e) => setLeaderName(e.target.value)} className="mb-4 h-10 w-full rounded-lg border border-white/10 bg-shadow-900 px-3 text-sm text-ash-50">
        <option value="">Best match for the picks below</option>
        {leaders.map((l) => (
          <option key={l.id} value={l.name}>
            {fullName(l)}
          </option>
        ))}
      </select>
      <p className="panel-title mb-2">Villages</p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {villages.map((v) => (
          <Chip key={v} active={groups.includes(v)} onClick={() => toggle(v)}>
            {v}
          </Chip>
        ))}
      </div>
      <p className="panel-title mb-2">Elements</p>
      <div className="flex flex-wrap gap-1.5">
        {ELEMENTS.map((e) => (
          <Chip key={e} active={groups.includes(ELEMENT_META[e].label)} color={ELEMENT_META[e].color} onClick={() => toggle(ELEMENT_META[e].label)}>
            <span style={{ color: ELEMENT_META[e].color }}>{ELEMENT_META[e].kanji}</span> {ELEMENT_META[e].label}
          </Chip>
        ))}
      </div>
    </Modal>
  );
}
