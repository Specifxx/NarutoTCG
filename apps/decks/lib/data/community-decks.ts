import { AUTHOR_INDEX } from "@/lib/data/authors";
import { communityDeckId, type DeckDetail } from "@/lib/decks/types";

/**
 * Community-published decklists (fictional demo content). Records are playtest results the
 * authors logged on the simulator, not tournament results.
 */

export const COMMUNITY_TAGS = [
  "Budget",
  "Anti-meta",
  "Beginner friendly",
  "Tournament ready",
  "Spicy",
  "Control",
  "Aggro",
  "Combo",
  "Tech",
] as const;

export type CommunityTag = (typeof COMMUNITY_TAGS)[number];

interface CommunityDeckSpec {
  /** Never contains `--`. */
  slug: string;
  name: string;
  archetypeId: string;
  author: string;
  createdAt: string;
  leaderId: string;
  cards: Array<[cardId: string, quantity: number]>;
  keyCardIds: string[];
  record: [wins: number, losses: number, draws: number];
  votes: number;
  tags: CommunityTag[];
  description: string[];
  matchupNotes: Record<string, string>;
}

function communityDeck(spec: CommunityDeckSpec): DeckDetail {
  const author = AUTHOR_INDEX.get(spec.author);
  if (!author) throw new Error(`Unknown community author "${spec.author}"`);
  const [wins, losses, draws] = spec.record;
  const games = wins + losses + draws;
  return {
    id: communityDeckId(spec.slug),
    name: spec.name,
    archetypeId: spec.archetypeId,
    leaderId: spec.leaderId,
    source: "community",
    author: { handle: author.handle, name: author.name, country: author.country },
    createdAt: spec.createdAt,
    record: { wins, losses, draws },
    winRate: games === 0 ? undefined : (wins + draws / 2) / games,
    winRateSource: "playtest",
    votes: spec.votes,
    keyCardIds: spec.keyCardIds,
    cardIds: [spec.leaderId, ...new Set(spec.cards.map(([cardId]) => cardId))],
    tags: spec.tags,
    decklist: { leaderId: spec.leaderId, cards: spec.cards.map(([cardId, quantity]) => ({ cardId, quantity })) },
    description: spec.description,
    matchupNotes: spec.matchupNotes,
  };
}

