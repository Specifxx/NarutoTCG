"use client";

import type { Accent, StepVisual as StepVisualSpec } from "@/content/schema";

/** Animated illustration for a lesson step. (Placeholder: replaced by the visuals owner.) */
export function StepVisual({ visual }: { visual: StepVisualSpec; accent: Accent }) {
  return (
    <div className="panel flex aspect-[4/3] items-center justify-center text-sm text-ash-400">{visual.kind}</div>
  );
}
