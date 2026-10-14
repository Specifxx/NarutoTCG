import type { EventLocation } from "@naruto-tcg/types";

export type RegionId = "online" | "north-america" | "europe" | "oceania" | "other";

/** Regions in filter order; "other" only appears when an event needs it. */
export const REGION_ORDER: readonly RegionId[] = ["online", "north-america", "europe", "oceania", "other"];

export const REGION_LABELS: Record<RegionId, string> = {
  online: "Online",
  "north-america": "North America",
  europe: "Europe",
  oceania: "Oceania",
  other: "Other regions",
};

const COUNTRY_REGION: Record<string, RegionId> = {};

function assign(region: RegionId, keys: string[]) {
  for (const key of keys) COUNTRY_REGION[key] = region;
}

assign("north-america", [
  "us", "usa", "united states", "united states of america", "america",
  "ca", "can", "canada", "mx", "mex", "mexico", "pr", "puerto rico",
]);
assign("europe", [
  "gb", "gbr", "uk", "united kingdom", "great britain", "england", "scotland", "wales", "northern ireland",
  "ie", "irl", "ireland", "fr", "fra", "france", "de", "deu", "germany", "it", "ita", "italy",
  "es", "esp", "spain", "pt", "prt", "portugal", "nl", "nld", "netherlands", "be", "bel", "belgium",
  "lu", "luxembourg", "ch", "che", "switzerland", "at", "aut", "austria", "se", "swe", "sweden",
  "no", "nor", "norway", "dk", "dnk", "denmark", "fi", "fin", "finland", "is", "isl", "iceland",
  "pl", "pol", "poland", "cz", "cze", "czechia", "czech republic", "sk", "svk", "slovakia",
  "hu", "hun", "hungary", "ro", "rou", "romania", "bg", "bgr", "bulgaria", "gr", "grc", "greece",
  "hr", "hrv", "croatia", "si", "svn", "slovenia", "rs", "srb", "serbia", "ee", "est", "estonia",
  "lv", "lva", "latvia", "lt", "ltu", "lithuania", "ua", "ukr", "ukraine", "mt", "mlt", "malta",
  "cy", "cyp", "cyprus",
]);
assign("oceania", ["au", "aus", "australia", "nz", "nzl", "new zealand"]);

const normalize = (text: string | undefined) =>
  (text ?? "")
    .toLowerCase()
    .replace(/[^a-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Coarse region for an event, read from its country (ISO code or English name) and, when the
 * country is missing, its region field ("England"). Unrecognized places fall into "other".
 */
export function classifyRegion(location: EventLocation): RegionId {
  if (location.online) return "online";
  for (const field of [location.country, location.region]) {
    const region = COUNTRY_REGION[normalize(field)];
    if (region) return region;
  }
  return "other";
}
