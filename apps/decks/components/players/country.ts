/** Country display helpers for player profiles. */

const REGIONAL_INDICATOR_A = 0x1f1e6;

/** Flag emoji for an ISO 3166-1 alpha-2 code ("jp" → 🇯🇵); null for anything that is not two letters. */
export function flagEmoji(code: string | undefined): string | null {
  if (!code || !/^[a-z]{2}$/i.test(code)) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map((letter) => REGIONAL_INDICATOR_A + letter.charCodeAt(0) - 65));
}

let regionNames: Intl.DisplayNames | null | undefined;

/**
 * English country name for an ISO alpha-2 code, or the code itself when unknown. ICU data can
 * differ between Node and the browser, so render it on the server or after mount, never in a
 * client component's hydration pass.
 */
export function countryName(code: string): string {
  const upper = code.toUpperCase();
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(["en-US"], { type: "region", fallback: "none" });
    } catch {
      regionNames = null;
    }
  }
  try {
    return (/^[A-Z]{2}$/.test(upper) && regionNames?.of(upper)) || upper;
  } catch {
    return upper;
  }
}
