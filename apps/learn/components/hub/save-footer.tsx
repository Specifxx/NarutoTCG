"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, type SyntheticEvent } from "react";
import { ParticleBurst } from "@/components/fx/particle-burst";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { RANKS, useProgress } from "@/lib/progress";
import { Skeleton } from "./primitives";
import type { HubProgress } from "./use-hub-progress";

const FIRST_RANK = RANKS[0]?.title ?? "Academy Student";

function LossChip({ value, label }: { value: string; label: string }) {
  return (
    <li className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2">
      <span className="text-base font-black tabular-nums text-white">{value}</span>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ash-500">{label}</span>
    </li>
  );
}

/**
 * "Progress is saved in this browser" note with a guarded Reset button. The
 * confirmation is a native modal <dialog> (focus trap, Escape, inert page)
 * with an animated panel inside.
 */
export function SaveFooter({ progress }: { progress: HubProgress }) {
  const { awards, reset } = useProgress();
  const { hydrated } = progress;
  const saved = hydrated ? Object.keys(awards).length : 0;
  const cleared = progress.puzzlesCleared.filter(Boolean).length;

  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [burst, setBurst] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const focusAfterClose = useRef<"trigger" | "notice">("trigger");
  // Guards against a double click on "Reset progress" while the panel animates out.
  const confirmed = useRef(false);

  const openDialog = () => {
    const dialog = dialogRef.current;
    if (!dialog || open) return;
    focusAfterClose.current = "trigger";
    confirmed.current = false;
    setNotice("");
    if (!dialog.open) dialog.showModal();
    setOpen(true);
  };

  const requestClose = () => setOpen(false);

  // Runs once the panel's exit animation has finished.
  const finishClose = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    const target = focusAfterClose.current === "notice" ? noticeRef.current : triggerRef.current;
    target?.focus();
  };

  const onCancel = (e: SyntheticEvent<HTMLDialogElement>) => {
    // Escape: play the exit animation instead of vanishing instantly.
    e.preventDefault();
    requestClose();
  };

  const confirmReset = () => {
    if (confirmed.current) return;
    confirmed.current = true;
    reset();
    focusAfterClose.current = "notice";
    setNotice(`Progress reset. You are an ${FIRST_RANK} again: every lesson, puzzle and keyword is ready to earn XP.`);
    setBurst((b) => b + 1);
    setOpen(false);
  };

  return (
    <section aria-labelledby="dojo-save-title" className="relative pb-6 pt-16 sm:pt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ type: "spring", stiffness: 130, damping: 20 }}
        className="panel relative flex flex-col gap-5 overflow-hidden p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(74,222,128,0.14),transparent)] blur-2xl"
        />
        <div className="relative flex min-w-0 items-start gap-4">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-leaf-400/30 bg-leaf-500/10 text-leaf-300 shadow-[0_0_24px_-8px_rgba(74,222,128,0.6)]"
          >
            <Icon name="shield" size={20} />
          </span>
          <div className="min-w-0">
            <h2 id="dojo-save-title" className="text-base font-black tracking-tight text-white sm:text-lg">
              Progress is saved in this browser
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ash-400">
              Your XP, lesson stars, cleared puzzles and explored keywords are stored on this device only. Nothing is
              uploaded, so another browser (or clearing site data) starts you fresh.
            </p>
            <p className="mt-2 text-[12.5px] font-semibold text-ash-500">
              {hydrated ? (
                saved > 0 ? (
                  <>
                    <span className="tabular-nums text-ash-200">{progress.xp}</span> XP across{" "}
                    <span className="tabular-nums text-ash-200">{saved}</span> achievement{saved === 1 ? "" : "s"} saved.
                  </>
                ) : (
                  "Nothing saved yet: finish a lesson stage to earn your first XP."
                )
              ) : (
                <Skeleton className="h-3.5 w-48" />
              )}
            </p>
            <p
              ref={noticeRef}
              tabIndex={-1}
              aria-live="polite"
              className="mt-2 rounded-md text-[13px] font-semibold text-leaf-300 outline-none empty:mt-0"
            >
              {notice}
            </p>
          </div>
        </div>
        <div className="relative shrink-0 self-start sm:self-center">
          <Button
            ref={triggerRef}
            variant="danger"
            onClick={openDialog}
            disabled={!hydrated || saved === 0}
            aria-haspopup="dialog"
          >
            <Icon name="refresh" size={15} />
            Reset progress
          </Button>
          <ParticleBurst fire={burst} palette="leaf" count={22} spread={90} shape="leaf" />
        </div>
      </motion.div>

      <dialog
        ref={dialogRef}
        aria-labelledby="dojo-reset-title"
        aria-describedby="dojo-reset-desc"
        onCancel={onCancel}
        onClose={requestClose}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-ash-200 backdrop:bg-transparent open:flex open:items-center open:justify-center"
      >
        <AnimatePresence onExitComplete={finishClose}>
          {open && (
            <motion.div
              key="reset-confirm"
              className="absolute inset-0 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div aria-hidden="true" className="absolute inset-0 bg-shadow-950/75 backdrop-blur-sm" onClick={requestClose} />
              <motion.div
                className="panel relative w-full max-w-md overflow-hidden p-6"
                initial={{ scale: 0.92, y: 18 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 10 }}
                transition={{ type: "spring", stiffness: 340, damping: 26 }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgba(239,64,96,0.3),transparent)] blur-xl"
                />
                <div className="relative flex items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blood-400/40 bg-blood-500/15 text-blood-400"
                  >
                    <Icon name="refresh" size={20} />
                  </span>
                  <div className="min-w-0">
                    <h2 id="dojo-reset-title" className="text-xl font-black tracking-tight text-white">
                      Reset all progress?
                    </h2>
                    <p id="dojo-reset-desc" className="mt-1.5 text-sm leading-relaxed text-ash-400">
                      This wipes your saved progress from this browser and sends you back to {FIRST_RANK}. It cannot be
                      undone.
                    </p>
                  </div>
                </div>
                <ul className="relative mt-5 grid grid-cols-2 gap-2 min-[400px]:grid-cols-4" aria-label="What will be cleared">
                  <LossChip value={`${progress.xp}`} label="XP" />
                  <LossChip value={`${progress.stars}/${progress.maxStars}`} label="Stars" />
                  <LossChip value={`${cleared}/${progress.puzzleCount}`} label="Puzzles" />
                  <LossChip value={`${progress.keywordsExplored}/${progress.keywordTotal}`} label="Keywords" />
                </ul>
                <div className="relative mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                  <Button variant="secondary" autoFocus onClick={requestClose}>
                    Keep my progress
                  </Button>
                  <Button variant="danger" onClick={confirmReset}>
                    <Icon name="refresh" size={15} />
                    Reset progress
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </dialog>
    </section>
  );
}
