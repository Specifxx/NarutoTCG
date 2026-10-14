"use client";

import type { CardPrinting, NarutoCard } from "@naruto-tcg/types";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { CardImage } from "@/components/CardImage";
import {
  ELEMENT_META,
  RARITY_META,
  TYPE_META,
  VARIANT_LABEL,
  cardImageSrc,
  primaryPrinting,
  type FoilKind,
} from "@/lib/meta";
import styles from "./FoilCard.module.css";

export interface HeroPrinting {
  printing: CardPrinting;
  /** Short name of the printing's set, e.g. "Starter Deck 01". */
  setName: string;
}

/** Maximum tilt in degrees at the card's edges. */
const MAX_TILT = 14;

const FOIL_LABEL: Record<FoilKind, string> = {
  none: "Non-foil",
  glare: "Gloss foil",
  holo: "Holo foil",
  gold: "Gold foil",
};

const POINTER_VARS = ["--rx", "--ry", "--mx", "--my", "--bgx", "--bgy"] as const;

type CustomProperties = CSSProperties & Record<`--${string}`, string>;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Short, unique button label per printing: set code + rarity code, plus the variant when needed to disambiguate. */
function optionLabels(options: readonly HeroPrinting[]): string[] {
  const base = options.map(({ printing }) => `${printing.setId} · ${RARITY_META[printing.rarity].code}`);
  return base.map((label, i) => {
    const option = options[i];
    const duplicated = base.indexOf(label) !== base.lastIndexOf(label);
    return duplicated && option ? `${label} · ${VARIANT_LABEL[option.printing.variant]}` : label;
  });
}

/**
 * High-definition card preview with a pointer-driven 3D tilt and a foil
 * shimmer matched to the printing's rarity. Pointer moves are coalesced to one
 * style write per animation frame and only touch CSS custom properties, so
 * React never re-renders while the card is being tilted.
 */
