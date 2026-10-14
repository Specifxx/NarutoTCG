import type { ChakraElement } from "@naruto-tcg/types";
import { ELEMENT_GLYPHS, ELEMENT_META } from "@/lib/meta";

/** Decorative glyph for a chakra nature; pair it with a visible or sr-only label. */
export function ElementIcon({ element, className = "h-4 w-4" }: { element: ChakraElement; className?: string }) {
  const icon = ELEMENT_GLYPHS[element];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${ELEMENT_META[element].text} ${className}`}>
      {icon.stroke ? (
        <path d={icon.d} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      ) : (
        <path d={icon.d} fill="currentColor" />
      )}
    </svg>
  );
}
