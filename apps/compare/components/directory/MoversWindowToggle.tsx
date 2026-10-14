"use client";

import { cx } from "@naruto-tcg/ui";
import { DirectoryLink, useDirectory } from "./DirectoryProvider";
import { MOVER_WINDOWS, MOVERS_WINDOW_LABEL } from "./href";

/** 7D / 30D switch for the movers panels. Links, so each window has its own URL. */
export function MoversWindowToggle() {
  const { movers } = useDirectory();
  return (
    <div
      role="group"
      aria-label="Movers change window"
      className="inline-flex shrink-0 rounded-lg border border-shadow-700 bg-shadow-900 p-1"
    >
      {MOVER_WINDOWS.map((window) => {
        const active = window === movers;
        return (
          <DirectoryLink
            key={window}
            patch={{ movers: window }}
            region="movers"
            aria-current={active ? "true" : undefined}
            title={`${MOVERS_WINDOW_LABEL[window].long} change`}
            className={cx(
              "flex h-8 min-w-12 items-center justify-center rounded-md px-3 text-sm font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 pointer-coarse:h-10",
              active ? "bg-chakra-500 text-shadow-950" : "text-ash-400 hover:bg-shadow-800 hover:text-ash-200",
            )}
          >
            {MOVERS_WINDOW_LABEL[window].short}
          </DirectoryLink>
        );
      })}
    </div>
  );
}
