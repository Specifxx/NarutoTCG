import type { Decklist } from "@naruto-tcg/types";
import { ARCHETYPES, ROGUE_ID, type Archetype } from "@/lib/data/archetypes";
import { CARD_INDEX } from "@/lib/data/cards";
import { resolveCard } from "./cards";
import { normalizeName, similarity, similarityBound } from "./text";

export type ArchetypeMatchMethod = "id" | "name" | "alias" | "fuzzy" | "unknown";

export interface ArchetypeLabelResolution {
  /** {@link ROGUE_ID} when the label is unknown. */
  archetypeId: string;
  method: ArchetypeMatchMethod;
  /** 0..1; 0 for unknown labels. */
  confidence: number;
}

export interface ArchetypeClassification {
  /** {@link ROGUE_ID} when no archetype scores at least {@link CLASSIFY_THRESHOLD}. */
  archetypeId: string;
  /** 0..1: the winning score, or for rogue, 1 minus the best score. */
  confidence: number;
  /** Score per tracked archetype (rogue excluded), 0..1. */
  scores: Record<string, number>;
}

/** Weight of playing one of the archetype's Leaders. */
const LEADER_WEIGHT = 0.5;
/** Weight of the signature-card share. */
const SIGNATURE_WEIGHT = 0.5;
/** Signature share at which the signature signal saturates: 20 of the 50 main-deck cards. */
const SIGNATURE_SATURATION = 0.4;
/** Lowest score that names an archetype: a matching Leader alone, or ~14 signature cards alone. */
export const CLASSIFY_THRESHOLD = 0.35;
const FUZZY_LABEL_THRESHOLD = 0.8;
/** Longest deck label read; the longest archetype name or alias is far shorter. */
export const MAX_LABEL_LENGTH = 200;

const TRACKED = ARCHETYPES.filter((a) => a.id !== ROGUE_ID);

/** Normalized labels per archetype, in {@link ARCHETYPES} order. */
const LABELS: ReadonlyArray<{ archetype: Archetype; id: string; names: string[]; aliases: string[] }> = ARCHETYPES.map(
  (archetype) => ({
    archetype,
    id: normalizeName(archetype.id),
    names: [archetype.name, archetype.shortName].map(normalizeName),
    aliases: archetype.aliases.map(normalizeName),
  }),
);

/**
 * Maps a reported deck name ("Pain", "Sage Naruto", "uchiha-avenger", "Tsunade — Fifth Hokage")
 * to an archetype id: by id, name or short name, alias, the Leader it names, a known alias
 * inside a longer label ("Lightning Sasuke Tempo"), then typo-tolerant matching. Labels longer
 * than {@link MAX_LABEL_LENGTH} are unknown.
 */
export function resolveArchetypeLabel(label: string): ArchetypeLabelResolution {
  const unknown: ArchetypeLabelResolution = { archetypeId: ROGUE_ID, method: "unknown", confidence: 0 };
  if (label.trim().length > MAX_LABEL_LENGTH) return unknown;
  const raw = label.trim().toLowerCase();
  const query = normalizeName(label);
  if (!query) return unknown;

  const byId = LABELS.find((l) => l.archetype.id === raw || l.id === query);
  if (byId) return { archetypeId: byId.archetype.id, method: "id", confidence: 1 };
  const byName = LABELS.find((l) => l.names.includes(query));
  if (byName) return { archetypeId: byName.archetype.id, method: "name", confidence: 1 };
  const byAlias = LABELS.find((l) => l.aliases.includes(query));
  if (byAlias) return { archetypeId: byAlias.archetype.id, method: "alias", confidence: 0.95 };

  // Only an exact Leader name counts, so typo matching (the costly part) is skipped.
  const leader = resolveCard(label, { preferType: "leader", fuzzy: false });
  if (leader.cardId && leader.method !== "fuzzy" && CARD_INDEX.get(leader.cardId)?.type === "leader") {
    const owner = ARCHETYPES.find((a) => a.leaderIds.includes(leader.cardId!));
    if (owner) return { archetypeId: owner.id, method: "alias", confidence: 0.9 };
  }

  // Longest known name or alias appearing as whole words inside the label; ties between archetypes are ambiguous.
  const padded = ` ${query} `;
  let contained: { id: string; length: number; tied: boolean } | null = null;
  for (const { archetype, names, aliases } of LABELS) {
    for (const phrase of [...names, ...aliases]) {
      if (!padded.includes(` ${phrase} `)) continue;
      if (!contained || phrase.length > contained.length) contained = { id: archetype.id, length: phrase.length, tied: false };
      else if (phrase.length === contained.length && contained.id !== archetype.id) contained.tied = true;
    }
  }
  if (contained && !contained.tied) return { archetypeId: contained.id, method: "fuzzy", confidence: 0.8 };

  let best: { id: string; score: number } | null = null;
  for (const { archetype, id, names, aliases } of LABELS) {
    for (const phrase of [id, ...names, ...aliases]) {
      // Only a score that reaches the threshold and beats the best so far matters.
      const needed = Math.max(FUZZY_LABEL_THRESHOLD, best?.score ?? 0);
      if (similarityBound(query.length, phrase.length) < needed) continue;
      const score = similarity(query, phrase, needed);
      if (score >= FUZZY_LABEL_THRESHOLD && (!best || score > best.score)) best = { id: archetype.id, score };
    }
  }
  if (best && best.score >= FUZZY_LABEL_THRESHOLD) {
    return { archetypeId: best.id, method: "fuzzy", confidence: Math.round(best.score * 0.9 * 100) / 100 };
  }
  return unknown;
}

/**
 * Classifies a list by its Leader and its signature cards. Each tracked archetype scores
 * 0.5 for a matching Leader plus 0.5 × the share of main-deck cards that are its signature
 * cards (saturating at 40%). The best score wins if it reaches {@link CLASSIFY_THRESHOLD};
 * otherwise the list is rogue.
 */
export function classifyDecklist(decklist: Decklist): ArchetypeClassification {
  const total = decklist.cards.reduce((sum, entry) => sum + entry.quantity, 0);
  const scores: Record<string, number> = {};
  let best: { id: string; score: number; share: number } | null = null;
  for (const archetype of TRACKED) {
    const signature = new Set(archetype.signatureCardIds);
    const count = decklist.cards.reduce((sum, entry) => sum + (signature.has(entry.cardId) ? entry.quantity : 0), 0);
    const share = total === 0 ? 0 : count / total;
    const leader = archetype.leaderIds.includes(decklist.leaderId) ? LEADER_WEIGHT : 0;
    const score = Math.round((leader + SIGNATURE_WEIGHT * Math.min(1, share / SIGNATURE_SATURATION)) * 1000) / 1000;
    scores[archetype.id] = score;
    if (!best || score > best.score || (score === best.score && share > best.share)) best = { id: archetype.id, score, share };
  }
  if (!best || best.score < CLASSIFY_THRESHOLD) {
    return { archetypeId: ROGUE_ID, confidence: Math.round((1 - (best?.score ?? 0)) * 1000) / 1000, scores };
  }
  return { archetypeId: best.id, confidence: best.score, scores };
}
