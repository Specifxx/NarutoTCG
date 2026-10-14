/**
 * Archetype definitions: identity, classification signals, chart colors and the
 * list templates the seed generator builds legal 50-card decks from.
 */

export type Playstyle = "aggro" | "tempo" | "midrange" | "control" | "combo";

export interface Archetype {
  id: string;
  name: string;
  shortName: string;
  /** Leaders that define the archetype; the first is the default. */
  leaderIds: string[];
  /** Cards unique to the archetype, used by the classifier. */
  signatureCardIds: string[];
  playstyle: Playstyle;
  /**
   * Fixed categorical chart slot (1–8). Color follows the archetype, never its rank,
   * so filters never repaint a series. Archetypes without a slot fold into "Other".
   */
  chartSlot: number | null;
  description: string;
  gamePlan: string;
  strengths: string[];
  weaknesses: string[];
  /** Alternate names TOs and players use, matched case-insensitively during ingestion. */
  aliases: string[];
  /** Cards a pilot wants in the opening hand; default hit condition for the hand simulator. */
  mulliganTargets: string[];
  /** Fixed core of the list, 40 cards. */
  core: Array<[cardId: string, quantity: number]>;
  /** Flex options the remaining 10 slots are filled from, with relative weights. */
  flex: Array<[cardId: string, weight: number]>;
}

/** Dark-mode categorical palette (validated against the #0d0d14 surface). Index = slot - 1. */
export const CHART_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"] as const;
/** Neutral used for the folded "Other" series; never a categorical hue. */
export const OTHER_COLOR = "#5c5c70";
export const ROGUE_ID = "rogue";

