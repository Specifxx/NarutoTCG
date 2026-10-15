/**
 * Card keywords and rules terms. Definitions paraphrase the NARUTO Mythos TCG
 * Rulebook (EN); entries with `source.kind === "platform"` are this platform's
 * own shorthand and are labelled as such in the UI.
 */

export type KeywordCategory = "trigger" | "effect" | "status" | "resource" | "rule" | "phase" | "card" | "platform";

export const KEYWORD_CATEGORIES: ReadonlyArray<{ id: KeywordCategory; label: string; blurb: string }> = [
  { id: "trigger", label: "Triggers", blurb: "When an effect fires" },
  { id: "effect", label: "Effects", blurb: "What an effect does" },
  { id: "status", label: "Status", blurb: "States a card can be in" },
  { id: "resource", label: "Resources", blurb: "Chakra, tokens and points" },
  { id: "rule", label: "Core rules", blurb: "How the game flows" },
  { id: "phase", label: "Phases", blurb: "The four steps of a Round" },
  { id: "card", label: "Card types", blurb: "What's in your deck" },
  { id: "platform", label: "Platform terms", blurb: "Shorthand used on this site" },
];

export type KeywordSource = { kind: "official"; ref: string } | { kind: "platform"; note: string };

export interface KeywordEntry {
  /** kebab-case id, used in URLs (#ambush) and markup ([[ambush]]). */
  id: string;
  /** Display term; card keywords are upper-case as printed. */
  term: string;
  aliases: string[];
  category: KeywordCategory;
  /** One sentence for tooltips. */
  short: string;
  /** Full explanation for the glossary. */
  long: string;
  example?: { card: string; text: string };
  related: string[];
  source: KeywordSource;
  featured?: boolean;
}

const RULEBOOK = "NARUTO Mythos TCG Rulebook (EN)";
const official = (pages: string): KeywordSource => ({ kind: "official", ref: `${RULEBOOK}, ${pages}` });

