import type { CardType, ChakraElement, Rarity } from "@naruto-tcg/types";
import { ELEMENT_META, RARITY_META, TYPE_META } from "@/lib/meta";
import { ElementIcon } from "./ElementIcon";

const PILL = "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold";

export function ElementBadge({ element, className = "" }: { element: ChakraElement; className?: string }) {
  const meta = ELEMENT_META[element];
  return (
    <span className={`${PILL} ${meta.badge} ${className}`}>
      <ElementIcon element={element} className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

/** `compact` shows the printed code (e.g. "SEC") with the full name as a tooltip. */
export function RarityBadge({ rarity, compact = false, className = "" }: { rarity: Rarity; compact?: boolean; className?: string }) {
  const meta = RARITY_META[rarity];
  return (
    <span className={`${PILL} ${meta.badge} ${className}`} title={compact ? meta.label : undefined}>
      {compact ? (
        <>
          <span aria-hidden="true">{meta.code}</span>
          <span className="sr-only">{meta.label}</span>
        </>
      ) : (
        meta.label
      )}
    </span>
  );
}

export function TypeBadge({ type, className = "" }: { type: CardType; className?: string }) {
  return (
    <span className={`${PILL} border-shadow-500 bg-shadow-800 uppercase tracking-wider text-ash-200 ${className}`}>
      {TYPE_META[type].label}
    </span>
  );
}
