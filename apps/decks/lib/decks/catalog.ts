import type { Decklist, EventTier, Rarity, Tournament, TournamentPlayer } from "@naruto-tcg/types";
import { ARCHETYPE_INDEX, ROGUE_ID } from "@/lib/data/archetypes";
import { CARD_INDEX } from "@/lib/data/cards";
import { tournamentDeckId, type DeckDetail, type DeckSummary } from "@/lib/decks/types";
import { EVENT_TIER_LABEL, EVENT_TIER_ORDER } from "@/lib/format";
import { hashSeed } from "@/lib/random";
import { computeRecords, placementLabel, type PlayerRecord } from "@/lib/tournament/standings";

/**
 * The deck directory: tournament lists derived from event records plus community lists,
 * and the search/filter/sort used by /decks. Pure functions, safe on server and client.
 * This module must not import the community deck data (lib/data/community-decks.ts): client
 * components import it, and the write-ups would ship to the browser. The server passes them in.
 */

const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  promo: 2,
  "super-rare": 3,
  "secret-rare": 4,
};

/** Seed upvotes for a winning list at each event tier, before placement and jitter. */
const VOTE_BASE: Record<EventTier, number> = {
  "national-championship": 160,
  "regional-championship": 90,
  "online-open": 60,
  "store-championship": 18,
};

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The Leader followed by the unique main-deck card ids, in list order. */
export function deckCardIds(decklist: Decklist): string[] {
  return [...new Set([decklist.leaderId, ...decklist.cards.map((entry) => entry.cardId)])];
}

/**
 * Up to `limit` highlight cards: the archetype's signature cards first, then the rarest,
 * most-played and most expensive cards. Unknown card ids are skipped.
 */
export function pickKeyCardIds(decklist: Decklist, archetypeId: string, limit = 3): string[] {
  const signature = new Set(ARCHETYPE_INDEX.get(archetypeId)?.signatureCardIds ?? []);
  const copies = new Map<string, number>();
  for (const { cardId, quantity } of decklist.cards) {
    if (CARD_INDEX.has(cardId)) copies.set(cardId, (copies.get(cardId) ?? 0) + quantity);
  }
  const rank = (id: string) => {
    const card = CARD_INDEX.get(id)!;
    return [signature.has(id) ? 1 : 0, RARITY_RANK[card.rarity], copies.get(id)!, card.cost ?? 0];
  };
  return [...copies.keys()]
    .sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return rb[i]! - ra[i]!;
      return compareStrings(a, b);
    })
    .slice(0, limit);
}

/** Event win rate: byes and intentional draws are not games; draws count half. */
function eventWinRate(record: PlayerRecord): number | undefined {
  const wins = record.wins - record.byes;
  const draws = record.draws - record.intentionalDraws;
  const games = wins + record.losses + draws;
  return games === 0 ? undefined : (wins + draws / 2) / games;
}

function placementFactor(placement: number): number {
  if (placement === 1) return 1;
  if (placement === 2) return 0.72;
  if (placement <= 4) return 0.5;
  if (placement <= 8) return 0.34;
  if (placement <= 16) return 0.24;
  return 0.12;
}

/** Deterministic seed upvotes: event prestige times finish, scaled by a 0.95–1.35 jitter keyed on the deck id. */
function seedVotes(deckId: string, tier: EventTier, placement: number): number {
  const jitter = 0.95 + ((hashSeed(deckId) % 1000) / 1000) * 0.4;
  return Math.max(1, Math.round(VOTE_BASE[tier] * placementFactor(placement) * jitter));
}

function tournamentDeckName(archetypeId: string, leaderId: string): string {
  const archetype = ARCHETYPE_INDEX.get(archetypeId);
  if (archetype && archetype.id !== ROGUE_ID) return archetype.name;
  const leader = CARD_INDEX.get(leaderId)?.name.split(" — ")[0];
  return leader ? `${leader} Rogue` : "Rogue / Other";
}

