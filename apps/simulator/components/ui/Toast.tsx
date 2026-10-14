"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { create } from "zustand";

type Tone = "info" | "success" | "error";

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: Tone) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, tone = "info") => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.filter((t) => t.message !== message), { id, tone, message }].slice(-4) }));
    setTimeout(() => get().dismiss(id), tone === "error" ? 4200 : 2800);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string, tone?: Tone) => useToasts.getState().push(message, tone);

const ICONS = { info: Info, success: CheckCircle2, error: AlertTriangle };
const TONES = {
  info: "border-white/10 text-ash-100",
  success: "border-jade-400/40 text-jade-400",
  error: "border-blood-500/50 text-blood-400",
};

export function ToastViewport() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <motion.button
              key={t.id}
              type="button"
              layout
              onClick={() => dismiss(t.id)}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border bg-shadow-900/95 px-4 py-2.5 text-left text-sm shadow-2xl shadow-black/60 backdrop-blur ${TONES[t.tone]}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-ash-100">{t.message}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
