"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FX_COLORS, type FxPalette } from "@/lib/accents";

interface Flight {
  id: number;
  xs: number[];
  ys: number[];
  size: number;
  color: string;
  delay: number;
  duration: number;
  onArrive?: () => void;
}

export interface EmitOptions {
  count?: number;
  palette?: FxPalette;
  /** Seconds each particle takes to fly. */
  duration?: number;
  /** Seconds between particle launches. */
  stagger?: number;
  size?: number;
  /** Called once per particle as it lands (use it to tick a gauge up). */
  onArrive?: (index: number) => void;
  /** Called after the last particle lands. */
  onDone?: () => void;
}

type Target = Element | DOMRect | null | undefined;

const rectOf = (t: Target) => (t instanceof Element ? t.getBoundingClientRect() : t ?? null);

/**
 * Particles that fly from one element to another along curved paths, e.g.
 * Chakra flowing from a card into a gauge. Render `layer` once, call `emit`.
 */
export function useParticleFlight(): { emit: (from: Target, to: Target, options?: EmitOptions) => void; layer: ReactNode } {
  const reduce = useReducedMotion();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [mounted, setMounted] = useState(false);
  const seq = useRef(0);

  useEffect(() => setMounted(true), []);

  const emit = useCallback(
    (from: Target, to: Target, options: EmitOptions = {}) => {
      const { count = 10, palette = "energy", duration = 0.75, stagger = 0.05, size = 9, onArrive, onDone } = options;
      const a = rectOf(from);
      const b = rectOf(to);
      if (reduce || !a || !b) {
        for (let i = 0; i < count; i++) onArrive?.(i);
        onDone?.();
        return;
      }
      const colors = FX_COLORS[palette];
      const ax = a.left + a.width / 2;
      const ay = a.top + a.height / 2;
      const bx = b.left + b.width / 2;
      const by = b.top + b.height / 2;
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      let landed = 0;
      const batch: Flight[] = Array.from({ length: count }, (_, i) => {
        const sx = ax + (Math.random() - 0.5) * a.width * 0.5;
        const sy = ay + (Math.random() - 0.5) * a.height * 0.5;
        const ex = bx + (Math.random() - 0.5) * Math.min(24, b.width * 0.4);
        const ey = by + (Math.random() - 0.5) * Math.min(24, b.height * 0.4);
        // Control point bowed perpendicular to the path for a curved flight.
        const bow = (Math.random() - 0.5) * Math.min(260, len * 0.9);
        const cx = (sx + ex) / 2 + (-dy / len) * bow;
        const cy = (sy + ey) / 2 + (dx / len) * bow - Math.min(80, len * 0.2);
        const ts = [0, 0.25, 0.5, 0.75, 1];
        const q = (p0: number, p1: number, p2: number, t: number) => (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2;
        return {
          id: ++seq.current,
          xs: ts.map((t) => q(sx, cx, ex, t)),
          ys: ts.map((t) => q(sy, cy, ey, t)),
          size: size * (0.7 + Math.random() * 0.6),
          color: colors[Math.floor(Math.random() * colors.length)]!,
          delay: i * stagger,
          duration: duration * (0.85 + Math.random() * 0.3),
          onArrive: () => {
            onArrive?.(i);
            landed += 1;
            if (landed === count) onDone?.();
          },
        };
      });
      setFlights((f) => [...f, ...batch]);
    },
    [reduce],
  );

  const remove = useCallback((id: number) => setFlights((f) => f.filter((x) => x.id !== id)), []);

  const layer =
    mounted && flights.length > 0
      ? createPortal(
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70]">
            {flights.map((f) => (
              <motion.span
                key={f.id}
                className="absolute left-0 top-0 rounded-full"
                style={{
                  width: f.size,
                  height: f.size,
                  marginLeft: -f.size / 2,
                  marginTop: -f.size / 2,
                  background: `radial-gradient(circle, #fff 0%, ${f.color} 45%, transparent 72%)`,
                  boxShadow: `0 0 ${f.size * 1.6}px ${f.size * 0.5}px ${f.color}`,
                }}
                initial={{ x: f.xs[0], y: f.ys[0], opacity: 0, scale: 0.4 }}
                animate={{ x: f.xs, y: f.ys, opacity: [0, 1, 1, 1, 0.9], scale: [0.4, 1.25, 1, 0.9, 0.5] }}
                transition={{ duration: f.duration, delay: f.delay, ease: "easeInOut" }}
                onAnimationComplete={() => {
                  f.onArrive?.();
                  remove(f.id);
                }}
              />
            ))}
          </div>,
          document.body,
        )
      : null;

  return { emit, layer };
}
