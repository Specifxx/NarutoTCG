"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { WidgetId } from "@/content/schema";
import type { WidgetProps } from "./types";
import { WidgetSkeleton } from "./widget-shell";

const loading = () => <WidgetSkeleton />;

/**
 * Lesson widgets are client-only (they measure the DOM and use randomness),
 * so they load without SSR.
 */
const WIDGETS: Record<WidgetId, ComponentType<WidgetProps>> = {
  "deck-forge": dynamic(() => import("./deck-forge"), { ssr: false, loading }),
  "chakra-charger": dynamic(() => import("./chakra-charger"), { ssr: false, loading }),
  "hidden-card-sim": dynamic(() => import("./hidden-card-sim"), { ssr: false, loading }),
  "mission-evaluator": dynamic(() => import("./mission-evaluator"), { ssr: false, loading }),
  "edge-duel": dynamic(() => import("./edge-duel"), { ssr: false, loading }),
};

export function LessonWidget({ id, ...props }: { id: WidgetId } & WidgetProps) {
  const Widget = WIDGETS[id];
  return <Widget {...props} />;
}
