"use client";

import { useMemo } from "react";
import { useCollection } from "@/lib/collection";
import { countOwned } from "./checklist-model";
import { ProgressBar, percentLabel } from "./ProgressBar";

/** Owned-printings meter for one set. Pre-rendered HTML shows 0 owned until hydration. */
export function SetOwnedProgress({ keys, setLabel }: { keys: readonly string[]; setLabel: string }) {
  const { owned } = useCollection();
  const ownedCount = useMemo(() => countOwned(keys, owned), [keys, owned]);
  const total = keys.length;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold uppercase tracking-[0.14em] text-ash-400">Owned</span>
        <span className="tabular-nums text-ash-200">
          <span className="font-semibold text-white">{ownedCount}</span> / {total}
          <span className="ml-1.5 text-ash-400">{percentLabel(ownedCount, total)}</span>
        </span>
      </div>
      <ProgressBar
        value={ownedCount}
        max={total}
        tone="owned"
        size="sm"
        label={`${setLabel} printings owned`}
        valueText={`${ownedCount} of ${total} printings owned`}
        className="mt-1.5"
      />
    </div>
  );
}
