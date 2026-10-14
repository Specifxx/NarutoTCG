"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { create } from "zustand";
import type { SimCard } from "@/lib/cards/types";
import { CardDetail } from "./CardDetail";

interface HoverState {
  card: SimCard | null;
  rect: DOMRect | null;
  show: (card: SimCard, el: HTMLElement) => void;
  hide: () => void;
}

export const useHoverPreview = create<HoverState>((set) => ({
  card: null,
  rect: null,
  show: (card, el) => set({ card, rect: el.getBoundingClientRect() }),
  hide: () => set({ card: null, rect: null }),
}));

/** Mouse-only props that show the floating preview next to an element. */
export function hoverProps(card: SimCard) {
  return {
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") useHoverPreview.getState().show(card, e.currentTarget);
    },
    onPointerLeave: () => useHoverPreview.getState().hide(),
  };
}

const W = 300;

/** Floating card preview positioned beside the hovered element (desktop). */
export function HoverPreviewLayer() {
  const { card, rect } = useHoverPreview();
  const hide = useHoverPreview((s) => s.hide);
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);

  useEffect(() => {
    const update = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", hide, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", hide, true);
    };
  }, [hide]);

  if (!vw || vw < 900) return null;
  const left = rect ? (rect.right + 16 + W < vw ? rect.right + 16 : Math.max(8, rect.left - W - 16)) : 0;
  const top = rect ? Math.min(Math.max(64, rect.top - 40), Math.max(64, vh - 620)) : 0;

  return (
    <AnimatePresence>
      {card && rect && (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, x: rect.right + 16 + W < vw ? -8 : 8, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          className="panel pointer-events-none fixed z-[70] p-4"
          style={{ left, top, width: W }}
        >
          <CardDetail card={card} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
