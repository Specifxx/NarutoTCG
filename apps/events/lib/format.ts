import type { Money, PostalAddress } from "@naruto-tcg/types";
import { normalizeSpaces } from "./time";

const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney({ amount, currency }: Money): string {
  if (amount === 0) return "Free";
  const whole = Number.isInteger(amount);
  const key = `${currency}|${whole}`;
  let f = currencyFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    });
    currencyFormatters.set(key, f);
  }
  return normalizeSpaces(f.format(amount));
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string): string {
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Regional-indicator flag emoji for an ISO 3166-1 alpha-2 code ("AU" → 🇦🇺). */
export function flagEmoji(code: string): string {
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** "Los Angeles, CA" / "Manchester, United Kingdom" style short place label. */
export function placeLabel(address: PostalAddress, withCountry = true): string {
  const parts = [address.city];
  if (address.region && address.country === "US") parts.push(address.region);
  if (withCountry) parts.push(address.country === "US" ? "USA" : countryName(address.country));
  return parts.join(", ");
}

/** Multi-line postal address. */
export function addressLines(address: PostalAddress): string[] {
  const cityLine = [address.postalCode && address.country !== "US" ? address.postalCode : null, address.city]
    .filter(Boolean)
    .join(" ");
  const regionLine =
    address.country === "US" || address.country === "CA" || address.country === "AU"
      ? [address.city, [address.region, address.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ")
      : [cityLine, address.region].filter(Boolean).join(", ");
  return [address.line1, address.line2, regionLine, countryName(address.country)].filter(
    (line): line is string => !!line && line.length > 0,
  );
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
