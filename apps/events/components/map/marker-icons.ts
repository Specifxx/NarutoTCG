import type { EventType } from "@naruto-tcg/types";
import { DivIcon } from "leaflet";
import { eventTypeMeta } from "@/lib/event-meta";

export type MarkerState = "idle" | "hover" | "selected";

/*
 * Every venue icon shares one box so the anchor and popup offset stay put when
 * a pin grows on hover/selection: the pin is drawn at the bottom-centre of the
 * box and scaled with CSS (see leaflet-theme.css). Only the pin itself takes
 * pointer events, so the transparent padding never steals clicks from
 * neighbouring markers.
 *
 * Hover/selection is NOT baked into the icon: `setIcon()` rewrites the icon's
 * innerHTML, and doing that on mouseover detaches the node under the pointer
 * mid-click, so fast clicks and taps were lost. The state is a class on the
 * persistent marker element instead (see `applyMarkerState`).
 */
const BOX: [number, number] = [44, 54];
const ANCHOR: [number, number] = [22, 52];
const POPUP_ANCHOR: [number, number] = [0, -48];

const PIN_PATH = "M14 35.2C14 35.2 2.2 22.6 2.2 13.6a11.8 11.8 0 0 1 23.6 0C25.8 22.6 14 35.2 14 35.2Z";

const cache = new Map<string, DivIcon>();

function countLabel(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/** Memoised HTML pin for a venue, coloured by its primary event type. */
export function venueIcon(type: EventType, count: number): DivIcon {
  const cacheKey = `${type}|${count}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { hex } = eventTypeMeta(type);
  // Only trusted values (type colour, a number) are interpolated into the markup.
  const html = `
    <span class="ntcg-pin" style="--pin:${hex}">
      <span class="ntcg-pin__pulse" aria-hidden="true"></span>
      <svg class="ntcg-pin__shape" viewBox="0 0 28 36" width="28" height="36" aria-hidden="true" focusable="false">
        <path d="${PIN_PATH}" />
        <circle class="ntcg-pin__core" cx="14" cy="13.6" r="5.4" />
        <circle class="ntcg-pin__dot" cx="14" cy="13.6" r="2.1" />
      </svg>
      ${count > 1 ? `<span class="ntcg-pin__count" aria-hidden="true">${countLabel(count)}</span>` : ""}
    </span>`;

  const icon = new DivIcon({
    html,
    className: "ntcg-marker",
    iconSize: BOX,
    iconAnchor: ANCHOR,
    popupAnchor: POPUP_ANCHOR,
    tooltipAnchor: [0, -44],
  });
  cache.set(cacheKey, icon);
  return icon;
}

/** Reflect hover/selection on a marker's element (re-apply after every `setIcon`, which resets classes). */
export function applyMarkerState(element: HTMLElement, state: MarkerState): void {
  element.classList.toggle("ntcg-marker--hover", state === "hover");
  element.classList.toggle("ntcg-marker--selected", state === "selected");
}

let originIconInstance: DivIcon | null = null;

/** Chakra-orange crosshair for the location-filter origin. */
export function originIcon(): DivIcon {
  originIconInstance ??= new DivIcon({
    html: `
      <span class="ntcg-origin__ring" aria-hidden="true"></span>
      <svg class="ntcg-origin__mark" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false">
        <circle cx="16" cy="16" r="9" />
        <path d="M16 2v7M16 23v7M2 16h7M23 16h7" />
        <circle class="ntcg-origin__centre" cx="16" cy="16" r="2.6" />
      </svg>`,
    className: "ntcg-origin",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    tooltipAnchor: [0, -16],
  });
  return originIconInstance;
}