const SPECS: CommunityDeckSpec[] = [
  {
    slug: "almighty-push-control",
    name: "Almighty Push Control",
    archetypeId: "akatsuki-pain",
    author: "rinnegan-rhea",
    createdAt: "2026-05-18",
    leaderId: "NT02-L02",
    cards: [
      ["NT02-009", 4], ["NT02-010", 4], ["NT02-011", 3], ["NT02-012", 4], ["NT02-013", 2], ["NT02-014", 4],
      ["NT02-015", 2], ["NT02-016", 3], ["NT01-040", 4], ["NT01-041", 4], ["NT02-039", 3], ["NT01-037", 3],
      ["NT02-038", 3], ["NT01-042", 3], ["NT02-037", 2], ["NT02-040", 2],
    ],
    keyCardIds: ["NT02-014", "NT02-013", "NT02-015"],
    record: [34, 21, 1],
    votes: 312,
    tags: ["Control", "Tournament ready"],
    description: [
      "This is the stock Six Paths list, tuned for a field full of cheap Characters. Pain — Deva Path gains 1 chakra once per turn whenever an opponent's Character is defeated, so every removal effect doubles as ramp. Animal Path searches out another Six Paths body, Konan's Paper Shuriken deals 1000 damage to each of the opponent's Characters, and the chakra you bank pays for an early Nagato or Planetary Devastation.",
      "Almighty Push is the reason to play the deck. It returns every Character with cost 2 or less to its owner's hand, which sends Karin, Hawk Summon, Hanabi Hyuga and most early Sage pieces back at once. Your own Animal Path and Preta Path bounce too, but that is a feature: replaying Animal Path searches again. Shikamaru Nara and Water Prison Jutsu keep their biggest threat tapped while you set up.",
      "Planetary Devastation taps all of the opponent's Characters and they stay tapped through their next turn, which is usually lethal once Nagato has brought back a defeated Six Paths body. Keep Preta Path up whenever you can afford it: negating a Jutsu aimed at a Six Paths Character protects the engine through the mid game.",
    ],
    matchupNotes: {
      "uzumaki-sage": "Cast Almighty Push the turn before they reach three Sage cards. Their cheap Uzumaki bodies go back to hand and Sage Mode never switches on.",
      "sand-gaara": "The rough one. Shukaku can't be defeated by Jutsu and walls Asura Path forever. Save Planetary Devastation to tap their Blockers for a single lethal swing.",
      "hyuga-gentle-fist": "Eight Trigrams Sixty-Four Palms shuts off the Leader's chakra gain for a full cycle. Expect it on your ramp turn and plan Nagato a turn later.",
    },
  },
  {
    slug: "masked-man-pain",
    name: "Masked Man Pain",
    archetypeId: "akatsuki-pain",
    author: "scroll-keeper",
    createdAt: "2026-08-14",
    leaderId: "NT02-L02",
    cards: [
      ["NT02-009", 3], ["NT02-010", 4], ["NT02-011", 4], ["NT02-012", 4], ["NT02-013", 2], ["NT02-014", 3],
      ["NT02-015", 1], ["NT02-016", 2], ["NT04-004", 3], ["NT01-040", 4], ["NT01-041", 4], ["NT02-038", 4],
      ["NT01-037", 3], ["NT02-039", 2], ["NT01-044", 2], ["NT02-036", 1], ["NT01-042", 2], ["NT02-040", 2],
    ],
    keyCardIds: ["NT02-010", "NT02-011", "NT02-014"],
    record: [27, 20, 0],
    votes: 146,
    tags: ["Spicy", "Tech"],
    description: [
      "Fourth Great Ninja War gave Pain a proactive threat. Obito Uchiha — Masked Man cannot be blocked and makes the opponent discard a card when played, so this version trims a Planetary Devastation and the slow Invasion of Konoha copies for three Obito and a faster Six Paths curve.",
      "The early game is unchanged: Animal Path searches for a Six Paths Character with cost 3 or less, Asura Path deals 1000 damage to the defender before every attack, and Konan clears 1000-power bodies. Four Preta Path keep Rasengan and Chidori off your key pieces. Fire Style: Fireball Jutsu helps you defeat two Characters in one turn for Chunin Exam Preliminaries, so the mission's extra chakra stacks on top of the Deva Path's.",
      "From the mid game on, Obito is the clock. An unblockable 6000-power attacker means Blocker decks can't stall you, and the discard trims the counters they were holding. Nagato remains the late-game reset, bringing back the Asura Path or Preta Path that died along the way.",
    ],
    matchupNotes: {
      "sand-gaara": "Obito is the reason to play this version: Shukaku and Matsuri can't block him. Still a tough matchup, but you finally have a real clock.",
      "uzumaki-sage": "Same plan as stock Pain. Almighty Push the turn before Sage Mode, then Obito to strip a Rasengan.",
      "uchiha-avenger": "Keep Preta Path up to negate Chidori on Animal Path, and don't overcommit cheap bodies into Kirin.",
    },
  },
  {
    slug: "kazekage-wall",
    name: "Kazekage Wall",
    archetypeId: "sand-gaara",
    author: "sandstorm-sol",
    createdAt: "2026-06-02",
    leaderId: "NT03-L02",
    cards: [
      ["NT03-009", 4], ["NT03-010", 4], ["NT03-011", 2], ["NT03-012", 4], ["NT03-013", 4], ["NT03-014", 4],
      ["NT03-015", 4], ["NT03-016", 3], ["NT01-040", 4], ["NT01-041", 4], ["NT03-035", 3], ["NT01-038", 3],
      ["NT02-039", 3], ["NT01-042", 2], ["NT03-037", 2],
    ],
    keyCardIds: ["NT03-011", "NT03-014", "NT03-015"],
    record: [38, 22, 2],
    votes: 268,
    tags: ["Control", "Tournament ready"],
    description: [
      "The Kazekage list I have been grinding since Kage Summit. Gaara — Fifth Kazekage takes 1000 less damage from each attack and gives Sand Characters +1000 power while defending, so even Matsuri and Yashamaru trade above their cost. The deck wants the opponent to attack, because every attacker that taps is a target for Sand Coffin.",
      "The early turns are about Blockers: Matsuri on turn one, Baki to deal 1000 damage to anything that runs into him, and Temari to return a Character with cost 2 or less. Ultimate Absolute Defense: Shield of Shukaku negates the one attack you can't block, and Defend Sunagakure draws two once you have blocked three attacks in a turn cycle, which is easy against go-wide decks.",
      "Shukaku is the finisher. It is a 9000-power Blocker that cannot be defeated by Jutsu, so most removal suites simply can't answer it. Water Prison Jutsu and Darui tap the opponent's best Character on your own turn, setting up Sand Coffin without waiting for them to attack.",
    ],
    matchupNotes: {
      "akatsuki-pain": "Our best matchup. Almighty Push only bounces Matsuri and Yashamaru, and Shukaku shrugs off everything else. Sand Coffin each Asura Path after it attacks.",
      "hyuga-gentle-fist": "Brutal. Neji Hyuga's attack turns off Sand Coffin and Shield of Shukaku for the turn. Tap Neji with Water Prison Jutsu on your turn and Sand Coffin it.",
      "uchiha-avenger": "Chidori picks off the small Blockers. Mulligan for Shield of Shukaku and get Shukaku down: Kirin can't touch it.",
      "taijutsu-lee": "Their attackers tap straight into Sand Coffin and Baki, and Lee can't play non-Taijutsu Jutsu that cost 3 or more, so there is no removal to break the wall.",
    },
  },
  {
    slug: "budget-sand-fortress",
    name: "Budget Sand Fortress",
    archetypeId: "sand-gaara",
    author: "budget-brewer",
    createdAt: "2026-09-03",
    leaderId: "NT03-L02",
    cards: [
      ["NT03-009", 3], ["NT03-010", 4], ["NT03-012", 4], ["NT03-013", 4], ["NT03-014", 4], ["NT03-015", 3],
      ["NT03-016", 4], ["NT03-035", 2], ["NT01-040", 4], ["NT01-041", 4], ["NT01-038", 4], ["NT04-005", 3],
      ["NT02-039", 3], ["NT01-042", 2], ["NT01-043", 2],
    ],
    keyCardIds: ["NT03-014", "NT03-016", "NT03-010"],
    record: [29, 23, 1],
    votes: 121,
    tags: ["Budget", "Beginner friendly", "Control"],
    description: [
      "Kazekage control without the secret rare. Shukaku is the finisher in most lists, but this version wins on card advantage instead: Defend Sunagakure draws two cards every time you block three attacks in a turn cycle, and Rescue the Kazekage draws two more once you restore 5000 power to your Leader in a single turn.",
      "Healing is the glue. Allied Shinobi Medic restores 2000 power to your Leader when played and Yashamaru restores 2000 when defeated, so a turn with both completes most of Rescue the Kazekage. Choji Akimichi is the budget Shukaku: a 5000-power body that gets +2000 while defending.",
      "Removal is Sand Coffin plus Water Prison Jutsu. Water Prison taps a Character and keeps it tapped through its owner's next turn, which turns Sand Coffin into a two-card answer to anything, including threats that never attack into your Blockers. Apart from the Leader, Temari, Sand Coffin and Shield of Shukaku, the whole list is commons and uncommons.",
    ],
    matchupNotes: {
      "akatsuki-pain": "Konan's Paper Shuriken only kills Matsuri. Keep Water Prison Jutsu and Sand Coffin for Nagato.",
      "taijutsu-lee": "Block everything, heal the Leader and draw off Defend Sunagakure. Rock Lee can't play non-Taijutsu Jutsu that cost 3 or more to break through.",
      "hyuga-gentle-fist": "Hard. Neji Hyuga shuts off Sand Coffin when he attacks, so tap him first with Water Prison Jutsu.",
    },
  },
  {
    slug: "myoboku-value-sage",
    name: "Myoboku Value Sage",
    archetypeId: "uzumaki-sage",
    author: "toadsage-tomo",
    createdAt: "2026-05-09",
    leaderId: "NT03-L01",
    cards: [
      ["NT03-001", 4], ["NT03-002", 4], ["NT03-003", 3], ["NT03-004", 3], ["NT03-005", 3], ["NT03-006", 4],
      ["NT03-007", 3], ["NT03-008", 3], ["NT01-041", 4], ["NT01-040", 4], ["NT01-035", 2], ["NT01-036", 3],
      ["NT03-034", 3], ["NT01-042", 3], ["NT01-037", 2], ["NT01-043", 2],
    ],
    keyCardIds: ["NT03-004", "NT03-003", "NT03-007"],
    record: [41, 27, 2],
    votes: 287,
    tags: ["Tournament ready", "Beginner friendly"],
    description: [
      "The stock Sage list, built for consistency. Naruto Uzumaki — Sage of Mount Myoboku gets +2000 power and draws an extra card each turn once you have three Sage cards in play, and everything in the deck is either a Sage piece, a way to find one, or a way to spend the extra cards.",
      "Fukasaku & Shima is the engine: it searches your deck for a Sage card when played, and Summoning Jutsu finds Fukasaku & Shima because it is a cost-3 Summon. Train at Mount Myoboku completes at three Sage cards and tutors any card, usually Gamabunta or Sage Art: Massive Rasengan. Shadow Clone Jutsu smooths your draws and turns on Naruto Uzumaki — Shadow Clone Army's extra card.",
      "In the mid game, Rasengan deals 4000 damage for two chakra, Gamabunta returns a Character with cost 4 or less, and Minato Namikaze attacks the turn he lands and returns to your hand instead of being defeated once per turn. Kushina Uzumaki's Adamantine Chains stops the opponent's best Character from attacking or blocking, which is how you push through Blockers.",
    ],
    matchupNotes: {
      "uchiha-avenger": "Slightly ahead. Minato dodges Chidori and Rasengan trades with every Taka body.",
      "akatsuki-pain": "Rough. Almighty Push sends your cheap Uzumaki back to hand, so lead with Fukasaku & Shima and Kushina Uzumaki, which cost 3 or more.",
      "itachi-tsukuyomi": "Our worst matchup. End your turns below five cards in hand so Itachi's Leader can't force a discard.",
    },
  },
  {
    slug: "kurama-link-aggro",
    name: "Kurama Link Aggro",
    archetypeId: "uzumaki-sage",
    author: "rogue-ronin",
    createdAt: "2026-07-26",
    leaderId: "NT04-L01",
    cards: [
      ["NT03-001", 4], ["NT03-002", 4], ["NT03-004", 3], ["NT03-005", 3], ["NT03-006", 4], ["NT03-007", 2],
      ["NT03-008", 2], ["NT04-001", 2], ["NT04-006", 3], ["NT01-041", 4], ["NT01-040", 4], ["NT01-036", 4],
      ["NT01-035", 2], ["NT03-003", 1], ["NT01-042", 2], ["NT01-043", 2], ["NT03-034", 2], ["NT01-044", 2],
    ],
    keyCardIds: ["NT03-001", "NT03-004", "NT03-006"],
    record: [22, 18, 0],
    votes: 94,
    tags: ["Aggro", "Spicy"],
    description: [
      "Naruto Uzumaki — Kurama Link Mode turns Sage into an aggro deck. Once per turn, when you play a Sage or Uzumaki card, all of your Characters get +1000 power until end of turn. Naruto Uzumaki — Shadow Clone Army, Kushina Uzumaki, Rasengan and Fukasaku & Shima all trigger it, so every attack is bigger than it looks.",
      "The curve is low on purpose: four Konohamaru Sarutobi stop a cheap Blocker from blocking, Naruto Uzumaki — Shadow Clone Army comes down on two, and Minato Namikaze attacks the turn he is played. Flying Thunder God returns one of your Characters to your hand and plays a cost-4-or-less Character for free, which lets you re-use on-play effects like Kushina's Adamantine Chains in the same turn.",
      "Kurama — Nine-Tails is the top end: a 10000-power Character that cannot be blocked by Characters with cost 4 or less. With two copies plus a single Gamabunta you rarely need them; most games end with a pumped alpha strike before the opponent stabilizes.",
    ],
    matchupNotes: {
      "sand-gaara": "Konohamaru and Kushina get you past Matsuri and Shukaku for a turn. Attack with Minato so Sand Coffin never finds a target that sticks.",
      "akatsuki-pain": "Almighty Push is a nightmare for the cheap curve. Hold Kushina and Minato back until Push has been cast.",
      "itachi-tsukuyomi": "Still unfavored, but the low curve helps: dump your hand before Tsukuyomi and the Leader discard come online.",
    },
  },
  {
    slug: "kirin-storm",
    name: "Kirin Storm",
    archetypeId: "uchiha-avenger",
    author: "lightning-lev",
    createdAt: "2026-06-20",
    leaderId: "NT02-L01",
    cards: [
      ["NT02-001", 4], ["NT02-002", 4], ["NT02-003", 4], ["NT02-004", 3], ["NT02-005", 4], ["NT02-006", 4],
      ["NT02-007", 2], ["NT02-008", 3], ["NT01-040", 4], ["NT01-041", 4], ["NT02-038", 4], ["NT01-042", 3],
      ["NT02-040", 2], ["NT01-044", 2], ["NT02-037", 2], ["NT01-035", 1],
    ],
    keyCardIds: ["NT02-007", "NT02-006", "NT02-001"],
    record: [36, 24, 0],
    votes: 241,
    tags: ["Combo", "Tournament ready"],
    description: [
      "Kirin is the best removal Jutsu in the format if you build for it. It defeats up to two Characters but can only be played if you already played a Lightning Jutsu this turn, so the list runs four Chidori and treats them as both removal and Kirin enabler. Sasuke Uchiha — Avenger gives the Leader +2000 power every time you play a Lightning Jutsu, so a Chidori into Kirin turn also hits hard.",
      "Card flow carries you to that turn. Karin looks at the top three cards of your deck and adds a Taka card, Hawk Summon attacks the turn it is played and draws when it attacks, and Retrieve the Forbidden Scroll draws a card as soon as you play two Jutsu in one turn, which the Kirin turn always does.",
      "Jugo gets +1000 power for each other Taka Character you control when he attacks, and Hunt for Itachi gives the Leader +3000 once three Taka are on the field. Suigetsu Hozuki can't be defeated in battle by Characters with 4000 power or less, which makes him the ideal Blocker against Hyuga and Jonin.",
    ],
    matchupNotes: {
      "sand-gaara": "Great matchup. Chidori kills every Sand Blocker except Shukaku, and Gaara has almost no clock.",
      "medical-ninja": "Chidori and Kirin defeat rather than deal damage, so Tsunade's healing does nothing. Save Kirin for Katsuyu.",
      "uzumaki-sage": "Slightly behind. Minato returns to hand instead of being defeated, so don't waste Chidori on him.",
    },
  },
  {
    slug: "kotoamatsukami-taka",
    name: "Kotoamatsukami Taka",
    archetypeId: "uchiha-avenger",
    author: "lightning-lev",
    createdAt: "2026-09-21",
    leaderId: "NT02-L01",
    cards: [
      ["NT02-001", 4], ["NT02-002", 4], ["NT02-003", 4], ["NT02-004", 2], ["NT02-005", 4], ["NT02-006", 4],
      ["NT02-007", 2], ["NT02-008", 2], ["NT04-003", 3], ["NT01-040", 4], ["NT01-041", 4], ["NT02-038", 3],
      ["NT04-008", 3], ["NT01-042", 2], ["NT02-040", 2], ["NT01-036", 3],
    ],
    keyCardIds: ["NT02-006", "NT02-005", "NT02-001"],
    record: [25, 19, 1],
    votes: 133,
    tags: ["Tech", "Aggro"],
    description: [
      "An aggressive Taka update for the Fourth Great Ninja War format. Shisui Uchiha's Kotoamatsukami takes control of an opponent's Character with cost 2 or less until end of turn when played, removing a Blocker and adding an attacker in one card. Together with Hawk Summon, which attacks the turn it is played, the list takes big chunks out of the Leader before control decks stabilize.",
      "Mind Transmission Jutsu replaces most of the Transformation Jutsu: for one chakra you look at the opponent's hand and draw a card, so you know whether Kirin will run into Preta Path or a Shield of Shukaku. Konohamaru Sarutobi stops a cheap Blocker from blocking, which is often the last few points of damage.",
      "The trade-off is fewer Jugo and only two Hunt for Itachi, so the deck has fewer late-game swings than Kirin Storm. Mulligan for Karin, Hawk Summon and Chidori and stay on the attack.",
    ],
    matchupNotes: {
      "sand-gaara": "Shisui steals Matsuri for a turn and Konohamaru stops another Blocker. You are much faster than Gaara can set up.",
      "medical-ninja": "Defeat effects ignore healing. Chidori Shizune on sight.",
      "hyuga-gentle-fist": "Even. Play Chidori on your own turn before Neji Hyuga can attack and lock you out of Jutsu.",
    },
  },
  {
    slug: "budget-byakugan",
    name: "Budget Byakugan",
    archetypeId: "hyuga-gentle-fist",
    author: "byakugan-bea",
    createdAt: "2026-05-27",
    leaderId: "NT01-L03",
    cards: [
      ["NT01-018", 4], ["NT01-019", 2], ["NT01-020", 4], ["NT01-021", 4], ["NT01-022", 4], ["NT01-023", 4],
      ["NT01-024", 4], ["NT01-025", 4], ["NT01-040", 4], ["NT01-039", 3], ["NT01-036", 3], ["NT01-035", 3],
      ["NT01-043", 3], ["NT01-041", 4],
    ],
    keyCardIds: ["NT01-023", "NT01-018", "NT01-022"],
    record: [33, 25, 0],
    votes: 176,
    tags: ["Budget", "Beginner friendly"],
    description: [
      "Hyuga is the cheapest competitive deck in the format, and this list proves it. Hinata Hyuga — Byakugan Heiress makes the opponent play with the top card of their deck revealed and gives your Hyuga Characters +1000 power while attacking. Knowing their next draw means you always know whether to trade or hold back.",
      "Hinata Hyuga — Twin Lion Fists gets +2000 power when attacking while the opponent's top card is revealed, which is always true with this Leader. Neji Hyuga stops the opponent from playing Jutsu for the rest of the turn once he attacks, so lead with Neji and the rest of your attackers connect without fear of Substitution Jutsu.",
      "Eight Trigrams Sixty-Four Palms is the trump card: for two chakra, the opponent's Leader can't activate abilities until the end of their next turn. Save it for the turn their Leader matters most: Gaara's damage reduction, the Deva Path's chakra or Sage Mode's extra draw. Protect the Byakugan and Hanabi Hyuga keep the cards flowing, and Eight Trigrams Palm Rotation negates an attack on your key Hyuga.",
    ],
    matchupNotes: {
      "sand-gaara": "Favored. Attack with Neji first so they can't cast Sand Coffin or Shield of Shukaku, then Sixty-Four Palms their Leader.",
      "akatsuki-pain": "Slightly favored. Sixty-Four Palms on their ramp turn delays Nagato, and the revealed top card shows you Almighty Push coming.",
      "uchiha-avenger": "Coin flip. Chidori kills everything we have, so spread threats and keep Ko Hyuga back as a Blocker.",
    },
  },
  {
    slug: "branch-prodigy-lock",
    name: "Branch Prodigy Lock",
    archetypeId: "hyuga-gentle-fist",
    author: "byakugan-bea",
    createdAt: "2026-08-30",
    leaderId: "NT04-L02",
    cards: [
      ["NT01-018", 4], ["NT01-019", 4], ["NT01-020", 4], ["NT01-021", 4], ["NT01-022", 2], ["NT01-023", 4],
      ["NT01-024", 4], ["NT01-025", 3], ["NT01-040", 4], ["NT01-039", 3], ["NT04-008", 3], ["NT01-036", 2],
      ["NT01-042", 2], ["NT01-041", 3], ["NT01-037", 2], ["NT01-043", 2],
    ],
    keyCardIds: ["NT01-023", "NT01-024", "NT01-018"],
    record: [30, 19, 1],
    votes: 204,
    tags: ["Tournament ready", "Tech"],
    description: [
      "Neji Hyuga — Branch Prodigy makes your Hyuga Jutsu cost one less, which turns Eight Trigrams Sixty-Four Palms into a one-chakra Leader lock and Eight Trigrams Palm Rotation into a free counter. You give up Hinata's permanent reveal, but the Leader still lets you look at the top card of the opponent's deck once per turn.",
      "With the cost reduction you can develop and hold up protection in the same turn: Hiashi Hyuga with Palm Rotation up for free, or Neji Hyuga with Sixty-Four Palms ready for one. Hinata Hyuga — Twin Lion Fists drops to two copies, because its +2000 needs a revealed top card and this Leader doesn't provide one.",
      "Mind Transmission Jutsu is the tech: look at the opponent's hand and draw a card for one chakra, so you see Almighty Push or Kirin before committing. Shikamaru Nara taps a Character with cost 4 or less when played, which clears the way for a Neji attack.",
    ],
    matchupNotes: {
      "sand-gaara": "Favored. One-chakra Sixty-Four Palms plus a Neji attack leaves them with no Leader ability and no Jutsu.",
      "uzumaki-sage": "Fire Sixty-Four Palms the turn they reach three Sage cards and race the Toads.",
      "akatsuki-pain": "Mind Transmission tells you when Almighty Push is in hand. Keep cheap Hyuga in hand until it has been cast.",
    },
  },
  {
    slug: "slug-princess-stall",
    name: "Slug Princess Stall",
    archetypeId: "medical-ninja",
    author: "sandstorm-sol",
    createdAt: "2026-07-30",
    leaderId: "NT01-L02",
    cards: [
      ["NT01-009", 4], ["NT01-010", 4], ["NT01-011", 2], ["NT01-012", 4], ["NT01-013", 3], ["NT01-014", 3],
      ["NT01-015", 4], ["NT01-016", 3], ["NT01-017", 3], ["NT01-040", 4], ["NT01-038", 3], ["NT01-041", 3],
      ["NT04-005", 3], ["NT04-010", 2], ["NT01-037", 2], ["NT01-035", 2], ["NT03-035", 1],
    ],
    keyCardIds: ["NT01-011", "NT01-016", "NT01-015"],
    record: [28, 24, 2],
    votes: 87,
    tags: ["Control", "Anti-meta"],
    description: [
      "Medical Ninja is the deck that makes damage-based strategies miserable. Tsunade — Fifth Hokage restores 1000 power to each of your Characters at the end of your turn and draws a card if you control three or more Medical Characters, so chip damage disappears and your hand never runs dry.",
      "Shizune searches for any Medical card, usually Katsuyu or Strength of a Hundred Seal. Sakura Haruno and Mystical Palm Technique restore 2000 and 3000 power, Tonton draws a card when defeated, and Dan Kato restores 3000 power to your Leader on the way out. The Fourth Great Ninja War additions, Allied Shinobi Medic and Ino Yamanaka, are both Medical bodies for the Tsunade draw, and Ino's Mind Body Switch stops an attacker for a turn.",
      "Katsuyu is the lock piece: while it is on the field your other Characters cannot be defeated by Jutsu effects, which blanks Rasengan, Sand Coffin and Lightning Blade. Strength of a Hundred Seal gives your Leader +4000 power and stops it from being defeated for the turn, buying the extra turn you need.",
    ],
    matchupNotes: {
      "taijutsu-lee": "Our best matchup. Every Lee attack gets healed back at end of turn, and they can't play big Jutsu to break through.",
      "uchiha-avenger": "Bad. Chidori and Kirin defeat instead of dealing damage, so healing doesn't help. Rush Katsuyu down with Shizune.",
      "orochimaru-curse": "Unfavored. Kimimaro can't be blocked by Characters with cost 3 or less, and Curse Mark of Heaven outgrows our heals.",
    },
  },
  {
    slug: "copy-ninja-toolbox",
    name: "Copy Ninja Toolbox",
    archetypeId: "leaf-jonin",
    author: "copy-ninja-cal",
    createdAt: "2026-06-11",
    leaderId: "NT01-L01",
    cards: [
      ["NT01-001", 4], ["NT01-002", 4], ["NT01-003", 3], ["NT01-004", 4], ["NT01-005", 3], ["NT01-006", 4],
      ["NT01-007", 2], ["NT01-008", 3], ["NT01-040", 4], ["NT01-041", 3], ["NT01-037", 3], ["NT01-035", 3],
      ["NT02-038", 3], ["NT01-042", 3], ["NT01-039", 2], ["NT01-044", 2],
    ],
    keyCardIds: ["NT01-007", "NT01-006", "NT01-005"],
    record: [31, 27, 2],
    votes: 98,
    tags: ["Beginner friendly"],
    description: [
      "If you are new to the game, start here. Kakashi Hatake — Copy Ninja lets you pay 2 chakra to copy the effect of a Jutsu you play once per turn, so Lightning Blade becomes \"defeat two Characters with 5000 power or less\" for five chakra total. The rest of the list is honest Jonin that trade well and teach good habits.",
      "Ibiki Morino looks at the opponent's hand and makes them discard a Jutsu, Kurenai Yuhi stops their highest-power Character from attacking next turn, and Asuma Sarutobi deals 1000 damage to a Character every time he attacks. Yamato returns a Character with cost 3 or less to its owner's hand when played, a great tempo play against Taka and Hyuga.",
      "Kamui is the catch-all answer. It removes a Character from the game rather than defeating it, so it handles Shukaku, Katsuyu-protected boards and Minato Namikaze's return clause alike. Squad Seven Reunion draws two once you control three Team 7 or Jonin Characters, which this deck does by the mid game.",
    ],
    matchupNotes: {
      "sand-gaara": "Kamui answers Shukaku. Copy Lightning Blade to clear two Blockers before you attack.",
      "uzumaki-sage": "Kamui gets around Minato's return clause, and Ibiki can take their Rasengan early.",
      "puppet-brigade": "Unfavored: they recur everything you defeat. Kamui on Chiyo is your best play.",
    },
  },
  {
    slug: "tsukuyomi-discard-lock",
    name: "Tsukuyomi Discard Lock",
    archetypeId: "itachi-tsukuyomi",
    author: "scroll-keeper",
    createdAt: "2026-07-04",
    leaderId: "NT02-L04",
    cards: [
      ["NT02-027", 4], ["NT02-028", 4], ["NT02-029", 3], ["NT02-030", 3], ["NT02-031", 4], ["NT02-032", 4],
      ["NT02-033", 3], ["NT02-034", 2], ["NT02-035", 3], ["NT01-040", 4], ["NT02-038", 3], ["NT01-041", 3],
      ["NT02-039", 3], ["NT01-042", 2], ["NT02-040", 2], ["NT02-036", 1], ["NT02-037", 2],
    ],
    keyCardIds: ["NT02-032", "NT02-033", "NT02-034"],
    record: [35, 23, 1],
    votes: 223,
    tags: ["Control", "Tournament ready"],
    description: [
      "Itachi Uchiha — Akatsuki punishes full hands: at the start of your turn, if the opponent has five or more cards in hand, they discard one. This list is built to make that trigger and Tsukuyomi hurt as much as possible while sturdy Akatsuki bodies hold the board.",
      "Zetsu looks at the opponent's hand when played, so you know exactly what Tsukuyomi might hit, and two random discards are brutal against decks that sandbag counters. Kisame Hoshigaki makes the opponent lose a chakra whenever he battles, Hidan can't be defeated by damage from Jutsu, and Kakuzu grows by 1000 every time one of their Characters is defeated. Deidara deals 3000 damage when defeated, so trading with him is rarely a good deal for them.",
      "Amaterasu defeats a Character and it can never return to the field this game, which shuts off recursion from Nagato, Chiyo and Field Hospital. Susanoo gives your Leader +5000 power and protection from targeting until your next turn, the safest way to close a game. Capture the Jinchuriki draws two after you defeat a Character with cost 5 or more.",
    ],
    matchupNotes: {
      "uzumaki-sage": "Our best matchup. Their extra draws put them over five cards for the Leader trigger almost every turn.",
      "taijutsu-lee": "The worst. Lee empties his hand early and attacks before discard matters. Keep Deidara and Hidan back to trade.",
      "puppet-brigade": "Amaterasu answers Chiyo permanently, so save it for her.",
    },
  },
  {
    slug: "icha-icha-toad-flood",
    name: "Icha Icha Toad Flood",
    archetypeId: "sannin-summons",
    author: "toadsage-tomo",
    createdAt: "2026-06-28",
    leaderId: "NT03-L03",
    cards: [
      ["NT03-017", 4], ["NT03-018", 4], ["NT03-019", 4], ["NT03-020", 3], ["NT03-021", 3], ["NT03-022", 3],
      ["NT03-023", 3], ["NT03-024", 4], ["NT03-034", 4], ["NT01-040", 4], ["NT01-041", 4], ["NT01-042", 3],
      ["NT01-035", 2], ["NT02-038", 2], ["NT01-037", 2], ["NT01-043", 1],
    ],
    keyCardIds: ["NT03-021", "NT03-023", "NT03-022"],
    record: [24, 22, 0],
    votes: 112,
    tags: ["Combo", "Spicy"],
    description: [
      "Jiraiya — Toad Sage reduces the cost of one Summon Character you play each turn by 2, and this list floods the board with Toads to take advantage. Gamakichi makes your next Summon cost 1 less on top of that, so a one-chakra Gamahiro is a real play.",
      "Research for the Icha Icha Series completes when you play two Summon Characters in one turn and draws two, which this deck does almost every turn. Summoning Jutsu searches out any Summon with cost 4 or less, and Hiruzen Sarutobi — The Professor finds whichever Sannin or Summon card you are missing.",
      "The finishers are board-wide Jutsu: Summoning: Toad Mouth Trap taps all of the opponent's Characters with cost 3 or less, and Sage Art: Goemon deals 3000 damage to each opponent's Character. Gamaken gets +2000 power while defending and keeps your Leader safe while you set up.",
    ],
    matchupNotes: {
      "akatsuki-pain": "Rough. Konan and Almighty Push wipe out the cheap Toads. Hold Gamakichi and Gamatatsu until Push has been cast.",
      "leaf-jonin": "Favored: they can't trade with a board this wide. Toad Mouth Trap taps Kurenai and Ibiki in one go.",
      "sand-gaara": "Goemon clears Matsuri and Yashamaru in one shot, then Toad Mouth Trap keeps Baki from blocking.",
    },
  },
  {
    slug: "edo-tensei-curse-mark",
    name: "Edo Tensei Curse Mark",
    archetypeId: "orochimaru-curse",
    author: "puppetmaster-ines",
    createdAt: "2026-08-07",
    leaderId: "NT02-L03",
    cards: [
      ["NT02-017", 4], ["NT02-018", 3], ["NT02-019", 4], ["NT02-020", 3], ["NT02-021", 3], ["NT02-022", 4],
      ["NT02-023", 2], ["NT02-024", 4], ["NT02-025", 3], ["NT02-026", 3], ["NT01-040", 4], ["NT01-041", 3],
      ["NT04-007", 2], ["NT02-038", 3], ["NT02-039", 2], ["NT01-042", 2], ["NT02-040", 1],
    ],
    keyCardIds: ["NT02-018", "NT02-024", "NT02-023"],
    record: [26, 21, 0],
    votes: 139,
    tags: ["Combo", "Spicy"],
    description: [
      "Orochimaru — Snake Sannin lets you defeat one of your own Characters once per turn to search your deck for a Curse Mark card. The Sound Four are perfect fodder: Sakon & Ukon can be played again from the trash for 2 chakra when defeated, and Tayuya, Jirobo and Kidomaru all get their on-play effects in before you sacrifice them.",
      "Kabuto Yakushi searches for a Sound Four Character, so the engine starts early. Curse Mark of Heaven gives a Curse Mark Character +3000 power, and Kimimaro, who can't be blocked by Characters with cost 3 or less, turns that into a huge unblockable hit most turns. Seek Immortality returns a Curse Mark Character from your trash once five Curse Mark cards are there.",
      "Edo Tensei is the new toy. For five chakra you play up to two Characters from any trash under your control, usually Kimimaro and Manda from yours or the opponent's best defeated threat, and they are defeated at end of turn. That defeat triggers Sakon & Ukon again and fills the trash for Seek Immortality.",
    ],
    matchupNotes: {
      "medical-ninja": "Favored. Kimimaro walks past their small Blockers and Curse Mark of Heaven outgrows the heals.",
      "itachi-tsukuyomi": "The hardest matchup: Tsukuyomi and the Leader discard hit your tutored cards before you can play them.",
      "akatsuki-pain": "Almighty Push bounces Tayuya, but the rest of the Sound Four cost 3. Keep Summoning: Triple Rashomon up for their big swing.",
    },
  },
  {
    slug: "gateless-lee-rush",
    name: "Gateless Lee Rush",
    archetypeId: "taijutsu-lee",
    author: "budget-brewer",
    createdAt: "2026-05-21",
    leaderId: "NT01-L04",
    cards: [
      ["NT01-026", 4], ["NT01-027", 4], ["NT01-028", 4], ["NT01-029", 4], ["NT01-030", 4], ["NT01-031", 4],
      ["NT01-032", 4], ["NT01-034", 3], ["NT01-040", 4], ["NT01-039", 4], ["NT01-036", 4], ["NT01-043", 3],
      ["NT01-035", 2], ["NT01-041", 2],
    ],
    keyCardIds: ["NT01-026", "NT01-029", "NT01-028"],
    record: [32, 26, 0],
    votes: 158,
    tags: ["Aggro", "Beginner friendly"],
    description: [
      "Plenty of Taijutsu lists still run Eight Gates: Gate of Death, but at five chakra it is a dead draw in the opening hand of a deck that wants the game decided by turn five. This list cuts both copies for more cheap attackers. Remember that Rock Lee — Splendid Taijutsu still bans every Jutsu that costs 3 or more unless it is Taijutsu, so cheap tricks are all you get anyway.",
      "Your Characters can attack the turn they are played, so every drop is immediate damage. Rock Lee — Weights Off and Ninja Tortoise come down on turn one (the Tortoise searches out a Team Guy Character with cost 2 or less), Rock Lee — Drunken Fist can't be targeted by Jutsu that cost 2 or less, and Might Guy swings for 6000 the turn he lands. Leaf Hurricane and Primary Lotus are the only Jutsu you need.",
      "Might Duy gives your Taijutsu Characters +2000 power when defeated, so let him trade first. Five Hundred Laps of Konoha untaps your Leader after three attacks in a turn, which this curve does easily, and the extra Leader attack is often lethal. Konohamaru Sarutobi stops a cheap Blocker from blocking at the critical moment.",
    ],
    matchupNotes: {
      "itachi-tsukuyomi": "Our best matchup. You empty your hand before the Leader discard or Tsukuyomi matter.",
      "sand-gaara": "Very hard. Every attacker taps into Sand Coffin and Baki punishes blocks. Konohamaru on Matsuri is your only window.",
      "medical-ninja": "Tsunade heals your damage every turn. You have to win before Katsuyu lands, and usually can't.",
    },
  },
  {
    slug: "hundred-puppets-recursion",
    name: "Hundred Puppets Recursion",
    archetypeId: "puppet-brigade",
    author: "puppetmaster-ines",
    createdAt: "2026-06-06",
    leaderId: "NT03-L04",
    cards: [
      ["NT03-025", 4], ["NT03-026", 4], ["NT03-027", 4], ["NT03-028", 3], ["NT03-029", 4], ["NT03-030", 3],
      ["NT03-031", 4], ["NT03-032", 2], ["NT03-033", 3], ["NT01-040", 4], ["NT01-041", 3], ["NT01-035", 2],
      ["NT01-042", 3], ["NT02-039", 2], ["NT02-038", 2], ["NT01-037", 2], ["NT02-037", 1],
    ],
    keyCardIds: ["NT03-032", "NT03-030", "NT03-029"],
    record: [23, 21, 1],
    votes: 64,
    tags: ["Combo"],
    description: [
      "Sasori of the Red Sand makes your Puppet Characters impossible to defeat in battle during the opponent's turn, so every Puppet is a safe Blocker. The plan is to trade Puppets freely on your turn, block with them on theirs, and rebuild the whole board with Red Secret Technique: Performance of a Hundred Puppets, which plays up to three Puppet Characters from your trash.",
      "Kankuro searches for a Puppet when played, Crow deals 1000 damage when defeated, Black Ant taps the attacker when it blocks, and Salamander takes no damage from Jutsu. Hiruko gets +2000 power while defending, and with the Leader it holds off nearly any attack. Infiltrate the Puppet Workshop draws a card and ramps once three Puppets are out.",
      "Chiyo returns a defeated Character to the field when played, so she is a second copy of whatever you lost. The deck beats one-for-one removal but hates permanent answers: Amaterasu and Kamui both take a Character away for good, so bait them before committing Chiyo.",
    ],
    matchupNotes: {
      "leaf-jonin": "Favored. Lightning Blade just refills our trash for Performance of a Hundred Puppets; only Kamui is a real answer.",
      "itachi-tsukuyomi": "Amaterasu is permanent. Bait it with Kankuro before playing Chiyo.",
      "akatsuki-pain": "Konan pings Crow, which pings back. Almighty Push only bounces our cost-2 Puppets.",
    },
  },
  {
    slug: "eight-tails-allied-forces",
    name: "Eight-Tails Allied Forces",
    archetypeId: "rogue",
    author: "rogue-ronin",
    createdAt: "2026-10-05",
    leaderId: "NT04-L03",
    cards: [
      ["NT04-002", 4], ["NT03-036", 3], ["NT02-036", 3], ["NT01-038", 4], ["NT04-001", 2], ["NT04-003", 2],
      ["NT03-037", 4], ["NT04-010", 3], ["NT04-005", 3], ["NT01-040", 4], ["NT01-041", 4], ["NT04-008", 3],
      ["NT02-039", 2], ["NT02-038", 2], ["NT04-009", 4], ["NT01-037", 3],
    ],
    keyCardIds: ["NT04-002", "NT04-001", "NT04-009"],
    record: [18, 14, 1],
    votes: 72,
    tags: ["Anti-meta", "Spicy"],
    description: [
      "Killer B — Eight-Tails Jinchuriki says your Characters with 5000+ power cannot be targeted by Jutsu that cost 2 or less. That blanks Chidori, Rasengan, Fire Style: Fireball Jutsu and Primary Lotus, most of the cheap removal in the current meta, so this brew is built almost entirely from Characters with 5000 power or more.",
      "Choji Akimichi and Shisui Uchiha are the four-drops, then Killer B, Mei Terumi — Fifth Mizukage and Zabuza Momochi at five. Killer B draws a card for each opponent's Character with 5000+ power, Mei deals 2000 damage to each opposing Character with cost 2 or less, and Zabuza can't be blocked on your first attack each turn. Darui taps a Character to clear the way, and Ino Yamanaka stops an attacker while you climb the curve.",
      "Allied Shinobi Forces HQ draws two once you control Characters from three different villages, and the list mixes Cloud, Mist, Leaf and Allied bodies on purpose. Kurama — Nine-Tails tops the curve at 10000 power and can't be blocked by anything with cost 4 or less.",
    ],
    matchupNotes: {
      "uchiha-avenger": "Chidori and Fireball can't target the big bodies. Kirin costs 5 and still can, so spread across several threats rather than one.",
      "uzumaki-sage": "Rasengan can't target anything that matters. Sage Art: Massive Rasengan still can, so bait it with Choji.",
      "akatsuki-pain": "Almighty Push only bounces Ino and the Medic, but Planetary Devastation taps everything. Hold Shisui for the turn after.",
    },
  },
];

/** All community decks, newest first. */
export const COMMUNITY_DECKS: readonly DeckDetail[] = SPECS.map(communityDeck).sort(
  (a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
);
