import type { CardType, NarutoCard, Rarity } from "@naruto-tcg/types";

/**
 * Mock card pool for the platform's seed data. Four sets, ~150 cards.
 * Card ids are `<set>-<number>`; Leaders use an `L` number prefix.
 */

export interface CardSet {
  code: string;
  name: string;
  /** ISO date the set became tournament legal. */
  releaseDate: string;
}

export const SETS: readonly CardSet[] = [
  { code: "NT01", name: "Will of Fire", releaseDate: "2025-11-14" },
  { code: "NT02", name: "Shadows of the Akatsuki", releaseDate: "2026-02-13" },
  { code: "NT03", name: "Kage Summit", releaseDate: "2026-04-24" },
  { code: "NT04", name: "Fourth Great Ninja War", releaseDate: "2026-07-17" },
];

type Row = [
  number: string,
  name: string,
  type: CardType,
  cost: number | null,
  power: number | null,
  village: string,
  rarity: Rarity,
  traits: string[],
  text: string,
];

function set(code: string, rows: Row[]): NarutoCard[] {
  return rows.map(([number, name, type, cost, power, village, rarity, traits, text]) => ({
    id: `${code}-${number}`,
    name,
    set: code,
    number,
    type,
    rarity,
    village,
    ...(cost === null ? {} : { cost }),
    ...(power === null ? {} : { power }),
    traits,
    text,
  }));
}

const L = "leader" as const;
const C = "character" as const;
const J = "jutsu" as const;
const M = "mission" as const;

