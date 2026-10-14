import type { EventType } from "@naruto-tcg/types";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  "premier-demo": "Premier Demo Event",
  "convention-showcase": "Convention Showcase",
  "lgs-weekly": "LGS Weekly",
  "store-championship": "Store Championship",
  regional: "Regional",
};

export const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  "premier-demo": "#ff7a1a",
  "convention-showcase": "#c0182d",
  "lgs-weekly": "#4aa3ff",
  "store-championship": "#b78cff",
  regional: "#3ecf8e",
};

export function formatDate(iso: string, timeZone = "UTC"): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

export function formatFee(fee: number, currency: string): string {
  if (fee === 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(fee);
}
