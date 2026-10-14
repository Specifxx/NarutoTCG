// How the rules text uses each [Keyword] it mentions: an effect can grant a
// keyword ("gains [Rush]") or merely refer to one ("can't activate [Blocker]",
// "characters with [Blocker]"). The glossary labels the two differently.
import type { EffectToken } from "./effect-text";

export interface EffectKeyword {
  readonly label: string;
  /** True when some mention follows "gain"/"gains" in the same sentence. */
  readonly granted: boolean;
}

/** "gain"/"gains" (not "can't gain") with no sentence break before the end of the text. */
const GRANTS = /(?<!\b(?:can['’]t|cannot|not)\s+)\bgains?\b[^.]*$/i;

/**
 * Keywords mentioned in the parsed text, in first-seen order and without
 * duplicates, each marked granted or only referenced. A timing tag such as
 * "[When Attacking]" starts a new sentence, like a full stop.
 */
export function effectKeywords(paragraphs: readonly (readonly EffectToken[])[]): EffectKeyword[] {
  const granted = new Map<string, boolean>();
  for (const tokens of paragraphs) {
    let sentence = "";
    for (const token of tokens) {
      switch (token.kind) {
        case "text":
          sentence += token.text;
          break;
        case "tag":
          sentence = "";
          break;
        case "keyword":
          granted.set(token.label, granted.get(token.label) === true || GRANTS.test(sentence));
          sentence += token.label;
          break;
        case "trait":
          sentence += token.label;
          break;
        case "card":
          sentence += token.name;
          break;
      }
    }
  }
  return [...granted].map(([label, isGranted]) => ({ label, granted: isGranted }));
}
