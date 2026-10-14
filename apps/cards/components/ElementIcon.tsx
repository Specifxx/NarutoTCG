import type { ChakraElement } from "@naruto-tcg/types";
import { ELEMENT_META } from "@/lib/meta";

const ICONS: Record<ChakraElement, { d: string; stroke?: boolean }> = {
  fire: { d: "M12 2.5c.9 3.2 5 5.4 5 10a5 5 0 0 1-10 0c0-2.3 1.1-4 2.6-5.3-.1 1.8.6 3.1 1.8 3.7-.3-3.2.1-5.9.6-8.4Z" },
  water: { d: "M12 2.8c2.9 4 5.5 7.2 5.5 10.7a5.5 5.5 0 0 1-11 0c0-3.5 2.6-6.7 5.5-10.7Z" },
  lightning: { d: "M13.5 2 5 13.2h5.6L9.4 22 19 9.8h-5.7L13.5 2Z" },
  earth: { d: "M2.5 19.5 9 8l3.3 5.6L15 9.5l6.5 10H2.5Z" },
  wind: { d: "M3 8h10.5A2.5 2.5 0 1 0 11 5.5M3 12h15a3 3 0 1 1-3 3M3 16h7", stroke: true },
};

/** Decorative glyph for a chakra nature; pair it with a visible or sr-only label. */
export function ElementIcon({ element, className = "h-4 w-4" }: { element: ChakraElement; className?: string }) {
  const icon = ICONS[element];
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
