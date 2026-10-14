import type { EventType } from "@naruto-tcg/types";
import { Megaphone, Package, Rocket, Tent, Trophy, type LucideIcon } from "lucide-react";
import type { MilestoneKind } from "@/lib/data/schema";
import { eventTypeMeta } from "@/lib/event-meta";

export interface MilestoneAccent {
  label: string;
  icon: LucideIcon;
  /** Static Tailwind classes (kept literal so Tailwind can detect them). */
  classes: { text: string; border: string; bg: string; dot: string };
}

export const KIND_META: Record<MilestoneKind, MilestoneAccent> = {
  convention: {
    label: "Convention",
    icon: Tent,
    classes: { text: "text-violet-300", border: "border-violet-400/40", bg: "bg-violet-500/10", dot: "bg-violet-400" },
  },
  "set-release": {
    label: "Set release",
    icon: Rocket,
    classes: { text: "text-amber-300", border: "border-amber-400/40", bg: "bg-amber-500/10", dot: "bg-amber-400" },
  },
  prerelease: {
    label: "Pre-release",
    icon: Package,
    classes: { text: "text-teal-300", border: "border-teal-400/40", bg: "bg-teal-500/10", dot: "bg-teal-400" },
  },
  championship: {
    label: "Championship",
    icon: Trophy,
    classes: { text: "text-rose-300", border: "border-rose-400/40", bg: "bg-rose-500/10", dot: "bg-rose-500" },
  },
  announcement: {
    label: "Announcement",
    icon: Megaphone,
    classes: { text: "text-fuchsia-300", border: "border-fuchsia-400/40", bg: "bg-fuchsia-500/10", dot: "bg-fuchsia-400" },
  },
};

/**
 * Badge label, icon and colours for a milestone. Milestones derived from event
 * listings use their event type's styling so they match the rest of the directory.
 */
export function milestoneAccent(milestone: { kind: MilestoneKind; eventType?: EventType }): MilestoneAccent {
  if (milestone.eventType) {
    const meta = eventTypeMeta(milestone.eventType);
    return { label: meta.shortLabel, icon: meta.icon, classes: meta.classes };
  }
  return KIND_META[milestone.kind];
}