export function FoilCard({ card, options }: { card: NarutoCard; options: readonly HeroPrinting[] }) {
  const [selected, setSelected] = useState(0);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const motionQueryRef = useRef<MediaQueryList | null>(null);
  const hintId = useId();
  const captionId = useId();

  const current = options[selected] ?? options[0];
  const printing = current?.printing ?? primaryPrinting(card);
  const foil = RARITY_META[printing.rarity].foil;
  const src = cardImageSrc(card, printing);
  const failed = failedSrc === src;
  const labels = optionLabels(options);
  const element = ELEMENT_META[card.element];

  const paint = useCallback(() => {
    frameRef.current = 0;
    const scene = sceneRef.current;
    const el = cardRef.current;
    const point = pointerRef.current;
    if (!scene || !el || !point) return;
    // Measure the untransformed scene so the tilt itself never skews the math.
    const rect = scene.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const px = clamp01((point.x - rect.left) / rect.width);
    const py = clamp01((point.y - rect.top) / rect.height);
    const style = el.style;
    style.setProperty("--rx", `${((0.5 - py) * 2 * MAX_TILT).toFixed(2)}deg`);
    style.setProperty("--ry", `${((px - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
    style.setProperty("--mx", `${(px * 100).toFixed(2)}%`);
    style.setProperty("--my", `${(py * 100).toFixed(2)}%`);
    style.setProperty("--bgx", `${(37 + px * 26).toFixed(2)}%`);
    style.setProperty("--bgy", `${(33 + py * 34).toFixed(2)}%`);
  }, []);

  const track = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const el = cardRef.current;
      if (!el) return;
      el.dataset.active = "";
      // Reduced motion: brighten the static sheen but never tilt or chase the pointer.
      motionQueryRef.current ??= window.matchMedia("(prefers-reduced-motion: reduce)");
      if (motionQueryRef.current.matches) return;
      pointerRef.current = { x: event.clientX, y: event.clientY };
      if (frameRef.current === 0) frameRef.current = requestAnimationFrame(paint);
    },
    [paint],
  );

  const release = useCallback(() => {
    if (frameRef.current !== 0) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    pointerRef.current = null;
    const el = cardRef.current;
    if (!el) return;
    delete el.dataset.active;
    // Dropping the inline values lets the CSS transition spring the card back to rest.
    for (const name of POINTER_VARS) el.style.removeProperty(name);
  }, []);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  // Swap to a generated frame when artwork fails to load. Checking `complete`
  // also catches errors that fired before hydration attached any listener.
  useEffect(() => {
    const img = cardRef.current?.querySelector("img");
    if (!img) return;
    const markFailed = () => setFailedSrc(src);
    if (img.complete && img.naturalWidth === 0) markFailed();
    img.addEventListener("error", markFailed);
    return () => img.removeEventListener("error", markFailed);
  }, [src]);

  const sceneStyle: CustomProperties = { "--glow": element.hex };

  return (
    <div className="mx-auto w-full max-w-[17.5rem] sm:max-w-[20rem] lg:max-w-none">
      <figure>
        <div ref={sceneRef} className={styles.scene} style={sceneStyle}>
          <div aria-hidden="true" className={styles.backdrop} />
          <div
            ref={cardRef}
            className={styles.card}
            data-foil={foil}
            data-failed={failed ? "true" : undefined}
            tabIndex={0}
            role="group"
            aria-roledescription="foil card preview"
            aria-label={`${card.name}${card.title ? `, ${card.title}` : ""}`}
            aria-describedby={`${captionId} ${hintId}`}
            onPointerEnter={track}
            onPointerDown={track}
            onPointerMove={track}
            onPointerLeave={release}
            onPointerCancel={release}
          >
            <div aria-hidden="true" className={styles.fallback}>
              <div className="min-w-0">
                <p className="truncate text-[0.95em] font-bold leading-tight text-white">{card.name}</p>
                {card.title && <p className="truncate text-[0.7em] text-ash-400">{card.title}</p>}
              </div>
              <span className={`${styles.fallbackKanji} ${element.text}`}>{element.kanji}</span>
              <div className="flex items-end justify-between gap-2 text-[0.7em] uppercase tracking-widest text-ash-400">
                <span>{TYPE_META[card.type].label}</span>
                <span className="font-mono normal-case tracking-normal">{printing.number}</span>
              </div>
            </div>
            <CardImage key={src} card={card} printing={printing} priority />
            <span aria-hidden="true" className={`${styles.layer} ${styles.holo}`} />
            <span aria-hidden="true" className={`${styles.layer} ${styles.gold}`} />
            <span aria-hidden="true" className={`${styles.layer} ${styles.sparkle}`} />
            <span aria-hidden="true" className={`${styles.layer} ${styles.sheen}`} />
            <span aria-hidden="true" className={`${styles.layer} ${styles.glare}`} />
            <span aria-hidden="true" className={`${styles.layer} ${styles.edge}`} />
          </div>
        </div>

        <figcaption className="mt-5 text-center">
          <p id={captionId} aria-live="polite" className="text-sm text-ash-200">
            <span className="font-mono text-white">{printing.number}</span>
            <span aria-hidden="true" className="px-1.5 text-shadow-500">
              ·
            </span>
            {RARITY_META[printing.rarity].label}
            <span aria-hidden="true" className="px-1.5 text-shadow-500">
              ·
            </span>
            {VARIANT_LABEL[printing.variant]}
            <span className="block text-xs text-ash-400">
              {current?.setName ?? printing.setId} · {FOIL_LABEL[foil]}
            </span>
          </p>
          <p id={hintId} className="mt-1 text-xs text-ash-400">
            Hover, drag or focus the card to catch the light.
          </p>
        </figcaption>
      </figure>

      {options.length > 1 && (
        <div role="group" aria-label="Choose a printing" className="mt-4 flex flex-wrap justify-center gap-2">
          {options.map((option, i) => {
            const pressed = i === selected;
            const rarity = RARITY_META[option.printing.rarity];
            return (
              <button
                key={`${option.printing.setId}:${option.printing.number}:${option.printing.variant}`}
                type="button"
                aria-pressed={pressed}
                onClick={() => setSelected(i)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-950 ${
                  pressed
                    ? "border-chakra-500 bg-chakra-500/15 text-white shadow-[0_0_18px_-6px] shadow-chakra-500"
                    : "border-shadow-500 bg-shadow-900 text-ash-400 hover:border-ash-400 hover:text-ash-200"
                }`}
              >
                {labels[i]}
                <span className="sr-only">
                  , {option.setName} {option.printing.number}, {rarity.label}, {VARIANT_LABEL[option.printing.variant]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