export const KEYWORDS: readonly KeywordEntry[] = [
  {
    id: "ambush",
    term: "AMBUSH",
    aliases: ["ambushes", "ambushed"],
    category: "trigger",
    short: "Fires only when you reveal this character from hidden, never when it is played face-up from your hand.",
    long: "An AMBUSH effect resolves when you pay a hidden character's printed Chakra cost and flip it face-up, along with its MAIN effects. If you play the same card face-up straight from your hand, only MAIN fires and the AMBUSH is lost. Placing a card hidden costs 1 Chakra, so an ambush costs 1 plus the printed cost in total, but it gives you surprise and the extra effect.",
    example: { card: "Kakashi Hatake — Copy Ninja", text: "AMBUSH: POWERUP 2." },
    related: ["hidden", "reveal", "main", "powerup"],
    source: official("Hidden Characters p.13 · Glossary p.23"),
    featured: true,
  },
  {
    id: "powerup",
    term: "POWERUP",
    aliases: ["powerup x", "power up", "powers up"],
    category: "effect",
    short: "Put X Power tokens on a character, on this one unless the card says otherwise.",
    long: "Each Power token adds +1 Power to the character it sits on. Tokens stay when the character is hidden or revealed, carry over when it is upgraded, and are all removed in the End phase. Hidden characters can hold tokens, so a face-down card with tokens has Power equal to its tokens.",
    example: { card: "Sakura Haruno — Medical Ninja", text: "MAIN: POWERUP 1 on each other friendly character in this mission." },
    related: ["power-token", "printed-power", "end-phase"],
    source: official("Power Tokens p.17 · Glossary p.23"),
    featured: true,
  },
  {
    id: "exhaust",
    term: "EXHAUST",
    aliases: ["exhausted", "exhausts", "spend chakra"],
    category: "platform",
    short: "This site's shorthand for spending Chakra. Exhausted Chakra is gone for the rest of the Round.",
    long: "EXHAUST is not an official Mythos keyword. This platform uses it in its simulator and lessons for paying a cost: the Chakra tokens you pay go back to the shared pool and are exhausted until the next Start phase. Chakra you don't spend is also discarded in the End phase, so every point you leave unspent is wasted.",
    example: { card: "Revealing Kakashi Hatake", text: "Exhaust 4 Chakra: flip the hidden card face-up." },
    related: ["chakra", "end-phase", "start-phase"],
    source: { kind: "platform", note: "Simulator and lesson shorthand, not printed on cards." },
    featured: true,
  },
  {
    id: "main",
    term: "MAIN",
    aliases: ["main effect"],
    category: "trigger",
    short: "Fires every time you play the character face-up, including when you reveal or upgrade it.",
    long: "MAIN is a card's default play effect. It resolves when you play the character face-up from your hand, when you reveal it from hidden (together with AMBUSH), and when you play it as an upgrade (together with UPGRADE). A card placed face-down does nothing until it is revealed.",
    related: ["ambush", "upgrade", "instant"],
    source: official("How to play Character cards p.12 · Glossary p.23"),
  },
  {
    id: "upgrade",
    term: "UPGRADE",
    aliases: ["upgrade effect"],
    category: "trigger",
    short: "Fires only when this character is played as an upgrade over a same-name character.",
    long: "When you upgrade, you apply the new top card's MAIN effects and its UPGRADE effects. You can upgrade even if the card has no UPGRADE effect; you just won't get a bonus effect.",
    example: { card: "Naruto Uzumaki — Sage Mode", text: "UPGRADE: POWERUP 2." },
    related: ["upgrading", "main", "power-token"],
    source: official("Characters Upgrades p.15 · Glossary p.23"),
  },
  {
    id: "score",
    term: "SCORE",
    aliases: ["score effect"],
    category: "trigger",
    short: "Fires only when you win the mission it's on.",
    long: "After a mission's winner is decided in Mission evaluation, that player activates the SCORE effects on the Mission card and on their own Character cards assigned to that mission. Missions are scored in rank order, D first.",
    example: { card: "Orochimaru — Rogue Sannin", text: "SCORE: Gain 1 extra Mission point." },
    related: ["mission-evaluation", "mission-points"],
    source: official("Mission evaluation phase p.10 · Glossary p.23"),
  },
  {
    id: "first-strike",
    term: "FIRST STRIKE",
    aliases: ["first-strike"],
    category: "trigger",
    short: "Fires only if this is the first character you play this Round.",
    long: "FIRST STRIKE rewards opening your Round with this character. The lessons and puzzles here treat placing a hidden card and revealing one as playing a character, so either one uses up your first play.",
    example: { card: "Sasuke Uchiha — Last of the Uchiha", text: "FIRST STRIKE: POWERUP 2." },
    related: ["main", "action-phase"],
    source: official("Glossary p.23"),
  },
  {
    id: "duel",
    term: "DUEL",
    aliases: [],
    category: "trigger",
    short: "Fires only if the character named after the keyword is in this mission, on either side.",
    long: "DUEL effects build rivalries into cards: the effect checks for a specific named character in the same mission, friendly or enemy, before it applies.",
    related: ["friendly", "enemy"],
    source: official("Glossary p.23"),
  },
  {
    id: "instant",
    term: "Instant effect",
    aliases: ["instant"],
    category: "trigger",
    short: "Activates when the character is played face-up. Optional unless the text says otherwise.",
    long: "Effects marked with the Instant icon trigger at the moment the character is played face-up. They are optional unless stated, and card effects resolve top to bottom. If playing a card triggers effects on cards already in play, those resolve first.",
    related: ["continuous", "main"],
    source: official("Character Cards p.4 · Effects p.17"),
  },
  {
    id: "continuous",
    term: "Continuous effect",
    aliases: ["continuous"],
    category: "trigger",
    short: "Always active while the character is face-up on the field.",
    long: "Continuous effects have no trigger. They stay on as long as the character is face-up, and switch off while it is hidden.",
    example: { card: "Gaara — Jinchuriki of the Sand", text: "+1 Power for each other friendly character in this mission." },
    related: ["instant", "hidden"],
    source: official("Character Cards p.4 · Effects p.17"),
  },
  {
    id: "chakra-x",
    term: "CHAKRA +X",
    aliases: ["chakra+x", "chakra bonus"],
    category: "resource",
    short: "This character gives you X extra Chakra in the Start phase.",
    long: "On top of the normal +1 Chakra every character in play provides, a CHAKRA +X character adds X more each Start phase. Building around these lets you afford bigger plays in later Rounds.",
    example: { card: "Choji Akimichi — Expansion Jutsu", text: "CHAKRA +1." },
    related: ["chakra", "start-phase"],
    source: official("Glossary p.23"),
  },
  {
    id: "printed-power",
    term: "PRINTED POWER",
    aliases: ["printed"],
    category: "status",
    short: "The Power printed on the card, ignoring Power tokens, attachments and other effects.",
    long: "Some effects care only about a card's printed Power. Power tokens, attachments and continuous boosts don't change it.",
    related: ["powerup", "power-token"],
    source: official("Glossary p.23"),
  },
  {
    id: "hidden",
    term: "Hidden",
    aliases: ["face-down", "face down", "hidden character", "hidden characters", "hidden card", "hidden cards"],
    category: "status",
    short: "A face-down character. It costs 1 Chakra to play, has 0 Power and its effects are off.",
    long: "Any character can be played face-down for 1 Chakra, whatever its printed cost. Other effects treat it as 0 Power and 0 cost, but it is still a character: it generates Chakra in the Start phase and can hold Power tokens. Reveal it later for its printed cost to apply MAIN and AMBUSH.",
    related: ["ambush", "reveal", "non-hidden", "hide"],
    source: official("Hidden Characters p.13 · Glossary p.23"),
  },
  {
    id: "non-hidden",
    term: "Non-hidden",
    aliases: ["face-up", "face up"],
    category: "status",
    short: "Any character that is face-up.",
    long: "Non-hidden characters count their full Power and have their effects active. Some attachments require a non-hidden host and are discarded if it becomes hidden.",
    related: ["hidden", "attachment"],
    source: official("Glossary p.23"),
  },
  {
    id: "reveal",
    term: "Reveal",
    aliases: ["revealing", "revealed", "reveals"],
    category: "rule",
    short: "Pay a hidden character's printed cost to flip it face-up and apply MAIN and AMBUSH.",
    long: "Revealing counts as playing that character, so any effect that refers to playing a character includes reveals. You may always check your own hidden cards' costs in private.",
    related: ["hidden", "ambush", "main"],
    source: official("How to play Character cards p.12 · Hidden Characters p.13"),
  },
  {
    id: "upgrading",
    term: "Upgrading",
    aliases: ["upgrades", "upgraded", "upgrade stack"],
    category: "rule",
    short: "Play a same-name character with a higher cost on top of one you have, paying only the difference.",
    long: "Only one character with a given name can be on your side of a mission, but you can upgrade it with a higher-cost version. Pay the cost difference, cover the old card completely, and apply the new card's MAIN and UPGRADE effects. The stack is a single character: it generates 1 Chakra, keeps its Power tokens, and leaves play as one unit.",
    related: ["upgrade", "power-token"],
    source: official("Characters Upgrades p.15"),
  },
  {
    id: "defeat",
    term: "Defeat",
    aliases: ["defeated", "defeats"],
    category: "effect",
    short: "Put the character into its owner's discard pile.",
    long: "A defeated character leaves play. If it was an upgrade stack, the cards beneath are discarded first, top to bottom.",
    example: { card: "Zabuza Momochi — Demon of the Mist", text: "AMBUSH: Defeat an enemy character with Power 3 or less in this mission." },
    related: ["leave-play", "enemy"],
    source: official("Glossary p.23"),
  },
  {
    id: "hide",
    term: "Hide",
    aliases: ["hides"],
    category: "effect",
    short: "Turn a character face-down.",
    long: "A hidden character drops to 0 printed Power and its effects switch off, though Power tokens stay on it. If the top card of an upgrade stack is hidden, the whole stack turns face-down.",
    example: { card: "Shikamaru Nara — Shadow Strategist", text: "AMBUSH: Hide an enemy character with Power 3 or less in this mission." },
    related: ["hidden", "reveal"],
    source: official("Glossary p.23"),
  },
  {
    id: "move",
    term: "Move",
    aliases: ["moves", "moved"],
    category: "effect",
    short: "Place a character in another mission, as the effect says.",
    long: "Moving shifts where a character's Power counts, which can swing two missions at once. The same-name rule still applies in the destination mission.",
    related: ["friendly", "enemy"],
    source: official("Glossary p.23"),
  },
  {
    id: "take-control",
    term: "Take control",
    aliases: ["control"],
    category: "effect",
    short: "Temporarily control an enemy card. It returns to its owner if it would leave play.",
    long: "The card switches to your side for now. If the source of the control is hidden, leaves play or changes sides, return the card to its owner in the same mission, on their side.",
    related: ["enemy", "leave-play"],
    source: official("Glossary p.23"),
  },
  {
    id: "friendly",
    term: "Friendly",
    aliases: ["friendlies", "friend"],
    category: "rule",
    short: "A card on your side. A character is never friendly to itself.",
    long: "Your characters are friendly to all your other characters. Effects that say 'other friendly character' never include the character that owns the effect.",
    related: ["enemy"],
    source: official("Glossary p.23"),
  },
  {
    id: "enemy",
    term: "Enemy",
    aliases: ["enemies"],
    category: "rule",
    short: "A card on your opponent's side.",
    long: "All of your opponent's characters are enemy characters. Most removal effects, like defeat and hide, target enemies in the same mission.",
    related: ["friendly", "defeat", "hide"],
    source: official("Glossary p.23"),
  },
  {
    id: "leave-play",
    term: "Leave play",
    aliases: ["leaves play"],
    category: "rule",
    short: "A card in play goes to the discard pile, hand or deck. Everything under it is discarded.",
    long: "Defeat, bounce and shuffle effects all make a card leave play. Attachments and lower cards in an upgrade stack go to the discard pile with it.",
    related: ["defeat", "attachment", "upgrading"],
    source: official("Glossary p.23"),
  },
  {
    id: "edge-token",
    term: "Edge token",
    aliases: ["edge", "the edge"],
    category: "resource",
    short: "First to pass takes it. The holder wins tied missions, acts first next Round and wins a tied game.",
    long: "A random player starts with the Edge. Each Action phase, the first player to pass gains or keeps it. The holder wins every tie in Mission evaluation, takes the first turn of the next Round, and wins the game if final scores are tied. Passing early can lock in tie-breaks, but your opponent then plays as many turns as they like.",
    related: ["pass", "mission-evaluation", "action-phase"],
    source: official("Setup p.8 · Action phase p.10 · Edge token p.16 · Winning p.21"),
    featured: true,
  },
  {
    id: "power-token",
    term: "Power token",
    aliases: ["power tokens", "token", "tokens"],
    category: "resource",
    short: "Each one adds +1 Power to the character it sits on. All are removed in the End phase.",
    long: "Any spare token can track Power. Tokens survive hiding and revealing and carry over to the new top card when you upgrade. The main source of tokens is POWERUP.",
    related: ["powerup", "end-phase"],
    source: official("Power Tokens p.17"),
  },
  {
    id: "chakra",
    term: "Chakra",
    aliases: ["chakra points", "energy"],
    category: "resource",
    short: "Your currency for playing cards: 5 base + 1 per character in play + CHAKRA +X, gained every Start phase.",
    long: "Each Start phase you gain 5 Chakra, plus 1 for every character you have in play (hidden ones included), plus any CHAKRA +X bonuses. Pay costs by returning Chakra tokens to the shared pool. Leftover Chakra is discarded in the End phase, so it never carries over.",
    related: ["chakra-x", "exhaust", "start-phase"],
    source: official("Start phase p.9 · How to play p.12 · End phase p.11"),
  },
  {
    id: "mission-points",
    term: "Mission points",
    aliases: ["points", "mission point"],
    category: "resource",
    short: "What you win the game with: a mission's printed base points plus its rank bonus.",
    long: "Winning a mission awards its printed base points plus a rank bonus: D +1, C +2, B +3, A +4. Every mission in play is scored each Round, so the D-rank mission is contested four times. The most Mission points after Round 4 wins.",
    related: ["mission-rank", "score", "mission-evaluation"],
    source: official("Mission Cards p.6 · Winning p.21"),
  },
  {
    id: "mission-rank",
    term: "Mission rank",
    aliases: ["rank", "d-rank", "c-rank", "b-rank", "a-rank"],
    category: "rule",
    short: "Set by the Round a mission enters play: D (1st), C (2nd), B (3rd), A (4th).",
    long: "One new mission is revealed every Start phase. Its rank comes from that Round and sets its bonus points: D +1, C +2, B +3, A +4. Missions are always evaluated in rank order, starting with D.",
    related: ["mission-points", "start-phase"],
    source: official("Mission Cards p.6"),
  },
  {
    id: "pass",
    term: "Pass",
    aliases: ["passes", "passed", "passing"],
    category: "rule",
    short: "Stop playing for the Round. The first to pass takes the Edge, and the other player keeps taking turns.",
    long: "On your turn you must play one card or pass. Once you pass, you are out of the Action phase until next Round. If your opponent passed first, you can play several turns in a row until you pass too. When both players have passed, move to Mission evaluation.",
    related: ["edge-token", "action-phase"],
    source: official("Action phase p.10 · How to play p.12"),
  },
  {
    id: "mulligan",
    term: "Mulligan",
    aliases: ["redraw"],
    category: "rule",
    short: "Once, during setup, shuffle your 5-card hand back and draw 5 new cards.",
    long: "After both players draw their opening 5, the Edge player chooses first whether to mulligan, then the other player. Each player can do it only once.",
    related: ["deck"],
    source: official("Setup p.8 · Simplified game plan p.22"),
  },
  {
    id: "deck",
    term: "Deck",
    aliases: ["deck construction", "decklist"],
    category: "card",
    short: "At least 30 cards, no more than 2 copies of any one card version, plus 3 different Mission cards.",
    long: "You can run any number of characters with the same name, but at most 2 copies of each specific version (set and number). Art variants count as the same version. Your 3 Mission cards stay out of your deck. At setup, 2 are chosen at random and combined with your opponent's 2 to make the Mission deck.",
    related: ["mulligan", "mission-rank"],
    source: official("How to build your first deck p.7"),
  },
  {
    id: "attachment",
    term: "Attachment",
    aliases: ["attachments"],
    category: "card",
    short: "A card slid under a Character or Mission to modify it, limited to one per player per card.",
    long: "Attachments need a valid host, as their card specifies. They aren't characters and don't generate Chakra. Playing a second one of yours on the same host discards the first. If a host stops meeting the attachment's condition, or leaves play, the attachment is discarded.",
    related: ["non-hidden", "leave-play"],
    source: official("Attachment Cards pp.18–20"),
  },
  {
    id: "kage",
    term: "Kage",
    aliases: ["leader", "leaders", "kage leader"],
    category: "rule",
    short: "You play as the Kage, the leader of your hidden village who sends ninjas out on missions.",
    long: "There is no Leader card in NARUTO Mythos TCG. You are the leader: each turn you decide which ninja to commit to which mission. The Edge token marks who leads the Round, taking the first turn and winning ties.",
    related: ["edge-token", "action-phase"],
    source: official("Welcome p.3"),
  },
  {
    id: "start-phase",
    term: "Start phase",
    aliases: ["start"],
    category: "phase",
    short: "Reveal the next mission, gain Chakra, draw 2 cards.",
    long: "Reveal the top card of the Mission deck and add it to the missions in play. Each player gains 5 Chakra plus 1 per character in play plus CHAKRA +X bonuses, then draws 2 cards. Start-of-Round effects activate here.",
    related: ["chakra", "mission-rank"],
    source: official("Start phase p.9"),
  },
  {
    id: "action-phase",
    term: "Action phase",
    aliases: ["action"],
    category: "phase",
    short: "Players alternate: play one card per turn or pass. The Edge holder goes first.",
    long: "Each turn, play a card face-up, play one hidden, reveal a hidden one, upgrade, or pass. The phase ends when both players have passed.",
    related: ["pass", "edge-token", "hidden"],
    source: official("Action phase p.10"),
  },
  {
    id: "mission-evaluation",
    term: "Mission evaluation",
    aliases: ["mission phase", "evaluation", "combat"],
    category: "phase",
    short: "Compare total Power on each mission, D first. Most Power wins, the Edge breaks ties, and you need at least 1 Power.",
    long: "For each mission in rank order, total the Power each player has assigned there. Higher total wins; on a tie the Edge holder wins; a player with 0 Power can't win. The winner gains the mission's points and fires its SCORE effects. Every mission in play is scored every Round.",
    related: ["edge-token", "score", "mission-points"],
    source: official("Mission evaluation phase p.10"),
  },
  {
    id: "end-phase",
    term: "End phase",
    aliases: ["end"],
    category: "phase",
    short: "Discard leftover Chakra and all Power tokens, then start the next Round.",
    long: "End-of-Round effects activate, then both players discard any unspent Chakra and remove every Power token. After the 4th Round, compare final scores instead.",
    related: ["chakra", "power-token", "exhaust"],
    source: official("End phase p.11"),
  },
];

const index = new Map<string, KeywordEntry>();
for (const k of KEYWORDS) {
  for (const key of [k.id, k.term, ...k.aliases]) index.set(key.toLowerCase(), k);
}

/** Finds a keyword by id, term or alias (case-insensitive). */
export function findKeyword(query: string): KeywordEntry | undefined {
  return index.get(query.trim().toLowerCase());
}

export function keywordById(id: string): KeywordEntry {
  const k = KEYWORDS.find((k) => k.id === id);
  if (!k) throw new Error(`Unknown keyword id "${id}"`);
  return k;
}
