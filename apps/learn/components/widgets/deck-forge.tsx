"use client";

import type { WidgetProps } from "./types";
import { WidgetPlaceholder } from "./widget-shell";

export default function DeckForge({ onComplete }: WidgetProps) {
  return (
    <WidgetPlaceholder title="Deck Forge">
      <button type="button" onClick={onComplete} className="text-sm text-chakra-300 underline">
        Mark complete
      </button>
    </WidgetPlaceholder>
  );
}
