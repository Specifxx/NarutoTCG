"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { RichText } from "@/components/ui/rich-text";
import { cn } from "@/lib/cn";
import { StarRow } from "./star-row";
import { useModalFocus } from "./use-modal-focus";

export function HintsDrawer({
  open,
  onClose,
  hints,
  revealed,
  onReveal,
  sawSolution,
  onShowSolution,
  potentialStars,
}: {
  open: boolean;
  onClose: () => void;
  hints: readonly string[];
  revealed: number;
  onReveal: () => void;
  sawSolution: boolean;
  onShowSolution: () => void;
  potentialStars: number;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);

  useModalFocus(open, panel, onClose, () => closeBtn.current);

  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  const allShown = revealed >= hints.length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="hints"
          className="fixed inset-0 z-[65] flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close hints"
            tabIndex={-1}
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hints-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-white/10 bg-shadow-900/95 shadow-2xl shadow-black backdrop-blur-xl"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-400/10 blur-3xl"
            />
            <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
              <div>
                <p className="eyebrow !text-[10px] text-gold-300">Sensei&apos;s scroll</p>
                <h2 id="hints-title" className="mt-0.5 text-xl font-black text-white">
                  Hints
                </h2>
              </div>
              <button
                ref={closeBtn}
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ash-300 transition hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-300"
                aria-label="Close hints"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="relative flex-1 overflow-y-auto px-5 py-5">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                <span className="text-[12px] text-ash-400">Best rating still possible</span>
                <StarRow value={potentialStars} size={15} label={`${potentialStars} of 3 stars still possible`} />
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ash-400">
                A clear with no help earns 3 stars. Any hint caps it at 2, and showing the solution caps it at 1 star and
                half the XP.
              </p>

              <ol className="mt-5 flex flex-col gap-3" aria-live="polite">
                {hints.map((hint, i) => {
                  const shown = i < revealed;
                  return (
                    <motion.li
                      key={i}
                      layout
                      className={cn(
                        "relative overflow-hidden rounded-xl border p-3.5",
                        shown ? "border-gold-400/25 bg-gold-400/[0.05]" : "border-dashed border-white/10 bg-white/[0.02]",
                      )}
                    >
                      <p className="eyebrow flex items-center gap-1.5 !text-[10px] text-ash-500">
                        <Icon name={shown ? "lightbulb" : "lock"} size={12} className={shown ? "text-gold-300" : undefined} />
                        Hint {i + 1}
                      </p>
                      <AnimatePresence initial={false} mode="wait">
                        {shown ? (
                          <motion.div
                            key="shown"
                            initial={{ opacity: 0, filter: "blur(6px)", y: 6 }}
                            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                            transition={{ duration: 0.45 }}
                          >
                            <RichText as="p" text={hint} className="mt-1.5 text-[13.5px] leading-relaxed text-ash-200" />
                          </motion.div>
                        ) : (
                          <motion.p key="hidden" className="mt-1.5 select-none text-[13px] text-ash-500 blur-[3px]" aria-hidden="true">
                            The scroll is sealed until you need it.
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  );
                })}
              </ol>

              {!allShown && (
                <Button variant="gold" className="mt-4 w-full" onClick={onReveal}>
                  <Icon name="lightbulb" size={16} />
                  Reveal hint {revealed + 1} of {hints.length}
                </Button>
              )}

              <div className="mt-8 rounded-xl border border-blood-400/20 bg-blood-500/[0.05] p-4">
                <p className="flex items-center gap-2 text-sm font-black text-white">
                  <Icon name="book" size={16} className="text-blood-400" />
                  Show the solution
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ash-400">
                  {sawSolution
                    ? "You have seen the solution this visit. Replay the walkthrough any time."
                    : "Resets the board and walks you through the winning line one step at a time. Caps this clear at 1 star and half XP."}
                </p>
                {confirming && !sawSolution ? (
                  <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Confirm showing the solution">
                    <Button variant="danger" size="sm" onClick={onShowSolution}>
                      <Icon name="check" size={14} />
                      Yes, show me
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
                      Keep trying
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    className="mt-3"
                    onClick={() => (sawSolution ? onShowSolution() : setConfirming(true))}
                  >
                    <Icon name="play" size={14} />
                    {sawSolution ? "Replay walkthrough" : "Show solution"}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
