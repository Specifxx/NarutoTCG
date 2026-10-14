import type { EventFormat, EventStatus, EventType, Region, StoreFeature } from "@naruto-tcg/types";
import {
  Accessibility,
  Armchair,
  BookOpen,
  CalendarDays,
  CircleParking,
  Coffee,
  Gift,
  Layers,
  Medal,
  Package,
  Rocket,
  Shuffle,
  Sparkles,
  Store,
  Swords,
  Tent,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface EventTypeMeta {
  type: EventType;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  /** Marker / chart colour. */
  hex: string;
  /** Static Tailwind classes (kept literal so Tailwind can detect them). */
  classes: { text: string; border: string; bg: string; dot: string; ring: string };
}

export const EVENT_TYPES: readonly EventTypeMeta[] = [
  {
    type: "premier-demo",
    label: "Premier Demo Event",
    shortLabel: "Premier Demo",
    description: "Official learn-to-play days with demo decks, staff guides and exclusive promos.",
    icon: Sparkles,
    hex: "#ff7a1a",
    classes: {
      text: "text-chakra-400",
      border: "border-chakra-500/40",
      bg: "bg-chakra-500/10",
      dot: "bg-chakra-500",
      ring: "ring-chakra-500/60",
    },
  },
  {
    type: "convention-showcase",
    label: "Convention Showcase",
    shortLabel: "Convention",
    description: "Bandai Card Games Fest booths and convention halls with demos, reveals and side events.",
    icon: Tent,
    hex: "#a78bfa",
    classes: {
      text: "text-violet-300",
      border: "border-violet-400/40",
      bg: "bg-violet-500/10",
      dot: "bg-violet-400",
      ring: "ring-violet-400/60",
    },
  },
  {
    type: "lgs-weekly",
    label: "LGS Weekly",
    shortLabel: "Weekly",
    description: "Casual weekly play at your local game store. Great for new players.",
    icon: Store,
    hex: "#34d399",
    classes: {
      text: "text-emerald-300",
      border: "border-emerald-400/40",
      bg: "bg-emerald-500/10",
      dot: "bg-emerald-400",
      ring: "ring-emerald-400/60",
    },
  },
  {
    type: "store-championship",
    label: "Store Championship",
    shortLabel: "Store Champ",
    description: "Competitive seasonal tournaments crowning each store's champion.",
    icon: Medal,
    hex: "#38bdf8",
    classes: {
      text: "text-sky-300",
      border: "border-sky-400/40",
      bg: "bg-sky-500/10",
      dot: "bg-sky-400",
      ring: "ring-sky-400/60",
    },
  },
  {
    type: "regional",
    label: "Regional",
    shortLabel: "Regional",
    description: "Large competitive events with championship invites and premium prizing.",
    icon: Trophy,
    hex: "#f43f5e",
    classes: {
      text: "text-rose-300",
      border: "border-rose-400/40",
      bg: "bg-rose-500/10",
      dot: "bg-rose-500",
      ring: "ring-rose-500/60",
    },
  },
];

const TYPE_INDEX = new Map(EVENT_TYPES.map((m) => [m.type, m]));

export function eventTypeMeta(type: EventType): EventTypeMeta {
  const meta = TYPE_INDEX.get(type);
  if (!meta) throw new Error(`Unknown event type "${type}"`);
  return meta;
}

export function isEventType(value: unknown): value is EventType {
  return typeof value === "string" && TYPE_INDEX.has(value as EventType);
}

export interface EventFormatMeta {
  format: EventFormat;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const EVENT_FORMATS: readonly EventFormatMeta[] = [
  {
    format: "learn-to-play",
    label: "Learn-to-Play Demo",
    description: "Guided games with pre-built demo decks. No cards or experience needed.",
    icon: BookOpen,
  },
  { format: "constructed", label: "Constructed", description: "Bring your own 50-card deck.", icon: Layers },
  { format: "sealed", label: "Sealed", description: "Build a deck from booster packs opened at the event.", icon: Package },
  { format: "booster-draft", label: "Booster Draft", description: "Draft packs around the table, then play.", icon: Shuffle },
  {
    format: "starter-deck-battle",
    label: "Starter Deck Battle",
    description: "Unmodified starter decks only — a level playing field.",
    icon: Swords,
  },
  { format: "team-battle", label: "Team Battle (3v3)", description: "Squads of three, best two of three matches.", icon: Users },
];

const FORMAT_INDEX = new Map(EVENT_FORMATS.map((m) => [m.format, m]));

export function eventFormatMeta(format: EventFormat): EventFormatMeta {
  const meta = FORMAT_INDEX.get(format);
  if (!meta) throw new Error(`Unknown event format "${format}"`);
  return meta;
}

export function isEventFormat(value: unknown): value is EventFormat {
  return typeof value === "string" && FORMAT_INDEX.has(value as EventFormat);
}

export const REGIONS: readonly { region: Region; label: string }[] = [
  { region: "north-america", label: "North America" },
  { region: "europe", label: "Europe" },
  { region: "oceania", label: "Oceania" },
  { region: "asia", label: "Asia" },
];

export function regionLabel(region: Region): string {
  return REGIONS.find((r) => r.region === region)?.label ?? region;
}

export function isRegion(value: unknown): value is Region {
  return REGIONS.some((r) => r.region === value);
}

const COUNTRY_REGION: Record<string, Region> = {
  US: "north-america",
  CA: "north-america",
  MX: "north-america",
  AU: "oceania",
  NZ: "oceania",
  JP: "asia",
  KR: "asia",
  SG: "asia",
  PH: "asia",
};

/** Region for an ISO country code; anything not listed is treated as Europe. */
export function regionForCountry(country: string): Region {
  return COUNTRY_REGION[country.toUpperCase()] ?? "europe";
}

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  scheduled: "Scheduled",
  postponed: "Postponed",
  cancelled: "Cancelled",
};

export interface StoreFeatureMeta {
  feature: StoreFeature;
  label: string;
  icon: LucideIcon;
}

export const STORE_FEATURES: readonly StoreFeatureMeta[] = [
  { feature: "demo-kits", label: "Demo kits", icon: Gift },
  { feature: "weekly-play", label: "Weekly play", icon: CalendarDays },
  { feature: "tournament-host", label: "Tournament host", icon: Trophy },
  { feature: "prerelease-host", label: "Pre-release host", icon: Rocket },
  { feature: "play-space", label: "Play space", icon: Armchair },
  { feature: "singles", label: "Singles", icon: Layers },
  { feature: "sealed-product", label: "Sealed product", icon: Package },
  { feature: "accessible", label: "Step-free access", icon: Accessibility },
  { feature: "parking", label: "Parking", icon: CircleParking },
  { feature: "food-drink", label: "Food & drink", icon: Coffee },
];

const FEATURE_INDEX = new Map(STORE_FEATURES.map((m) => [m.feature, m]));

export function storeFeatureMeta(feature: StoreFeature): StoreFeatureMeta {
  const meta = FEATURE_INDEX.get(feature);
  if (!meta) throw new Error(`Unknown store feature "${feature}"`);
  return meta;
}

export function isStoreFeature(value: unknown): value is StoreFeature {
  return typeof value === "string" && FEATURE_INDEX.has(value as StoreFeature);
}
