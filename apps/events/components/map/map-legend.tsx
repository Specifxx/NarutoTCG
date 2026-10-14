"use client";

import type { EventType } from "@naruto-tcg/types";
import { ChevronUp, Layers } from "lucide-react";
import { useId, useState, type CSSProperties } from "react";
import { focusRing } from "@/components/directory/shared";
import { EVENT_TYPES } from "@/lib/event-meta";
import { cx } from "@/lib/format";

/**
 * Glassy legend over the map. Each entry toggles its type in the URL filters;
 * counts ignore the type filter so they show what toggling would add.
 * Collapsed behind a button on small screens to keep the map visible.
 */
export function MapLegend({
  counts,
  activeTypes,
  onToggle,
}: {
  counts: Record<EventType, number>;
  activeTypes: readonly EventType[];
  onToggle: (type: EventType) => void;
}) {
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const titleId = `${baseId}-title`;
  const filtering = activeTypes.length > 0;

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-[1000] max-w-[calc(100%-1.5rem)] rounded-xl border border-shadow-700/80 bg-shadow-950/80 shadow-2xl shadow-black/60 backdrop-blur-md">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-ash-200 transition-colors hover:text-chakra-400 sm:hidden",
          focusRing,
        )}
      >
        <Layers className="h-3.5 w-3.5 text-chakra-400" aria-hidden="true" />
        Legend
        {filtering && (
          <span className="rounded-full bg-chakra-500 px-1.5 text-[10px] font-bold text-shadow-950 tabular-nums">
            {activeTypes.length}
            <span className="sr-only"> types selected</span>
          </span>
        )}
        <ChevronUp className={cx("ml-auto h-3.5 w-3.5 transition-transform", !open && "rotate-180")} aria-hidden="true" />
      </button>

      <div id={listId} className={cx("w-[13.25rem] p-1.5 max-sm:pt-0", !open && "max-sm:hidden")}>
        <p
          id={titleId}
          className="hidden px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ash-400 sm:block"
        >
          Event types
        </p>
        <ul role="group" aria-labelledby={titleId} className="grid gap-px">
          {EVENT_TYPES.map((meta) => {
            const pressed = activeTypes.includes(meta.type);
            const dimmed = filtering && !pressed;
            return (
              <li key={meta.type}>
                <button
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => onToggle(meta.type)}
                  title={pressed ? `Remove ${meta.label} filter` : `Filter to ${meta.label}`}
                  className={cx(
                    "group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                    pressed ? "bg-shadow-800 text-white" : "text-ash-200 hover:bg-shadow-800/70",
                    dimmed && "text-ash-400",
                    focusRing,
                  )}
                >
                  <span
                    className={cx(
                      "h-2.5 w-2.5 shrink-0 rounded-full transition-opacity",
                      dimmed ? "opacity-35" : "shadow-[0_0_8px_var(--dot)]",
                      pressed && "ring-2 ring-[var(--dot)] ring-offset-2 ring-offset-shadow-800",
                    )}
                    style={{ "--dot": meta.hex, backgroundColor: meta.hex } as CSSProperties}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{meta.shortLabel}</span>
                  <span className={cx("tabular-nums", dimmed ? "text-ash-400/70" : "text-ash-400")}>
                    {counts[meta.type]}
                    <span className="sr-only"> events</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