function tournamentDeck(tournament: Tournament, player: TournamentPlayer, decklist: Decklist, record?: PlayerRecord): DeckDetail {
  const id = tournamentDeckId(tournament.id, player.id);
  const tags = [placementLabel(player.placement, tournament.topCutSize), EVENT_TIER_LABEL[tournament.tier]];
  if (player.placement === 1) tags.push("Tournament ready");
  return {
    id,
    name: tournamentDeckName(player.archetypeId, decklist.leaderId),
    archetypeId: player.archetypeId,
    leaderId: decklist.leaderId,
    source: "tournament",
    author: { handle: player.id, name: player.name, country: player.country },
    createdAt: tournament.date,
    tournament: {
      id: tournament.id,
      name: tournament.name,
      tier: tournament.tier,
      date: tournament.date,
      placement: player.placement,
      playerCount: tournament.players.length,
      topCutSize: tournament.topCutSize,
    },
    record: record && { wins: record.wins, losses: record.losses, draws: record.draws },
    winRate: record && eventWinRate(record),
    winRateSource: "event",
    votes: seedVotes(id, tournament.tier, player.placement),
    keyCardIds: pickKeyCardIds(decklist, player.archetypeId),
    cardIds: deckCardIds(decklist),
    tags,
    decklist,
  };
}

/** One deck per player with a published decklist, events in the given order, best finish first. */
export function buildTournamentDecks(tournaments: readonly Tournament[]): DeckDetail[] {
  const decks: DeckDetail[] = [];
  for (const tournament of tournaments) {
    const records = computeRecords(tournament.matches);
    const players = tournament.players.slice().sort((a, b) => a.placement - b.placement);
    for (const player of players) {
      if (player.decklist) decks.push(tournamentDeck(tournament, player, player.decklist, records.get(player.id)));
    }
  }
  return decks;
}

/** Newest first; same-day decks by placement (community decks last), then id. */
function compareNewest(a: DeckSummary, b: DeckSummary): number {
  const placement = (deck: DeckSummary) => deck.tournament?.placement ?? Number.MAX_SAFE_INTEGER;
  return compareStrings(b.createdAt, a.createdAt) || placement(a) - placement(b) || compareStrings(a.id, b.id);
}

/** Tournament and community decks together, newest first. The server passes COMMUNITY_DECKS (see lib/decks/repository.ts). */
export function buildDeckCatalog(tournaments: readonly Tournament[], community: readonly DeckDetail[]): DeckDetail[] {
  return [...buildTournamentDecks(tournaments), ...community].sort(compareNewest);
}

/** The directory row for a deck: everything but the list and the write-up. */
export function toSummary(detail: DeckDetail): DeckSummary {
  const { decklist, description, matchupNotes, ...summary } = detail;
  return summary;
}

export type DeckSource = "all" | "tournament" | "community";
export type PlacementFilter = "any" | "winner" | "top4" | "top8" | "top16";
export type DeckSort = "newest" | "votes" | "winrate" | "placement";

export interface DeckQuery {
  /** Whitespace-separated terms; every term must prefix a word. Case and accent insensitive. */
  text?: string;
  archetypeIds?: string[];
  source?: DeckSource;
  /** Event tiers; community decks never match a tier filter. */
  tiers?: EventTier[];
  /** Best finish; anything but "any" matches tournament decks only. */
  placement?: PlacementFilter;
  /** The deck must contain every one of these cards (Leader included). */
  cardIds?: string[];
  /** Author or pilot handle. */
  author?: string;
  sort?: DeckSort;
  /**
   * This browser's deck votes (+1 / -1 by deck id). The "votes" sort ranks by seed votes plus
   * these, the count every deck card shows; rows themselves keep their seed count.
   */
  localVotes?: Readonly<Record<string, number>>;
}

export const PLACEMENT_FILTER_LABELS: Record<PlacementFilter, string> = {
  any: "Any finish",
  winner: "Winner",
  top4: "Top 4",
  top8: "Top 8",
  top16: "Top 16",
};

