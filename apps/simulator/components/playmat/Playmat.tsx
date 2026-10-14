"use client";

import { LayoutGroup } from "framer-motion";
import { useEffect } from "react";
import { useGameStore } from "@/lib/game-engine/store";
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

export function Playmat() {
  const game = useGameStore((s) => s.game);
  const reset = useBoardUi((s) => s.reset);
  const setIntent = useBoardUi((s) => s.setIntent);
  useGameDirector();

  useEffect(() => {
    reset();
  }, [game?.seed, reset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIntent({ kind: "none" });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIntent]);

  if (!game) return <GameSetupPanel />;

  const bottomHuman = game.players[0].controller === "human";

  return (
    <main className="mx-auto max-w-[1680px] px-3 pb-10 pt-3 sm:px-4">
      <HoverPreviewLayer />
      <LayoutGroup>
        <PhaseBar />
        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_368px]">
          <section className="min-w-0 space-y-3" aria-label="Playmat">
            <PlayerStrip player={1} position="top" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {game.missions.map((m, i) => (
                <MissionLane key={m.instanceId} index={i} />
              ))}
            </div>
            <PlayerStrip player={0} position="bottom" />
            <div className="panel overflow-x-auto overflow-y-visible pb-2 scroll-thin">
              <HandZone player={0} faceUp={bottomHuman} size="md" />
            </div>
          </section>
          <aside className="space-y-3 xl:sticky xl:top-16 xl:max-h-[calc(100dvh-5rem)] xl:self-start xl:overflow-y-auto xl:pr-1 scroll-thin" aria-label="Controls">
            <ControlPanel />
            <CardInspector />
            <ActionLog />
          </aside>
        </div>
      </LayoutGroup>
      <MulliganModal />
      <GraveyardModal />
      <GameOverModal />
    </main>
  );
}
