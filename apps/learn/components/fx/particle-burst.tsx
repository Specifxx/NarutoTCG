"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FX_COLORS, type FxPalette } from "@/lib/accents";

type Shape = "spark" | "orb" | "leaf" | "star";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotate: number;
  delay: number;
  shape: Shape;
}

interface Batch {
  id: number;
  particles: Particle[];
  ring: boolean;
}

/**
 * Radial particle explosion. Increment `fire` to emit a burst from the centre
 * of the nearest positioned ancestor. Renders nothing for reduced motion.
 */
export function ParticleBurst({
  fire,
  palette = "chakra",
  count = 22,
  spread = 110,
  duration = 0.9,
  shape = "spark",
  ring = true,
  gravity = 30,
}: {
  fire: number;
  palette?: FxPalette;
  count?: number;
  spread?: number;
  duration?: number;
  shape?: Shape | "mixed";
  ring?: boolean;
  gravity?: number;
}) {
  const reduce = useReducedMotion();
  const [batches, setBatches] = useState<Batch[]>([]);
  const seq = useRef(0);
  const last = useRef(fire);

  useEffect(() => {
    if (fire === last.current) return;
    last.current = fire;
    if (reduce || fire <= 0) return;
    const colors = FX_COLORS[palette];
    const shapes: Shape[] = ["spark", "orb", "leaf", "star"];
    const batchId = ++seq.current;
    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const dist = spread * (0.45 + Math.random() * 0.55);
      return {
        id: i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        rotate: (angle * 180) / Math.PI,
        delay: Math.random() * 0.08,
        shape: shape === "mixed" ? shapes[i % shapes.length]! : shape,
      };
    });
    setBatches((b) => [...b.slice(-3), { id: batchId, particles, ring }]);
    const t = setTimeout(() => setBatches((b) => b.filter((x) => x.id !== batchId)), (duration + 0.25) * 1000);
    return () => clearTimeout(t);
  }, [fire, reduce, palette, count, spread, duration, shape, ring]);

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-visible">
      <AnimatePresence>
        {batches.map((batch) => (
          <span key={batch.id} className="absolute left-1/2 top-1/2 h-0 w-0">
            {batch.ring && (
              <motion.span
                className="absolute -left-6 -top-6 h-12 w-12 rounded-full border-2"
                style={{ borderColor: FX_COLORS[palette][2] }}
                initial={{ scale: 0.2, opacity: 0.9 }}
                animate={{ scale: spread / 18, opacity: 0 }}
                transition={{ duration: duration * 0.8, ease: "easeOut" }}
              />
            )}
            {batch.particles.map((p) => (
              <motion.span
                key={p.id}
                className="absolute"
                style={{
                  left: -p.size / 2,
                  top: -p.size / 2,
                  width: p.shape === "spark" ? p.size * 2.6 : p.size,
                  height: p.shape === "leaf" ? p.size * 1.8 : p.size,
                  background: p.color,
                  borderRadius: p.shape === "orb" ? "9999px" : p.shape === "leaf" ? "70% 0 70% 0" : "2px",
                  boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                  clipPath:
                    p.shape === "star"
                      ? "polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%)"
                      : undefined,
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: p.rotate }}
                animate={{
                  x: p.x,
                  y: [0, p.y * 0.85, p.y + gravity],
                  opacity: [1, 1, 0],
                  scale: [1, 1, 0.2],
                  rotate: p.rotate + (p.shape === "spark" ? 0 : 180),
                }}
                transition={{ duration, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
          </span>
        ))}
      </AnimatePresence>
    </span>
  );
}
