"use client";

import type { NarutoCard } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { getCard } from "@/lib/data/cards";
import { CardFrame, UnknownCardFrame, type CardFrameSize } from "./card-frame";
import { RARITY_MARK, cardLabel, typeLine } from "./card-style";
import { FOCUS_RING } from "./styles";

/**
 * A card face whose full text opens on mouse hover, keyboard focus and tap. The text sits in a
 * disclosure over the card: Escape or a second tap dismisses it, and it is also exposed as the
 * button's description so screen readers hear it on focus.
 */
export function CardTile({
  card,
  quantity,
  size = "md",
  note,
}: {
  card: NarutoCard;
  quantity?: number;
  size?: CardFrameSize;
  /** Short caption under the card, e.g. "Turn 2 draw". */
  note?: string;
}) {
  const id = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = !dismissed && (pinned || hovered || focused);

  // A tapped-open card closes when the next tap lands elsewhere (iOS never blurs the button).
  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setPinned(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pinned]);

  const close = () => {
    setPinned(false);
    setDismissed(true);
  };

  const toggle = () => {
    if (open) return close();
    setPinned(true);
    setDismissed(false);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && open) {
      // Keep Escape from also closing an enclosing drawer.
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  const rarity = RARITY_MARK[card.rarity];
  const facts = [
    card.cost !== undefined && `Cost ${card.cost}`,
    card.power !== undefined && `Power ${card.power}`,
    rarity.label,
    card.village,
    card.id,
  ].filter(Boolean);

  return (
    <figure className="m-0 flex flex-col gap-1">
      <div
        ref={wrapperRef}
        className="relative"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          setHovered(false);
          setDismissed(false);
        }}
      >
        <button
          type="button"
          aria-label={cardLabel(card, quantity)}
          aria-describedby={`${id}-text`}
          aria-expanded={open}
          aria-controls={`${id}-text`}
          onClick={toggle}
          onFocus={(event) => setFocused(event.currentTarget.matches(":focus-visible"))}
          onBlur={() => {
            setFocused(false);
            setPinned(false);
            setDismissed(false);
          }}
          onKeyDown={onKeyDown}
          className={cx("block w-full cursor-help rounded-xl transition hover:-translate-y-0.5 motion-reduce:transform-none", FOCUS_RING)}
        >
          <CardFrame card={card} quantity={quantity} size={size} />
        </button>
        <div
          id={`${id}-text`}
          hidden={!open}
          onClick={close}
          className={cx(
            "absolute inset-x-0 top-0 z-20 min-h-full rounded-xl border border-chakra-600 bg-shadow-950/95 shadow-xl shadow-black/60",
            size === "sm" ? "p-1.5 text-[10px] leading-snug" : "p-2.5 text-xs leading-snug",
          )}
        >
          <p className="font-semibold text-white">{card.name}</p>
          <p className="mt-0.5 text-ash-400">{typeLine(card)}</p>
          <p className="mt-0.5 text-ash-500">{facts.join(" · ")}</p>
          {card.text && <p className="mt-1.5 text-ash-100">{card.text}</p>}
        </div>
      </div>
      {note && <figcaption className="truncate text-center text-[10px] font-medium text-ash-400">{note}</figcaption>}
    </figure>
  );
}

/** Tile for a card id, falling back to a placeholder for ids missing from the card pool. */
export function CardIdTile({ cardId, quantity, size, note }: { cardId: string; quantity?: number; size?: CardFrameSize; note?: string }) {
  const card = getCard(cardId);
  if (card) return <CardTile card={card} quantity={quantity} size={size} note={note} />;
  return (
    <figure className="m-0 flex flex-col gap-1">
      <div role="img" aria-label={`Unknown card ${cardId}${quantity !== undefined ? `, ${quantity} copies` : ""}`}>
        <UnknownCardFrame cardId={cardId} quantity={quantity} size={size} />
      </div>
      {note && <figcaption className="truncate text-center text-[10px] font-medium text-ash-400">{note}</figcaption>}
    </figure>
  );
}
