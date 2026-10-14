import { addDaysToKey } from "@/lib/time";
import { addMonths, firstDayOfMonth, lastDayOfMonth, monthKeyOf, weekdayOf } from "./date-keys";

export type DatePresetId = "any" | "weekend" | "next-7" | "next-30" | "this-month" | "next-month";

export interface DateRange {
  from: string | null;
  to: string | null;
}

export const DATE_PRESETS: readonly { id: DatePresetId; label: string; hint?: string }[] = [
  { id: "any", label: "Any time" },
  { id: "weekend", label: "This weekend", hint: "Friday to Sunday" },
  { id: "next-7", label: "Next 7 days" },
  { id: "next-30", label: "Next 30 days" },
  { id: "this-month", label: "This month" },
  { id: "next-month", label: "Next month" },
];

/**
 * Inclusive venue-local range for a preset, relative to the viewer's local
 * `today` ("YYYY-MM-DD"). "This weekend" is Friday–Sunday so Friday-night
 * league play is included; from Friday onwards it starts today.
 */
export function presetRange(id: DatePresetId, today: string): DateRange {
  switch (id) {
    case "any":
      return { from: null, to: null };
    case "weekend": {
      const dow = weekdayOf(today);
      if (dow === 0) return { from: today, to: today };
      const toFriday = dow >= 5 ? 0 : 5 - dow;
      return { from: addDaysToKey(today, toFriday), to: addDaysToKey(today, 7 - dow) };
    }
    case "next-7":
      return { from: today, to: addDaysToKey(today, 6) };
    case "next-30":
      return { from: today, to: addDaysToKey(today, 29) };
    case "this-month": {
      const month = monthKeyOf(today);
      return { from: firstDayOfMonth(month), to: lastDayOfMonth(month) };
    }
    case "next-month": {
      const month = addMonths(monthKeyOf(today), 1);
      return { from: firstDayOfMonth(month), to: lastDayOfMonth(month) };
    }
  }
}

/** The preset matching a range for the given `today`, or null for a custom range. */
export function matchPreset(range: DateRange, today: string): DatePresetId | null {
  for (const { id } of DATE_PRESETS) {
    const r = presetRange(id, today);
    if (r.from === range.from && r.to === range.to) return id;
  }
  return null;
}