export const CARDS: readonly NarutoCard[] = [
  ...set("NT01", [
    ["L01", "Kakashi Hatake — Copy Ninja", L, null, 5000, "Leaf", "super-rare", ["Jonin", "Team 7", "Sharingan"], "Once per turn, when you play a Jutsu, you may pay 2 chakra to copy its effect."],
    ["L02", "Tsunade — Fifth Hokage", L, null, 5000, "Leaf", "super-rare", ["Sannin", "Hokage", "Medical"], "At the end of your turn, restore 1000 power to each of your Characters. If you control 3+ Medical Characters, draw 1 card."],
    ["L03", "Hinata Hyuga — Byakugan Heiress", L, null, 4000, "Leaf", "super-rare", ["Hyuga"], "Your opponent plays with the top card of their deck revealed. Your Hyuga Characters get +1000 power while attacking."],
    ["L04", "Rock Lee — Splendid Taijutsu", L, null, 6000, "Leaf", "super-rare", ["Taijutsu", "Team Guy"], "You cannot play Jutsu that cost 3 or more. Your Characters can attack the turn they are played."],
    ["001", "Asuma Sarutobi", C, 4, 5000, "Leaf", "rare", ["Jonin"], "Trench Knives: When this attacks, deal 1000 damage to a Character."],
    ["002", "Kurenai Yuhi", C, 3, 3000, "Leaf", "uncommon", ["Jonin", "Genjutsu"], "When played, your opponent's highest-power Character cannot attack next turn."],
    ["003", "Yamato", C, 4, 4000, "Leaf", "rare", ["Jonin", "ANBU"], "Wood Release: When played, return a Character with cost 3 or less to its owner's hand."],
    ["004", "Anko Mitarashi", C, 3, 4000, "Leaf", "uncommon", ["Jonin"], "Striking Shadow Snakes: Can attack the turn it is played."],
    ["005", "Ibiki Morino", C, 2, 2000, "Leaf", "uncommon", ["Jonin", "Interrogation"], "When played, look at your opponent's hand and choose a Jutsu; they discard it."],
    ["006", "Lightning Blade", J, 3, null, "Leaf", "rare", ["Ninjutsu", "Lightning"], "Defeat a Character with 5000 power or less."],
    ["007", "Kamui", J, 5, null, "Leaf", "super-rare", ["Ninjutsu", "Sharingan"], "Remove a Character from the game. Its owner draws 1 card."],
    ["008", "Squad Seven Reunion", M, 2, null, "Leaf", "uncommon", ["Team 7"], "Complete: Control 3 Team 7 or Jonin Characters. Reward: Draw 2 cards."],
    ["009", "Sakura Haruno", C, 2, 2000, "Leaf", "rare", ["Medical", "Team 7"], "When played, restore 2000 power to a Character."],
    ["010", "Shizune", C, 2, 2000, "Leaf", "uncommon", ["Medical"], "When played, search your deck for a Medical card and add it to your hand."],
    ["011", "Katsuyu", C, 6, 6000, "Leaf", "super-rare", ["Summon", "Medical"], "Your other Characters cannot be defeated by Jutsu effects."],
    ["012", "Tonton", C, 1, 1000, "Leaf", "common", ["Animal"], "When defeated, draw 1 card."],
    ["013", "Dan Kato", C, 3, 3000, "Leaf", "uncommon", ["Medical"], "Spirit Transformation: When defeated, restore 3000 power to your Leader."],
    ["014", "Nawaki", C, 1, 1000, "Leaf", "common", ["Genin"], "When played, if your Leader is Tsunade, draw 1 card."],
    ["015", "Mystical Palm Technique", J, 1, null, "Leaf", "common", ["Medical", "Ninjutsu"], "Restore 3000 power to a Character or your Leader."],
    ["016", "Strength of a Hundred Seal", J, 4, null, "Leaf", "rare", ["Medical"], "Until end of turn, your Leader gets +4000 power and cannot be defeated."],
    ["017", "Field Hospital", M, 2, null, "Leaf", "uncommon", ["Medical"], "Complete: Restore 6000 total power in one turn. Reward: Return a defeated Character to your hand."],
    ["018", "Neji Hyuga", C, 3, 4000, "Leaf", "rare", ["Hyuga", "Team Guy"], "Eight Trigrams: When this attacks, your opponent cannot play Jutsu until end of turn."],
    ["019", "Hiashi Hyuga", C, 4, 5000, "Leaf", "rare", ["Hyuga", "Clan Head"], "Your Hyuga Characters cannot be targeted by Genjutsu."],
    ["020", "Hanabi Hyuga", C, 1, 1000, "Leaf", "common", ["Hyuga"], "When played, look at the top 3 cards of your opponent's deck and put them back in any order."],
    ["021", "Ko Hyuga", C, 1, 2000, "Leaf", "common", ["Hyuga", "Guard"], "Blocker."],
    ["022", "Hinata Hyuga — Twin Lion Fists", C, 3, 3000, "Leaf", "rare", ["Hyuga"], "When this attacks, if your opponent's top card is revealed, it gets +2000 power."],
    ["023", "Eight Trigrams Sixty-Four Palms", J, 2, null, "Leaf", "rare", ["Taijutsu", "Hyuga"], "Your opponent's Leader cannot activate abilities until the end of their next turn."],
    ["024", "Eight Trigrams Palm Rotation", J, 1, null, "Leaf", "uncommon", ["Hyuga"], "Counter: Negate an attack against a Hyuga Character."],
    ["025", "Protect the Byakugan", M, 1, null, "Leaf", "uncommon", ["Hyuga"], "Complete: Control 2 Hyuga Characters at end of turn. Reward: Draw 1 card and reveal your opponent's hand."],
    ["026", "Might Guy", C, 4, 6000, "Leaf", "super-rare", ["Taijutsu", "Jonin", "Team Guy"], "Dynamic Entry: Can attack the turn it is played."],
    ["027", "Might Duy", C, 3, 4000, "Leaf", "rare", ["Taijutsu"], "When defeated, your Taijutsu Characters get +2000 power until end of turn."],
    ["028", "Rock Lee — Weights Off", C, 1, 2000, "Leaf", "uncommon", ["Taijutsu", "Team Guy"], "Can attack the turn it is played."],
    ["029", "Rock Lee — Drunken Fist", C, 2, 3000, "Leaf", "rare", ["Taijutsu", "Team Guy"], "Cannot be targeted by Jutsu that cost 2 or less."],
    ["030", "Ninja Tortoise", C, 1, 1000, "Leaf", "common", ["Summon", "Animal"], "When played, search your deck for a Team Guy Character with cost 2 or less."],
    ["031", "Leaf Hurricane", J, 1, null, "Leaf", "common", ["Taijutsu"], "Your Character gets +2000 power until end of turn."],
    ["032", "Primary Lotus", J, 2, null, "Leaf", "uncommon", ["Taijutsu"], "Defeat a Character with 3000 power or less. Your Taijutsu Character gets +1000 power."],
    ["033", "Eight Gates: Gate of Death", J, 5, null, "Leaf", "secret-rare", ["Taijutsu", "Forbidden"], "Your Leader gets +7000 power until end of turn. At end of turn, your Leader loses 4000 power."],
    ["034", "Five Hundred Laps of Konoha", M, 1, null, "Leaf", "common", ["Taijutsu"], "Complete: Attack 3 times in one turn. Reward: Untap your Leader."],
    ["035", "Iruka Umino", C, 1, 1000, "Leaf", "common", ["Chunin", "Academy"], "When played, draw 1 card, then discard 1 card."],
    ["036", "Konohamaru Sarutobi", C, 1, 1000, "Leaf", "common", ["Genin"], "When played, an opponent's Character with cost 2 or less cannot block this turn."],
    ["037", "Shikamaru Nara", C, 3, 3000, "Leaf", "rare", ["Chunin", "Strategist"], "Shadow Possession: When played, tap an opponent's Character with cost 4 or less."],
    ["038", "Choji Akimichi", C, 4, 5000, "Leaf", "uncommon", ["Genin"], "Expansion Jutsu: Gets +2000 power while defending."],
    ["039", "Tenten", C, 2, 2000, "Leaf", "common", ["Team Guy", "Weapons"], "When played, deal 1000 damage to up to 2 Characters."],
    ["040", "Substitution Jutsu", J, 0, null, "Neutral", "common", ["Ninjutsu", "Basic"], "Counter: Your Character or Leader gets +2000 power during this battle."],
    ["041", "Shadow Clone Jutsu", J, 1, null, "Neutral", "common", ["Ninjutsu", "Basic"], "Draw 2 cards, then put 1 card from your hand on the bottom of your deck."],
    ["042", "Transformation Jutsu", J, 1, null, "Neutral", "common", ["Ninjutsu", "Basic"], "Look at the top 4 cards of your deck; add 1 to your hand and put the rest on the bottom."],
    ["043", "Escort the Bridge Builder", M, 1, null, "Wave", "common", ["Wave"], "Complete: Win a battle with a Character that costs 2 or less. Reward: Draw 1 card."],
    ["044", "Chunin Exam Preliminaries", M, 2, null, "Leaf", "uncommon", ["Exam"], "Complete: Defeat 2 Characters in one turn. Reward: Gain 1 extra chakra next turn."],
  ]),
  ...set("NT02", [
    ["L01", "Sasuke Uchiha — Avenger", L, null, 5000, "Sound", "super-rare", ["Uchiha", "Taka"], "When you play a Lightning Jutsu, your Leader gets +2000 power until end of turn."],
    ["L02", "Pain — Deva Path", L, null, 5000, "Rain", "super-rare", ["Akatsuki", "Rinnegan"], "Once per turn, when an opponent's Character is defeated, gain 1 chakra."],
    ["L03", "Orochimaru — Snake Sannin", L, null, 4000, "Sound", "super-rare", ["Sannin", "Sound"], "Once per turn, you may defeat one of your Characters to search your deck for a Curse Mark card."],
    ["L04", "Itachi Uchiha — Akatsuki", L, null, 5000, "Akatsuki", "super-rare", ["Akatsuki", "Uchiha", "Sharingan"], "At the start of your turn, if your opponent has 5+ cards in hand, they discard 1 card."],
    ["L05", "Zabuza Momochi — Demon of the Mist", L, null, 5000, "Mist", "rare", ["Swordsman", "Rogue Ninja"], "Your Characters with cost 3 or less get +1000 power during your turn."],
    ["001", "Sasuke Uchiha — Taka Leader", C, 3, 4000, "Sound", "super-rare", ["Uchiha", "Taka"], "When played, deal 2000 damage to a Character."],
    ["002", "Suigetsu Hozuki", C, 2, 3000, "Mist", "rare", ["Taka", "Swordsman"], "Hydrification: Cannot be defeated in battle by Characters with 4000 power or less."],
    ["003", "Karin", C, 1, 1000, "Sound", "uncommon", ["Taka", "Uzumaki", "Sensor"], "When played, look at the top 3 cards of your deck and add a Taka card to your hand."],
    ["004", "Jugo", C, 4, 6000, "Sound", "rare", ["Taka", "Curse Mark"], "When this attacks, it gets +1000 power for each other Taka Character you control."],
    ["005", "Hawk Summon", C, 2, 2000, "Sound", "common", ["Summon", "Animal"], "Can attack the turn it is played. When it attacks, draw 1 card."],
    ["006", "Chidori", J, 2, null, "Sound", "rare", ["Ninjutsu", "Lightning", "Uchiha"], "Defeat a Character with 4000 power or less."],
    ["007", "Kirin", J, 5, null, "Sound", "secret-rare", ["Ninjutsu", "Lightning", "Uchiha"], "Defeat up to 2 Characters. Play only if you played a Lightning Jutsu this turn."],
    ["008", "Hunt for Itachi", M, 2, null, "Sound", "uncommon", ["Taka"], "Complete: Control 3 Taka Characters. Reward: Your Leader gets +3000 power until end of turn."],
    ["009", "Konan", C, 3, 3000, "Rain", "rare", ["Akatsuki", "Paper"], "Paper Shuriken: When played, deal 1000 damage to each opponent's Character."],
    ["010", "Asura Path", C, 3, 4000, "Rain", "uncommon", ["Akatsuki", "Six Paths"], "When this attacks, deal 1000 damage to the defending Character first."],
    ["011", "Preta Path", C, 2, 3000, "Rain", "uncommon", ["Akatsuki", "Six Paths"], "Counter: Negate a Jutsu that targets one of your Six Paths Characters."],
    ["012", "Animal Path", C, 2, 2000, "Rain", "common", ["Akatsuki", "Six Paths"], "When played, search your deck for a Six Paths Character with cost 3 or less."],
    ["013", "Nagato", C, 6, 7000, "Rain", "secret-rare", ["Akatsuki", "Uzumaki", "Rinnegan"], "When played, return a defeated Six Paths Character to the field."],
    ["014", "Almighty Push", J, 3, null, "Rain", "rare", ["Ninjutsu", "Rinnegan"], "Return all Characters with cost 2 or less to their owners' hands."],
    ["015", "Planetary Devastation", J, 6, null, "Rain", "super-rare", ["Ninjutsu", "Rinnegan"], "Tap all opponent's Characters. They do not untap during your opponent's next turn."],
    ["016", "Invasion of Konoha", M, 3, null, "Rain", "uncommon", ["Akatsuki"], "Complete: Defeat 3 Characters in one turn. Reward: Draw 2 cards and gain 1 chakra."],
    ["017", "Kabuto Yakushi", C, 3, 3000, "Sound", "rare", ["Sound", "Medical", "Spy"], "When played, search your deck for a Sound Four Character."],
    ["018", "Kimimaro", C, 5, 6000, "Sound", "super-rare", ["Sound", "Kaguya", "Curse Mark"], "Dance of the Clematis: Cannot be blocked by Characters with cost 3 or less."],
    ["019", "Tayuya", C, 2, 2000, "Sound", "uncommon", ["Sound Four", "Curse Mark"], "Demonic Flute: When played, tap an opponent's Character with cost 2 or less."],
    ["020", "Sakon & Ukon", C, 3, 4000, "Sound", "rare", ["Sound Four", "Curse Mark"], "When defeated, you may pay 2 chakra to play it again from your trash."],
    ["021", "Jirobo", C, 3, 4000, "Sound", "common", ["Sound Four", "Curse Mark"], "Earth Prison Dome: When played, your opponent loses 1 chakra."],
    ["022", "Kidomaru", C, 3, 3000, "Sound", "uncommon", ["Sound Four", "Curse Mark"], "Spider Bow: When played, deal 2000 damage to a Character."],
    ["023", "Manda", C, 7, 8000, "Sound", "secret-rare", ["Summon", "Snake"], "When played, defeat a Character you control."],
    ["024", "Curse Mark of Heaven", J, 2, null, "Sound", "rare", ["Curse Mark", "Forbidden"], "Your Curse Mark Character gets +3000 power. At end of turn, it loses 1000 power permanently."],
    ["025", "Summoning: Triple Rashomon", J, 3, null, "Sound", "uncommon", ["Summon", "Barrier"], "Counter: Negate an attack. Draw 1 card."],
    ["026", "Seek Immortality", M, 3, null, "Sound", "uncommon", ["Sound"], "Complete: Have 5 Curse Mark cards in your trash. Reward: Return a Curse Mark Character from your trash to your hand."],
    ["027", "Kisame Hoshigaki", C, 4, 6000, "Mist", "rare", ["Akatsuki", "Swordsman"], "Samehada: When this battles, your opponent loses 1 chakra."],
    ["028", "Deidara", C, 3, 3000, "Stone", "rare", ["Akatsuki", "Explosive"], "When defeated, deal 3000 damage to a Character."],
    ["029", "Hidan", C, 3, 4000, "Hot Water", "uncommon", ["Akatsuki", "Immortal"], "Cannot be defeated by damage from Jutsu."],
    ["030", "Kakuzu", C, 4, 5000, "Waterfall", "uncommon", ["Akatsuki", "Immortal"], "When an opponent's Character is defeated, this gets +1000 power."],
    ["031", "Zetsu", C, 2, 2000, "Akatsuki", "common", ["Akatsuki", "Spy"], "When played, look at your opponent's hand."],
    ["032", "Tsukuyomi", J, 3, null, "Akatsuki", "super-rare", ["Genjutsu", "Sharingan"], "Your opponent discards 2 cards at random."],
    ["033", "Amaterasu", J, 4, null, "Akatsuki", "rare", ["Ninjutsu", "Sharingan"], "Defeat a Character. It cannot return to the field this game."],
    ["034", "Susanoo", J, 6, null, "Akatsuki", "secret-rare", ["Ninjutsu", "Sharingan"], "Your Leader gets +5000 power and cannot be targeted until your next turn."],
    ["035", "Capture the Jinchuriki", M, 3, null, "Akatsuki", "uncommon", ["Akatsuki"], "Complete: Defeat a Character with cost 5 or more. Reward: Draw 2 cards."],
    ["036", "Zabuza Momochi", C, 5, 6000, "Mist", "rare", ["Swordsman", "Rogue Ninja"], "Silent Killing: Cannot be blocked during your first attack each turn."],
    ["037", "Haku", C, 3, 3000, "Mist", "uncommon", ["Ice", "Rogue Ninja"], "Crystal Ice Mirrors — Counter: Your Character gets +3000 power during this battle."],
    ["038", "Fire Style: Fireball Jutsu", J, 2, null, "Neutral", "common", ["Ninjutsu", "Fire"], "Deal 3000 damage to a Character."],
    ["039", "Water Prison Jutsu", J, 3, null, "Neutral", "uncommon", ["Ninjutsu", "Water"], "Tap a Character. It does not untap during its owner's next turn."],
    ["040", "Retrieve the Forbidden Scroll", M, 1, null, "Neutral", "common", ["Scroll"], "Complete: Play 2 Jutsu in one turn. Reward: Draw 1 card."],
  ]),
  ...set("NT03", [
    ["L01", "Naruto Uzumaki — Sage of Mount Myoboku", L, null, 5000, "Leaf", "super-rare", ["Uzumaki", "Sage", "Jinchuriki"], "If you have 3+ Sage cards in play, your Leader gets +2000 power and you draw 1 extra card each turn."],
    ["L02", "Gaara — Fifth Kazekage", L, null, 6000, "Sand", "super-rare", ["Kazekage", "Jinchuriki", "Sand"], "Your Leader takes 1000 less damage from each attack. Sand Characters get +1000 power while defending."],
    ["L03", "Jiraiya — Toad Sage", L, null, 5000, "Leaf", "super-rare", ["Sannin", "Sage", "Summoner"], "Once per turn, reduce the cost of a Summon Character you play by 2."],
    ["L04", "Sasori of the Red Sand", L, null, 4000, "Sand", "super-rare", ["Akatsuki", "Puppeteer"], "Puppet Characters you control cannot be defeated in battle during your opponent's turn."],
    ["L05", "Kankuro — Puppet Master", L, null, 4000, "Sand", "rare", ["Puppeteer", "Sand"], "Once per turn, when you play a Puppet Character, draw 1 card."],
    ["001", "Naruto Uzumaki — Shadow Clone Army", C, 2, 3000, "Leaf", "rare", ["Uzumaki", "Team 7"], "When played, if you played Shadow Clone Jutsu this turn, draw 1 card."],
    ["002", "Fukasaku & Shima", C, 3, 2000, "Myoboku", "rare", ["Sage", "Toad", "Summon"], "When played, search your deck for a Sage card."],
    ["003", "Gamabunta", C, 6, 7000, "Myoboku", "super-rare", ["Summon", "Toad", "Chief"], "When played, return a Character with cost 4 or less to its owner's hand."],
    ["004", "Minato Namikaze", C, 5, 6000, "Leaf", "secret-rare", ["Hokage", "Flying Thunder God"], "Can attack the turn it is played. Once per turn, return it to your hand instead of it being defeated."],
    ["005", "Kushina Uzumaki", C, 4, 4000, "Leaf", "rare", ["Uzumaki", "Sealing"], "Adamantine Chains: When played, an opponent's Character cannot attack or block until the end of their next turn."],
    ["006", "Rasengan", J, 2, null, "Leaf", "rare", ["Ninjutsu", "Wind", "Uzumaki"], "Deal 4000 damage to a Character."],
    ["007", "Sage Art: Massive Rasengan", J, 4, null, "Leaf", "super-rare", ["Sage", "Wind"], "Defeat a Character. If you have 3+ Sage cards in play, draw 1 card."],
    ["008", "Train at Mount Myoboku", M, 2, null, "Myoboku", "uncommon", ["Sage"], "Complete: Have 3 Sage cards in play. Reward: Search your deck for any card."],
    ["009", "Temari", C, 3, 3000, "Sand", "rare", ["Sand", "Wind"], "Giant Folding Fan: When played, return a Character with cost 2 or less to its owner's hand."],
    ["010", "Baki", C, 3, 4000, "Sand", "uncommon", ["Sand", "Jonin"], "Blade of Wind: When this blocks, deal 1000 damage to the attacker."],
    ["011", "Shukaku", C, 7, 9000, "Sand", "secret-rare", ["Tailed Beast"], "Blocker. Cannot be defeated by Jutsu."],
    ["012", "Yashamaru", C, 2, 2000, "Sand", "uncommon", ["Sand", "Medical"], "When defeated, restore 2000 power to your Leader."],
    ["013", "Matsuri", C, 1, 1000, "Sand", "common", ["Sand", "Genin"], "Blocker."],
    ["014", "Sand Coffin", J, 3, null, "Sand", "rare", ["Ninjutsu", "Sand"], "Defeat a tapped Character."],
    ["015", "Ultimate Absolute Defense: Shield of Shukaku", J, 2, null, "Sand", "rare", ["Sand", "Barrier"], "Counter: Negate an attack against your Leader."],
    ["016", "Defend Sunagakure", M, 2, null, "Sand", "uncommon", ["Sand"], "Complete: Block 3 attacks in one turn cycle. Reward: Draw 2 cards."],
    ["017", "Gamakichi", C, 1, 1000, "Myoboku", "common", ["Summon", "Toad"], "When played, the next Summon you play this turn costs 1 less."],
    ["018", "Gamatatsu", C, 1, 2000, "Myoboku", "common", ["Summon", "Toad"], "Blocker."],
    ["019", "Gamahiro", C, 4, 5000, "Myoboku", "uncommon", ["Summon", "Toad"], "When played, deal 2000 damage to a Character."],
    ["020", "Gamaken", C, 5, 6000, "Myoboku", "rare", ["Summon", "Toad"], "Blocker. Gets +2000 power while defending."],
    ["021", "Hiruzen Sarutobi — The Professor", C, 5, 5000, "Leaf", "super-rare", ["Hokage", "Summoner"], "When played, search your deck for a Sannin or Summon card."],
    ["022", "Summoning: Toad Mouth Trap", J, 3, null, "Myoboku", "rare", ["Summon", "Sage"], "Tap all opponent's Characters with cost 3 or less."],
    ["023", "Sage Art: Goemon", J, 4, null, "Myoboku", "rare", ["Sage", "Fire"], "Deal 3000 damage to each opponent's Character."],
    ["024", "Research for the Icha Icha Series", M, 1, null, "Leaf", "uncommon", ["Sannin"], "Complete: Play 2 Summon Characters in one turn. Reward: Draw 2 cards."],
    ["025", "Kankuro", C, 3, 3000, "Sand", "rare", ["Sand", "Puppeteer"], "When played, search your deck for a Puppet Character."],
    ["026", "Crow", C, 1, 2000, "Sand", "common", ["Puppet"], "When defeated, deal 1000 damage to a Character."],
    ["027", "Black Ant", C, 2, 3000, "Sand", "common", ["Puppet"], "When this blocks, tap the attacking Character."],
    ["028", "Salamander", C, 3, 4000, "Sand", "uncommon", ["Puppet"], "Blocker. Takes no damage from Jutsu."],
    ["029", "Hiruko", C, 2, 3000, "Sand", "uncommon", ["Puppet", "Akatsuki"], "Counter: Gets +2000 power while defending."],
    ["030", "Chiyo", C, 4, 4000, "Sand", "super-rare", ["Puppeteer", "Elder", "Medical"], "When played, return a defeated Character to the field."],
    ["031", "Puppet Technique", J, 1, null, "Sand", "common", ["Puppeteer"], "Your Puppet Character gets +2000 power until end of turn."],
    ["032", "Red Secret Technique: Performance of a Hundred Puppets", J, 5, null, "Sand", "secret-rare", ["Puppeteer", "Forbidden"], "Play up to 3 Puppet Characters from your trash."],
    ["033", "Infiltrate the Puppet Workshop", M, 2, null, "Sand", "uncommon", ["Puppeteer"], "Complete: Control 3 Puppet Characters. Reward: Draw 1 card and gain 1 chakra."],
    ["034", "Summoning Jutsu", J, 2, null, "Neutral", "common", ["Summon", "Basic"], "Search your deck for a Summon Character with cost 4 or less."],
    ["035", "Rescue the Kazekage", M, 3, null, "Sand", "uncommon", ["Sand"], "Complete: Restore 5000 power to your Leader in one turn. Reward: Draw 2 cards."],
    ["036", "Mei Terumi — Fifth Mizukage", C, 5, 6000, "Mist", "rare", ["Kage", "Lava"], "When played, deal 2000 damage to each opponent's Character with cost 2 or less."],
    ["037", "Darui", C, 3, 4000, "Cloud", "uncommon", ["Cloud", "Jonin"], "Black Panther: When played, tap an opponent's Character."],
  ]),
  ...set("NT04", [
    ["L01", "Naruto Uzumaki — Kurama Link Mode", L, null, 6000, "Leaf", "secret-rare", ["Uzumaki", "Jinchuriki", "Sage"], "Once per turn, when you play a Sage or Uzumaki card, your Characters get +1000 power until end of turn."],
    ["L02", "Neji Hyuga — Branch Prodigy", L, null, 5000, "Leaf", "super-rare", ["Hyuga", "Team Guy"], "Your Hyuga Jutsu cost 1 less. Once per turn, look at the top card of your opponent's deck."],
    ["L03", "Killer B — Eight-Tails Jinchuriki", L, null, 6000, "Cloud", "rare", ["Jinchuriki", "Cloud"], "Your Characters with 5000+ power cannot be targeted by Jutsu that cost 2 or less."],
    ["L04", "Shikamaru Nara — Allied Strategist", L, null, 4000, "Leaf", "rare", ["Strategist", "Chunin"], "Once per turn, tap an opponent's Character with cost 2 or less."],
    ["001", "Kurama — Nine-Tails", C, 8, 10000, "Leaf", "secret-rare", ["Tailed Beast"], "Cannot be blocked by Characters with cost 4 or less."],
    ["002", "Killer B", C, 5, 6000, "Cloud", "rare", ["Jinchuriki", "Cloud"], "When played, draw 1 card for each opponent's Character with 5000+ power."],
    ["003", "Shisui Uchiha", C, 4, 5000, "Leaf", "super-rare", ["Uchiha", "Sharingan"], "Kotoamatsukami: When played, take control of an opponent's Character with cost 2 or less until end of turn."],
    ["004", "Obito Uchiha — Masked Man", C, 5, 6000, "Akatsuki", "super-rare", ["Akatsuki", "Uchiha"], "Cannot be blocked. When played, your opponent discards 1 card."],
    ["005", "Allied Shinobi Medic", C, 2, 2000, "Allied", "common", ["Medical"], "When played, restore 2000 power to your Leader."],
    ["006", "Flying Thunder God", J, 2, null, "Leaf", "rare", ["Ninjutsu", "Space-Time"], "Return one of your Characters to your hand, then play a Character with cost 4 or less from your hand for free."],
    ["007", "Edo Tensei", J, 5, null, "Sound", "secret-rare", ["Forbidden"], "Play up to 2 Characters from any trash under your control. Defeat them at end of turn."],
    ["008", "Mind Transmission Jutsu", J, 1, null, "Leaf", "common", ["Yamanaka", "Basic"], "Look at your opponent's hand. Draw 1 card."],
    ["009", "Allied Shinobi Forces HQ", M, 2, null, "Allied", "uncommon", ["Allied"], "Complete: Control Characters from 3 different villages. Reward: Draw 2 cards."],
    ["010", "Ino Yamanaka", C, 2, 2000, "Leaf", "uncommon", ["Yamanaka", "Medical"], "Mind Body Switch: When played, an opponent's Character cannot attack next turn."],
  ]),
];

export const CARD_INDEX: ReadonlyMap<string, NarutoCard> = new Map(CARDS.map((card) => [card.id, card]));

export function getCard(id: string): NarutoCard | undefined {
  return CARD_INDEX.get(id);
}

export function getSet(code: string): CardSet | undefined {
  return SETS.find((s) => s.code === code);
}

/** True when the card's set was legal on the given ISO date. */
export function isCardLegalOn(cardId: string, isoDate: string): boolean {
  const card = CARD_INDEX.get(cardId);
  if (!card) return false;
  const release = getSet(card.set)?.releaseDate;
  return release !== undefined && release <= isoDate;
}

/** The format label for an event on the given date, e.g. "Standard (NT01–NT03)". */
export function formatForDate(isoDate: string): string {
  const legal = SETS.filter((s) => s.releaseDate <= isoDate);
  if (legal.length === 0) return "Pre-release";
  return `Standard (${legal[0]!.code}–${legal[legal.length - 1]!.code})`;
}
