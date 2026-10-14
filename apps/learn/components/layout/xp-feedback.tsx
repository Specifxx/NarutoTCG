"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { Button } from "@/components/ui/button";
import { Emblem } from "@/components/ui/emblem";
import { useProgress } from "@/lib/progress";

function ToastItem({ id, label, xp }: { id: number; label: string; xp: number }) {
  const { dismissToast } = useProgress();
  useEffect(() => {
    const t = setTimeout(() => dismissToast(id), 3200);
    return () => clearTimeout(t);
  }, [id, dismissToast]);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 40, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className="pointer-events-auto flex items-center gap-3 rounded-xl border border-gold-400/30 bg-shadow-900/95 py-2 pl-2 pr-4 shadow-2xl shadow-black/60 backdrop-blur-xl"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold-200 to-gold-500 text-shadow-950">
        <Emblem name="shuriken" size={20} />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-black text-gold-200">+{xp} XP</span>
        <span className="text-xs text-ash-300">{label}</span>
      </span>
    </motion.li>
  );
}

/** XP toasts (bottom-right) and the full-screen rank-up celebration. */
export function XpFeedback() {
  const { toasts, rankUp, clearRankUp } = useProgress();
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!rankUp) return;
    setBurst((b) => b + 1);
    const t = setTimeout(() => setBurst((b) => b + 1), 450);
    return () => clearTimeout(t);
  }, [rankUp]);

  useEffect(() => {
    if (!rankUp) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && clearRankUp();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rankUp, clearRankUp]);

  return (
    <>
      <ol aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(320px,calc(100vw-2rem))] flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastItem key={t.id} {...t} />
          ))}
        </AnimatePresence>
      </ol>
      <AnimatePresence>
        {rankUp && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rank-up-title"
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={clearRankUp}
          >
            <motion.div
              className="panel relative flex w-full max-w-sm flex-col items-center gap-4 overflow-visible px-8 py-10 text-center"
              initial={{ scale: 0.6, y: 40, rotate: -4 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <ParticleBurst fire={burst} palette="gold" count={36} spread={170} shape="mixed" />
                <motion.span
                  className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gold-200 via-gold-400 to-chakra-500 text-shadow-950 shadow-[0_0_60px_rgba(245,197,66,0.7)]"
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
                >
                  <Emblem name="kage" size={52} />
                </motion.span>
              </div>
              <p className="eyebrow text-gold-300">Rank up</p>
              <h2 id="rank-up-title" className="text-gold-gradient text-4xl font-black tracking-tight">
                {rankUp.title}
              </h2>
              <p className="text-sm text-ash-300">{rankUp.blurb}</p>
              <Button variant="gold" onClick={clearRankUp} autoFocus>
                Continue training
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
