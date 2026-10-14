"use client";

import { AnimatePresence, motion } from "framer-motion";

const SLASHES = [
  { top: "38%", rotate: "-9deg", delay: 0 },
  { top: "62%", rotate: "-7deg", delay: 0.07 },
] as const;

/**
 * The slashing "AMBUSH!" title that cuts across the board when a hidden card
 * is revealed. Purely decorative: the live region narrates the same moment.
 */
export function AmbushTitle({ show, subtitle }: { show: boolean; subtitle: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="ambush-title"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden rounded-[inherit]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
        >
          {/* Violet flash */}
          <motion.span
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.5),rgba(46,16,101,0.35)_45%,transparent_75%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.55] }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          {/* Blade streaks */}
          {SLASHES.map((s, i) => (
            <motion.span
              key={i}
              className="absolute -left-[10%] h-[3px] w-[120%] origin-left bg-gradient-to-r from-transparent via-white to-mist-300 shadow-[0_0_18px_4px_rgba(167,139,250,0.85)]"
              style={{ top: s.top, rotate: s.rotate }}
              initial={{ scaleX: 0, opacity: 1 }}
              animate={{ scaleX: 1, opacity: [1, 1, 0] }}
              transition={{ duration: 0.5, delay: s.delay, ease: [0.7, 0, 0.3, 1] }}
            />
          ))}
          {/* Title */}
          <motion.div
            className="relative flex flex-col items-center px-4"
            initial={{ x: -140, skewX: -26, opacity: 0, scale: 1.35 }}
            animate={{ x: 0, skewX: -10, opacity: 1, scale: 1 }}
            exit={{ x: 160, skewX: -26, opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 420, damping: 24, delay: 0.1 }}
          >
            <span className="relative">
              <span className="block bg-gradient-to-r from-white via-mist-200 to-mist-400 bg-clip-text text-[52px] font-black italic leading-none tracking-tight text-transparent drop-shadow-[0_0_26px_rgba(139,92,246,0.95)] sm:text-7xl">
                AMBUSH!
              </span>
              {/* A clean cut through the letters */}
              <motion.span
                className="absolute -left-2 -right-2 top-1/2 h-[2px] origin-left bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.9)]"
                style={{ rotate: "-4deg" }}
                initial={{ scaleX: 0, opacity: 1 }}
                animate={{ scaleX: 1, opacity: [1, 1, 0] }}
                transition={{ duration: 0.4, delay: 0.42, ease: "easeOut" }}
              />
            </span>
            <span className="mt-2 rounded-full border border-mist-300/40 bg-mist-600/85 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-[0_0_24px_rgba(139,92,246,0.7)]">
              {subtitle}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
