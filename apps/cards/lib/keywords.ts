// Reminder text for rules keywords. Cards may carry keywords that are not in
// this glossary (e.g. newly scraped ones); UI should simply omit the tooltip.
export const KEYWORD_GLOSSARY: Readonly<Record<string, string>> = {
  Rush: "This card can attack on the turn it is played.",
  Blocker: "When your opponent attacks, you may rest this card to make it the new target of the attack.",
  Substitution: "Once per turn, when this card would be K.O.'d, you may trash 1 card from your hand instead.",
  "Double Attack": "This card deals 2 damage instead of 1.",
  Ambush: "You may play this card during your opponent's turn by paying its cost.",
  Counter: "You may activate this Jutsu during your opponent's attack.",
  Combo: "This ability is active only if you have activated a Jutsu this turn.",
  Banish: "When this card deals damage, the target's life card is trashed instead of being added to hand.",
  "Sage Mode": "While you have 5 or more chakra, this card gains +2000 power and its [Sage Mode] abilities are active.",
  Sharingan: "Once per turn, when your opponent activates a Jutsu, you may draw 1 card, then trash 1 card.",
  Resilient: "This card can't be K.O.'d by your opponent's Jutsu.",
  Trigger: "When this card is revealed from your life, you may activate its [Trigger] effect.",
};

export function keywordReminder(keyword: string): string | undefined {
  return KEYWORD_GLOSSARY[keyword];
}

export const TIMING_TAGS = [
  "On Play",
  "When Attacking",
  "On Block",
  "On K.O.",
  "Activate: Main",
  "Main",
  "Counter",
  "Trigger",
  "Once Per Turn",
  "Your Turn",
  "Opponent's Turn",
  "End of Your Turn",
] as const;
