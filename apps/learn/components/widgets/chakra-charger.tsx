"use client";

import type { WidgetProps } from "./types";
import { WidgetPlaceholder } from "./widget-shell";

export default function ChakraCharger({ onComplete }: WidgetProps) {
  return (
    <WidgetPlaceholder title="Chakra Charger">
      <button type="button" onClick={onComplete} className="text-sm text-chakra-300 underline">
        Mark complete
      </button>
    </WidgetPlaceholder>
  );
}
