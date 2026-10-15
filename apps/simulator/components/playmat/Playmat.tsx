"use client";

import { LayoutGroup } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/game-engine/store";
import { cardBox, type CardSize } from "../cards/CardFace";
import { HoverPreviewLayer } from "../cards/HoverPreview";
import { ActionLog } from "./ActionLog";
import { useBoardUi } from "./boardUi";
import { CardInspector } from "./CardInspector";
import { ControlPanel } from "./ControlPanel";
import { GameOverModal, GraveyardModal, MulliganModal } from "./GameModals";
import { GameSetupPanel } from "./GameSetupPanel";
import { HandZone } from "./HandZone";
import { MissionLane } from "./MissionLane";
import { PhaseBar } from "./PhaseBar";
import { PlayerStrip } from "./PlayerStrip";
import { useGameDirector } from "./useGameDirector";

/** Hand card size that fits the viewport height. */
function useHandSize(): CardSize {
  const [size, setSize] = useState<CardSize>("md");
  useEffect(() => {
    const update = () => setSize(window.innerHeight >= 900 ? "md" : "sm");
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

export function Playmat() {
  const game = useGameStore((s) => s.game);
  const reset = useBoardUi((s) => s.reset);
  const setIntent = useBoardUi((s) => s.setIntent);
  const handSize = useHandSize();
  const missionsRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ left: false, right: false });
  useGameDirector();

  useEffect(() => {
    reset();
  }, [game?.seed, reset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIntent({ kind: "none" });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIntent]);

  const revealed = game?.missions.filter((m) => m.revealed).length ?? 0;
  useEffect(() => {
    const el = missionsRef.current;
    if (!el) return;
    const update = () => setScroll({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [game !== null, revealed]);

  if (!game) return <GameSetupPanel />;

  const bottomHuman = game.players[0].controller === "human";
  const trayHeight = cardBox(handSize).height + 34;
  const scrollBy = (dir: number) => missionsRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  return (
    <main className="playmat-fit mx-auto flex max-w-[2200px] flex-col gap-2 px-2 pb-2 pt-2">
      <HoverPreviewLayer />
      <LayoutGroup>
        <PhaseBar />
        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
          <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2" aria-label="Playmat">
            <PlayerStrip player={1} position="top" />

            <div className="playmat-missions relative flex-1">
              <div ref={missionsRef} className="scroll-thin flex h-full snap-x gap-2 overflow-x-auto overflow-y-hidden pb-1" aria-label="Missions">
                {game.missions.map((m, i) => (
                  <MissionLane key={m.instanceId} index={i} />
                ))}
              </div>
              {scroll.left && (
                <button
                  type="button"
                  onClick={() => scrollBy(-1)}
                  aria-label="Scroll missions left"
                  className="absolute left-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-shadow-900/90 text-ash-100 shadow-xl hover:border-chakra-400/60"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {scroll.right && (
                <button
                  type="button"
                  onClick={() => scrollBy(1)}
                  aria-label="Scroll missions right"
                  className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-shadow-900/90 text-ash-100 shadow-xl hover:border-chakra-400/60"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>

            <PlayerStrip player={0} position="bottom" />
            <div className="panel shrink-0 px-2 pb-4 pt-2" style={{ height: trayHeight }}>
              <HandZone player={0} faceUp={bottomHuman} size={handSize} />
            </div>
          </section>

          <aside
            className="playmat-aside scroll-thin flex shrink-0 flex-col gap-2 lg:min-h-0 lg:w-[320px] lg:overflow-y-auto xl:w-[340px]"
            aria-label="Controls"
          >
            <ControlPanel />
            <CardInspector />
            <ActionLog fill />
          </aside>
        </div>
      </LayoutGroup>
      <MulliganModal />
      <GraveyardModal />
      <GameOverModal />
    </main>
  );
}
