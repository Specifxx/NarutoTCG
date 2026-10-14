"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { CARD_DATA_URL, useCardPool } from "@/lib/cards/store";
import { useDeckStoreHydration } from "@/lib/deck/store";

/** Renders children only once the card pool and saved decks are loaded. */
export function PoolGate({ children }: { children: ReactNode }) {
  const pool = useCardPool();
  const hydrated = useDeckStoreHydration();

  if (pool.status === "error") {
    return (
      <div className="mx-auto mt-24 max-w-lg px-6">
        <div className="panel flex items-start gap-3 p-5 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blood-400" />
          <div>
            <p className="font-display font-semibold uppercase tracking-wider text-ash-50">Card pool failed to load</p>
            <p className="mt-1 text-ash-400">{pool.error}</p>
            <p className="mt-2 text-ash-500">
              Check that <code className="text-chakra-300">public{CARD_DATA_URL}</code> exists and is valid JSON.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pool.status !== "ready" || !hydrated) {
    return (
      <div className="mt-32 flex flex-col items-center gap-3 text-ash-400" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-chakra-400" />
        <span className="font-display text-xs uppercase tracking-[0.2em]">Gathering chakra…</span>
      </div>
    );
  }

  return <>{children}</>;
}