export const ARCHETYPES: readonly Archetype[] = [
  {
    id: "uchiha-avenger",
    name: "Uchiha Avenger",
    shortName: "Avenger",
    leaderIds: ["NT02-L01"],
    signatureCardIds: ["NT02-001", "NT02-002", "NT02-003", "NT02-004", "NT02-005", "NT02-006", "NT02-007", "NT02-008"],
    playstyle: "tempo",
    chartSlot: 1,
    description: "Sasuke and Taka chain cheap Lightning Jutsu into a pumped Leader, removing blockers while chip damage piles up.",
    gamePlan: "Curve Karin into Hawk Summon, clear the way with Chidori, then close with a Kirin turn once two Lightning Jutsu are online.",
    strengths: ["Efficient removal at 2 cost", "Explosive Kirin turns", "Strong into slow control"],
    weaknesses: ["Runs out of cards against heavy blockers", "Kirin is dead without Lightning setup"],
    aliases: ["avenger", "sasuke", "taka", "uchiha taka", "sasuke avenger", "lightning sasuke"],
    mulliganTargets: ["NT02-003", "NT02-005", "NT02-006"],
    core: [["NT02-001", 4], ["NT02-002", 4], ["NT02-003", 4], ["NT02-004", 3], ["NT02-005", 4], ["NT02-006", 4], ["NT02-007", 2], ["NT02-008", 3], ["NT01-040", 4], ["NT01-041", 4], ["NT02-038", 4]],
    flex: [["NT01-042", 3], ["NT01-035", 2], ["NT02-037", 2], ["NT02-036", 1], ["NT01-044", 2], ["NT02-040", 2], ["NT04-003", 2]],
  },
  {
    id: "uzumaki-sage",
    name: "Uzumaki Sage Mode",
    shortName: "Sage Naruto",
    leaderIds: ["NT03-L01", "NT04-L01"],
    signatureCardIds: ["NT03-001", "NT03-002", "NT03-003", "NT03-004", "NT03-005", "NT03-006", "NT03-007", "NT03-008"],
    playstyle: "midrange",
    chartSlot: 2,
    description: "Naruto assembles three Sage cards to switch on extra draws, then out-values the opponent with Rasengan and big Toad summons.",
    gamePlan: "Find Fukasaku & Shima early, land Train at Mount Myoboku, and use Gamabunta and Massive Rasengan to swing the board in the mid game.",
    strengths: ["Card advantage engine", "Flexible removal suite", "Resilient Minato threats"],
    weaknesses: ["Slow if the Sage count stalls", "Vulnerable to hand disruption"],
    aliases: ["sage naruto", "naruto", "uzumaki", "sage mode", "naruto sage", "kurama naruto", "klm naruto"],
    mulliganTargets: ["NT03-001", "NT03-002", "NT01-041"],
    core: [["NT03-001", 4], ["NT03-002", 4], ["NT03-003", 3], ["NT03-004", 3], ["NT03-005", 3], ["NT03-006", 4], ["NT03-007", 3], ["NT03-008", 3], ["NT01-041", 4], ["NT01-040", 4], ["NT01-035", 2], ["NT01-036", 3]],
    flex: [["NT03-034", 3], ["NT01-037", 2], ["NT01-042", 3], ["NT01-043", 2], ["NT04-001", 2], ["NT04-006", 3], ["NT02-038", 1], ["NT01-038", 1]],
  },
  {
    id: "hyuga-gentle-fist",
    name: "Hyuga Gentle Fist",
    shortName: "Hyuga",
    leaderIds: ["NT01-L03", "NT04-L02"],
    signatureCardIds: ["NT01-018", "NT01-019", "NT01-020", "NT01-021", "NT01-022", "NT01-023", "NT01-024", "NT01-025"],
    playstyle: "tempo",
    chartSlot: 3,
    description: "Byakugan information plus Leader lock: the Hyuga see every draw coming and shut off key Leader abilities at the right moment.",
    gamePlan: "Develop cheap Hyuga, protect them with Palm Rotation, and fire Sixty-Four Palms the turn the opponent's Leader ability matters most.",
    strengths: ["Perfect information on the top deck", "Cheap counters", "Shuts down Leader-centric decks"],
    weaknesses: ["Low raw power", "Struggles against wide boards"],
    aliases: ["hyuga", "gentle fist", "hinata", "byakugan", "neji", "hyuga tempo"],
    mulliganTargets: ["NT01-020", "NT01-021", "NT01-023"],
    core: [["NT01-018", 4], ["NT01-019", 3], ["NT01-020", 4], ["NT01-021", 4], ["NT01-022", 4], ["NT01-023", 4], ["NT01-024", 4], ["NT01-025", 3], ["NT01-040", 4], ["NT01-039", 3], ["NT01-036", 3]],
    flex: [["NT01-041", 3], ["NT01-035", 2], ["NT01-042", 2], ["NT01-043", 2], ["NT04-008", 3], ["NT01-037", 1], ["NT02-037", 1]],
  },
  {
    id: "sand-gaara",
    name: "Sand Coffin Gaara",
    shortName: "Gaara",
    leaderIds: ["NT03-L02"],
    signatureCardIds: ["NT03-009", "NT03-010", "NT03-011", "NT03-012", "NT03-013", "NT03-014", "NT03-015", "NT03-016"],
    playstyle: "control",
    chartSlot: 4,
    description: "The Kazekage walls the board with Blockers and punishes every tapped attacker with Sand Coffin before Shukaku closes the game.",
    gamePlan: "Absorb early pressure with Matsuri and Baki, trade efficiently with Sand Coffin, and land an untouchable Shukaku once the opponent is out of gas.",
    strengths: ["Best-in-format defense", "Removal that scales with opposing aggression", "Jutsu-proof finisher"],
    weaknesses: ["Few proactive threats", "Gives combo decks time to set up"],
    aliases: ["gaara", "sand", "kazekage", "sand coffin", "gaara control", "suna"],
    mulliganTargets: ["NT03-013", "NT03-012", "NT03-015"],
    core: [["NT03-009", 4], ["NT03-010", 4], ["NT03-011", 2], ["NT03-012", 4], ["NT03-013", 4], ["NT03-014", 4], ["NT03-015", 4], ["NT03-016", 3], ["NT01-040", 4], ["NT01-041", 4], ["NT03-035", 3]],
    flex: [["NT01-038", 3], ["NT02-039", 2], ["NT01-042", 2], ["NT03-036", 2], ["NT03-037", 2], ["NT01-037", 1], ["NT02-037", 1]],
  },
  {
    id: "medical-ninja",
    name: "Medical Ninja Stall",
    shortName: "Medical",
    leaderIds: ["NT01-L02"],
    signatureCardIds: ["NT01-009", "NT01-010", "NT01-011", "NT01-012", "NT01-013", "NT01-014", "NT01-015", "NT01-016", "NT01-017"],
    playstyle: "control",
    chartSlot: 5,
    description: "Tsunade heals the board every turn and draws off three Medical bodies, grinding damage-based decks into the ground.",
    gamePlan: "Stack cheap Medical Characters, keep them alive with Mystical Palm, and win the long game behind Katsuyu's Jutsu immunity.",
    strengths: ["Invalidates chip damage", "Steady card flow", "Great into burn and Paper Shuriken"],
    weaknesses: ["Low damage output", "Weak to hard removal and bounce"],
    aliases: ["medical", "tsunade", "med ninja", "medical stall", "hokage tsunade", "heal"],
    mulliganTargets: ["NT01-010", "NT01-012", "NT01-015"],
    core: [["NT01-009", 4], ["NT01-010", 4], ["NT01-011", 2], ["NT01-012", 4], ["NT01-013", 3], ["NT01-014", 3], ["NT01-015", 4], ["NT01-016", 3], ["NT01-017", 3], ["NT01-040", 4], ["NT01-038", 3], ["NT01-041", 3]],
    flex: [["NT04-005", 3], ["NT01-035", 2], ["NT01-042", 2], ["NT01-037", 2], ["NT03-035", 1], ["NT02-037", 1], ["NT01-043", 1], ["NT04-010", 2]],
  },
  {
    id: "leaf-jonin",
    name: "Leaf Jonin Midrange",
    shortName: "Jonin",
    leaderIds: ["NT01-L01"],
    signatureCardIds: ["NT01-001", "NT01-002", "NT01-003", "NT01-004", "NT01-005", "NT01-006", "NT01-007", "NT01-008"],
    playstyle: "midrange",
    chartSlot: 6,
    description: "Kakashi copies the best Jutsu on the table while a squad of Jonin trades up on every attack.",
    gamePlan: "Curve Ibiki into Kurenai and Asuma, copy Lightning Blade for two-for-ones, and close with Kamui on the opponent's best threat.",
    strengths: ["Consistent curve", "Copy effect doubles removal", "Hand disruption with Ibiki"],
    weaknesses: ["No single dominant threat", "Copy tax slows turn-5 plays"],
    aliases: ["jonin", "kakashi", "leaf midrange", "copy ninja", "kakashi jonin", "konoha jonin"],
    mulliganTargets: ["NT01-005", "NT01-002", "NT01-004"],
    core: [["NT01-001", 4], ["NT01-002", 4], ["NT01-003", 3], ["NT01-004", 4], ["NT01-005", 3], ["NT01-006", 4], ["NT01-007", 2], ["NT01-008", 3], ["NT01-040", 4], ["NT01-041", 3], ["NT01-037", 3], ["NT01-035", 3]],
    flex: [["NT01-039", 2], ["NT01-036", 2], ["NT01-042", 3], ["NT02-038", 2], ["NT04-008", 2], ["NT01-044", 1], ["NT03-034", 1]],
  },
  {
    id: "itachi-tsukuyomi",
    name: "Itachi Tsukuyomi",
    shortName: "Itachi",
    leaderIds: ["NT02-L04"],
    signatureCardIds: ["NT02-027", "NT02-028", "NT02-029", "NT02-030", "NT02-031", "NT02-032", "NT02-033", "NT02-034", "NT02-035"],
    playstyle: "control",
    chartSlot: 7,
    description: "Itachi strips the opponent's hand with Tsukuyomi and Leader discard while sturdy Akatsuki bodies hold the board.",
    gamePlan: "Zetsu scouts the hand, Tsukuyomi trims it, and Amaterasu answers the one threat left. Susanoo protects the Leader in the closing turns.",
    strengths: ["Relentless hand disruption", "Immortal bodies dodge Jutsu removal", "Permanent removal with Amaterasu"],
    weaknesses: ["Expensive top end", "Folds to fast aggro before discard matters"],
    aliases: ["itachi", "tsukuyomi", "akatsuki itachi", "sharingan control", "itachi control"],
    mulliganTargets: ["NT02-031", "NT02-028", "NT02-032"],
    core: [["NT02-027", 4], ["NT02-028", 4], ["NT02-029", 3], ["NT02-030", 3], ["NT02-031", 4], ["NT02-032", 4], ["NT02-033", 3], ["NT02-034", 2], ["NT02-035", 3], ["NT01-040", 4], ["NT02-038", 3], ["NT01-041", 3]],
    flex: [["NT04-003", 3], ["NT02-039", 2], ["NT02-036", 1], ["NT01-042", 2], ["NT02-040", 2], ["NT02-037", 1]],
  },
  {
    id: "akatsuki-pain",
    name: "Six Paths of Pain",
    shortName: "Pain",
    leaderIds: ["NT02-L02"],
    signatureCardIds: ["NT02-009", "NT02-010", "NT02-011", "NT02-012", "NT02-013", "NT02-014", "NT02-015", "NT02-016"],
    playstyle: "control",
    chartSlot: 8,
    description: "Pain ramps off every defeated Character and resets the board with Almighty Push before Planetary Devastation locks the game.",
    gamePlan: "Chain Animal Path searches, sweep cheap boards with Konan and Almighty Push, and convert the extra chakra into a Nagato or Planetary Devastation turn.",
    strengths: ["Board sweepers punish go-wide decks", "Chakra ramp off removal", "Recursive Six Paths bodies"],
    weaknesses: ["Weak to Blockers that never die", "Clunky draws with multiple 6-drops"],
    aliases: ["pain", "six paths", "akatsuki pain", "deva path", "nagato", "pain control", "rinnegan"],
    mulliganTargets: ["NT02-012", "NT02-011", "NT02-009"],
    core: [["NT02-009", 4], ["NT02-010", 4], ["NT02-011", 3], ["NT02-012", 4], ["NT02-013", 2], ["NT02-014", 4], ["NT02-015", 2], ["NT02-016", 3], ["NT01-040", 4], ["NT01-041", 4], ["NT02-039", 3], ["NT01-037", 3]],
    flex: [["NT04-004", 3], ["NT02-038", 2], ["NT01-042", 2], ["NT01-044", 2], ["NT02-040", 1], ["NT02-036", 1], ["NT02-037", 1]],
  },
  {
    id: "sannin-summons",
    name: "Sannin Summons",
    shortName: "Jiraiya",
    leaderIds: ["NT03-L03"],
    signatureCardIds: ["NT03-017", "NT03-018", "NT03-019", "NT03-020", "NT03-021", "NT03-022", "NT03-023", "NT03-024"],
    playstyle: "combo",
    chartSlot: null,
    description: "Jiraiya discounts every Toad, flooding the board with Summons and finishing with Goemon or Toad Mouth Trap.",
    gamePlan: "Gamakichi into discounted Summons, complete Icha Icha research for cards, and lock the opponent's small Characters with Toad Mouth Trap.",
    strengths: ["Explosive board development", "Board-wide Jutsu finishers"],
    weaknesses: ["Weak to sweepers", "Needs the Leader discount online"],
    aliases: ["jiraiya", "toads", "sannin", "summons", "toad sage", "sannin toads"],
    mulliganTargets: ["NT03-017", "NT03-034", "NT03-018"],
    core: [["NT03-017", 4], ["NT03-018", 4], ["NT03-019", 4], ["NT03-020", 3], ["NT03-021", 3], ["NT03-022", 3], ["NT03-023", 3], ["NT03-024", 4], ["NT03-034", 4], ["NT01-040", 4], ["NT01-041", 4]],
    flex: [["NT01-042", 3], ["NT01-035", 2], ["NT02-038", 2], ["NT01-037", 2], ["NT01-043", 1], ["NT03-036", 1]],
  },
  {
    id: "orochimaru-curse",
    name: "Curse Mark Orochimaru",
    shortName: "Orochimaru",
    leaderIds: ["NT02-L03"],
    signatureCardIds: ["NT02-017", "NT02-018", "NT02-019", "NT02-020", "NT02-021", "NT02-022", "NT02-023", "NT02-024", "NT02-025", "NT02-026"],
    playstyle: "combo",
    chartSlot: null,
    description: "Orochimaru sacrifices the Sound Four to tutor Curse Marks, building an oversized threat every turn.",
    gamePlan: "Kabuto finds the Sound Four, the Leader converts them into Curse Mark of Heaven, and Kimimaro or Manda ends the game through blockers.",
    strengths: ["Tutors every turn", "Unblockable Kimimaro pressure"],
    weaknesses: ["Self-damage adds up", "Hates hand disruption"],
    aliases: ["orochimaru", "curse mark", "sound four", "sound", "snake sannin", "oro"],
    mulliganTargets: ["NT02-017", "NT02-019", "NT02-024"],
    core: [["NT02-017", 4], ["NT02-018", 3], ["NT02-019", 4], ["NT02-020", 3], ["NT02-021", 3], ["NT02-022", 4], ["NT02-023", 2], ["NT02-024", 4], ["NT02-025", 3], ["NT02-026", 3], ["NT01-040", 4], ["NT01-041", 3]],
    flex: [["NT04-007", 3], ["NT02-038", 2], ["NT02-039", 2], ["NT01-042", 2], ["NT02-040", 1], ["NT02-037", 1]],
  },
  {
    id: "taijutsu-lee",
    name: "Taijutsu Rush",
    shortName: "Lee Rush",
    leaderIds: ["NT01-L04"],
    signatureCardIds: ["NT01-026", "NT01-027", "NT01-028", "NT01-029", "NT01-030", "NT01-031", "NT01-032", "NT01-033", "NT01-034"],
    playstyle: "aggro",
    chartSlot: null,
    description: "Every Character attacks the turn it lands. Rock Lee races with cheap Taijutsu bodies and Gate of Death burst turns.",
    gamePlan: "Curve out with Weights Off and Ninja Tortoise, push damage with Leaf Hurricane, and close with a Gate of Death swing.",
    strengths: ["Fastest clock in the format", "Immune to cheap removal with Drunken Fist"],
    weaknesses: ["No expensive removal: only Taijutsu Jutsu above 2 cost", "Collapses against Blockers and lifegain"],
    aliases: ["lee", "rock lee", "taijutsu", "lee rush", "taijutsu aggro", "team guy", "might guy"],
    mulliganTargets: ["NT01-028", "NT01-030", "NT01-029"],
    core: [["NT01-026", 4], ["NT01-027", 4], ["NT01-028", 4], ["NT01-029", 4], ["NT01-030", 4], ["NT01-031", 4], ["NT01-032", 4], ["NT01-033", 2], ["NT01-034", 3], ["NT01-040", 4], ["NT01-039", 3]],
    flex: [["NT01-036", 3], ["NT01-035", 2], ["NT01-043", 3], ["NT01-044", 1], ["NT01-038", 1]],
  },
  {
    id: "puppet-brigade",
    name: "Puppet Brigade",
    shortName: "Puppets",
    leaderIds: ["NT03-L04", "NT03-L05"],
    signatureCardIds: ["NT03-025", "NT03-026", "NT03-027", "NT03-028", "NT03-029", "NT03-030", "NT03-031", "NT03-032", "NT03-033"],
    playstyle: "combo",
    chartSlot: null,
    description: "Sasori and Kankuro rebuild an army of Puppets from the trash, out-grinding fair decks with recursion.",
    gamePlan: "Trade Puppets freely, keep Chiyo alive for recursion, and reload the whole board with Performance of a Hundred Puppets.",
    strengths: ["Recursion beats one-for-one removal", "Sturdy on the opponent's turn"],
    weaknesses: ["Slow to start", "Weak to permanent removal"],
    aliases: ["puppets", "sasori", "kankuro", "puppet", "red sand", "puppet master"],
    mulliganTargets: ["NT03-025", "NT03-026", "NT03-029"],
    core: [["NT03-025", 4], ["NT03-026", 4], ["NT03-027", 4], ["NT03-028", 3], ["NT03-029", 4], ["NT03-030", 3], ["NT03-031", 4], ["NT03-032", 2], ["NT03-033", 3], ["NT01-040", 4], ["NT01-041", 3], ["NT01-035", 2]],
    flex: [["NT01-042", 3], ["NT02-039", 2], ["NT03-034", 1], ["NT02-038", 2], ["NT01-037", 1], ["NT02-037", 1]],
  },
  {
    id: ROGUE_ID,
    name: "Rogue / Other",
    shortName: "Rogue",
    leaderIds: ["NT02-L05", "NT04-L03", "NT04-L04"],
    signatureCardIds: [],
    playstyle: "midrange",
    chartSlot: null,
    description: "Off-meta and homebrew lists that do not match a tracked archetype.",
    gamePlan: "Varies by list.",
    strengths: ["Unexpected for opponents"],
    weaknesses: ["Usually less refined than established archetypes"],
    aliases: ["rogue", "other", "unknown", "homebrew", "misc"],
    mulliganTargets: ["NT01-035", "NT01-036", "NT02-038"],
    core: [["NT02-036", 4], ["NT02-037", 4], ["NT02-038", 4], ["NT02-039", 4], ["NT01-040", 4], ["NT01-041", 4], ["NT01-042", 4], ["NT01-035", 4], ["NT01-036", 4], ["NT01-038", 4]],
    flex: [["NT01-037", 3], ["NT01-039", 3], ["NT03-036", 2], ["NT03-037", 2], ["NT04-002", 2], ["NT04-010", 2], ["NT04-008", 2], ["NT04-009", 2], ["NT01-043", 1], ["NT01-044", 1], ["NT02-040", 1]],
  },
];

export const ARCHETYPE_INDEX: ReadonlyMap<string, Archetype> = new Map(ARCHETYPES.map((a) => [a.id, a]));

export function getArchetype(id: string): Archetype | undefined {
  return ARCHETYPE_INDEX.get(id);
}

/** Chart color for an archetype: its fixed slot color, or the neutral "Other" color. */
export function archetypeColor(id: string): string {
  const slot = ARCHETYPE_INDEX.get(id)?.chartSlot;
  return slot ? CHART_COLORS[slot - 1]! : OTHER_COLOR;
}

/** Archetypes that own a chart slot, in slot order (the order stacks and legends use). */
export const CHARTED_ARCHETYPES: readonly Archetype[] = ARCHETYPES.filter((a) => a.chartSlot !== null).sort(
  (a, b) => a.chartSlot! - b.chartSlot!,
);