export const DECK_SORT_LABELS: Record<DeckSort, string> = {
  newest: "Newest",
  votes: "Most upvoted",
  winrate: "Win rate",
  placement: "Best finish",
};

const PLACEMENT_LIMIT: Record<PlacementFilter, number> = {
  any: Number.POSITIVE_INFINITY,
  winner: 1,
  top4: 4,
  top8: 8,
  top16: 16,
};

/** Lowercase, accent-free, punctuation-free form used for search matching. */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const haystacks = new WeakMap<DeckSummary, string>();

function haystack(deck: DeckSummary): string {
  let text = haystacks.get(deck);
  if (text === undefined) {
    const archetype = ARCHETYPE_INDEX.get(deck.archetypeId);
    const fields = [
      deck.name,
      archetype?.name,
      archetype?.shortName,
      ...(archetype?.aliases ?? []),
      deck.author.name,
      deck.author.handle,
      deck.tournament?.name,
      ...deck.tags,
      ...deck.keyCardIds.map((id) => CARD_INDEX.get(id)?.name),
    ];
    text = ` ${normalizeSearchText(fields.filter(Boolean).join(" "))}`;
    haystacks.set(deck, text);
  }
  return text;
}

const tierRank = (tier: EventTier) => EVENT_TIER_ORDER.indexOf(tier);

function comparePlacement(a: DeckSummary, b: DeckSummary): number {
  if (a.tournament && b.tournament) {
    return a.tournament.placement - b.tournament.placement || tierRank(a.tournament.tier) - tierRank(b.tournament.tier);
  }
  return a.tournament ? -1 : b.tournament ? 1 : 0;
}

type Compare = (a: DeckSummary, b: DeckSummary) => number;

/** Most upvoted first, counting this browser's vote on top of the seed count. */
function compareVotes(localVotes: Readonly<Record<string, number>> = {}): Compare {
  const votesOf = (deck: DeckSummary) => deck.votes + (Object.hasOwn(localVotes, deck.id) ? (localVotes[deck.id] ?? 0) : 0);
  return (a, b) => votesOf(b) - votesOf(a) || compareNewest(a, b);
}

const SORTS: Record<Exclude<DeckSort, "votes">, Compare> = {
  newest: compareNewest,
  winrate: (a, b) => (b.winRate ?? -1) - (a.winRate ?? -1) || compareNewest(a, b),
  placement: (a, b) => comparePlacement(a, b) || compareNewest(a, b),
};

/**
 * Filters and sorts directory rows. Each text term must match the start of a word in the
 * deck, archetype (name, short name and aliases), author, event, tag or key card names.
 * Every ordering ends on the deck id, so results are deterministic.
 */
export function searchDecks<T extends DeckSummary>(decks: readonly T[], query: DeckQuery = {}): T[] {
  const terms = normalizeSearchText(query.text ?? "").split(" ").filter(Boolean);
  const archetypes = query.archetypeIds?.length ? new Set(query.archetypeIds) : null;
  const tiers = query.tiers?.length ? new Set(query.tiers) : null;
  const placementLimit = PLACEMENT_LIMIT[query.placement ?? "any"];
  const source = query.source ?? "all";
  const author = query.author?.toLowerCase();
  const cardIds = query.cardIds ?? [];
  const sort = query.sort ?? "newest";
  const compare = sort === "votes" ? compareVotes(query.localVotes) : SORTS[sort];

  return decks
    .filter((deck) => {
      if (source !== "all" && deck.source !== source) return false;
      if (archetypes && !archetypes.has(deck.archetypeId)) return false;
      if (tiers && !(deck.tournament && tiers.has(deck.tournament.tier))) return false;
      if (placementLimit !== Number.POSITIVE_INFINITY && !(deck.tournament && deck.tournament.placement <= placementLimit)) return false;
      if (author && deck.author.handle.toLowerCase() !== author) return false;
      if (!cardIds.every((id) => deck.cardIds.includes(id))) return false;
      if (terms.length === 0) return true;
      const text = haystack(deck);
      return terms.every((term) => text.includes(` ${term}`));
    })
    .sort(compare);
}
