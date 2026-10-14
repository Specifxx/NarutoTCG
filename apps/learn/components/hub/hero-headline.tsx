"use client";

import { motion, type Variants } from "framer-motion";
import { useCalmMotion } from "./primitives";

const LINE_ONE = "Train in the Dojo.";
const LINE_TWO = "Lead like a Kage.";

const line: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.032, delayChildren: 0.12 } },
};

const letter: Variants = {
  hidden: { opacity: 0, y: "0.5em", rotateX: -75, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: "0em",
    rotateX: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 260, damping: 22 },
  },
};

const BRUSH_EASE = [0.65, 0, 0.35, 1] as const;

/**
 * Two-line hero headline: the first line rises letter by letter, the second is
 * painted on with a chakra brush sweep. Screen readers get the plain sentence.
 */
export function HeroHeadline({ id }: { id?: string }) {
  const reduce = useCalmMotion();
  const words = LINE_ONE.split(" ");
  return (
    <h1 id={id} className="mt-5 text-[2.65rem] font-black leading-[0.98] tracking-tight text-white min-[400px]:text-5xl sm:text-6xl lg:text-[3.9rem] xl:text-[4.25rem]">
      <span className="sr-only">
        {LINE_ONE} {LINE_TWO}
      </span>
      <motion.span
        aria-hidden="true"
        className="block [perspective:700px]"
        variants={line}
        initial="hidden"
        animate="show"
      >
        {words.map((word, w) => (
          <span key={w}>
            <span className="inline-block whitespace-nowrap">
              {Array.from(word).map((ch, i) => (
                <motion.span key={i} variants={letter} className="inline-block origin-bottom will-change-transform">
                  {ch}
                </motion.span>
              ))}
            </span>
            {w < words.length - 1 ? " " : null}
          </span>
        ))}
      </motion.span>
      <span aria-hidden="true" className="relative mt-1 inline-block max-w-full">
        {/* Soft glow made from a blurred copy of the gradient text. */}
        <motion.span
          className="text-chakra-gradient pointer-events-none absolute inset-0 select-none blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ delay: 1.2, duration: 1.2 }}
        >
          {LINE_TWO}
        </motion.span>
        <motion.span
          className="text-chakra-gradient relative inline-block pb-[0.06em] pr-[0.04em]"
          initial={{ clipPath: "inset(-20% 100% -30% -4%)" }}
          animate={{ clipPath: "inset(-20% -4% -30% -4%)" }}
          transition={{ duration: 0.95, delay: 0.7, ease: BRUSH_EASE }}
        >
          {LINE_TWO}
        </motion.span>
        {!reduce && (
          <motion.span
            className="pointer-events-none absolute bottom-[12%] top-[8%] w-[3px] rounded-full bg-chakra-100 shadow-[0_0_22px_8px_rgba(255,122,26,0.75)]"
            initial={{ left: "0%", opacity: 0 }}
            animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.95, delay: 0.7, ease: BRUSH_EASE }}
          />
        )}
      </span>
    </h1>
  );
}
