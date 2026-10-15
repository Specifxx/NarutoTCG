import { ARCHETYPE_INDEX, CHARTED_ARCHETYPES, ROGUE_ID, type Archetype } from "@/lib/data/archetypes";
import { getCard } from "@/lib/data/cards";

/**
 * Matchup strategy guides, from the first archetype's point of view. Every ordered pair of
 * charted archetypes is curated; any other pair gets a guide generated from both archetypes'
 * definitions. Guides describe how a matchup plays, never who is favored or by how much: the UI
 * shows the verdict and the real numbers from event data beside them.
 */

export interface MatchupGuide {
  archetypeId: string;
  opponentId: string;
  summary: string;
  /** Concrete tips that name real cards. */
  keys: string[];
  mulligan: string;
  source: "curated" | "generated";
}

type GuideText = Pick<MatchupGuide, "summary" | "keys" | "mulligan">;

const CURATED: Record<string, GuideText> = {
  "uchiha-avenger|uzumaki-sage": {
    summary: "Minato shrugs off your removal and Rasengan trades evenly with every Taka body, so win by pressuring before their Sage count reaches three.",
    keys: [
      "Point Chidori at Fukasaku & Shima before it can search; denying the third Sage card turns off their extra draw.",
      "Minato Namikaze returns to hand instead of being defeated once per turn, so attack into him only after that clause is spent.",
      "Suigetsu Hozuki can't be defeated in battle by Kushina Uzumaki or Naruto Uzumaki — Shadow Clone Army, which makes him your best Blocker.",
    ],
    mulligan: "Keep Karin or Hawk Summon plus a Chidori. A hand without early pressure gives them time to assemble Sage Mode.",
  },
  "uchiha-avenger|hyuga-gentle-fist": {
    summary: "A tempo battle. Hyuga sees your draws coming, so win on card quality: two-for-ones with Kirin and the Taka Leader's on-play damage.",
    keys: [
      "Neji Hyuga's attack stops Jutsu for the rest of their turn, so remove him with Chidori on your own turn before he swings.",
      "Eight Trigrams Palm Rotation negates attacks, not Jutsu: clear Ko Hyuga with Chidori instead of attacking into an open counter.",
      "Expect Eight Trigrams Sixty-Four Palms on the turn you plan a big Leader swing; bait it out with an early Chidori.",
    ],
    mulligan: "Keep Hawk Summon or Karin for card flow plus Chidori, which kills Neji Hyuga and Hinata Hyuga — Twin Lion Fists alike.",
  },
  "uchiha-avenger|sand-gaara": {
    summary: "Cheap Lightning removal strips Gaara's Blockers faster than they rebuild, and Gaara has few proactive threats to punish you.",
    keys: [
      "Chidori cleanly answers Matsuri, Baki and Yashamaru; attack only with what you can afford to lose to Sand Coffin.",
      "Kirin can't touch Shukaku, which cannot be defeated by Jutsu, so race it: Hawk Summon attacks the turn it lands and draws a card.",
      "Gaara's Leader takes 1000 less damage from each attack, so one big Jugo or Hunt for Itachi swing beats many small hits.",
    ],
    mulligan: "Keep any two of Chidori, Hawk Summon and Karin. You want to be well ahead on board before the Shukaku turn.",
  },
  "uchiha-avenger|medical-ninja": {
    summary: "Tsunade heals damage, but Chidori and Kirin defeat outright, so the healing engine gets no value against your removal.",
    keys: [
      "Save Kirin for Katsuyu: its protection only covers their other Characters, so Katsuyu itself is a legal target.",
      "Chidori Shizune before it can search; every Medical body except Katsuyu dies to it.",
      "Prefer Chidori over Fire Style: Fireball Jutsu against Dan Kato: damage that doesn't finish a Character is healed at Tsunade's end step.",
    ],
    mulligan: "Keep early pressure plus one Lightning Jutsu. Medical is slow to threaten you, so hands built around Kirin are fine.",
  },
  "uchiha-avenger|leaf-jonin": {
    summary: "Both decks trade removal efficiently and Kakashi's copy effect doubles every Lightning Blade, so tempo and card economy decide it.",
    keys: [
      "Ibiki Morino strips a Jutsu from your hand; cast Chidori before Ibiki comes down.",
      "Lightning Blade defeats anything with 5000 power or less, which covers every Taka body except Jugo; make Jugo your main threat.",
      "Kurenai Yuhi stops your highest-power Character from attacking, so develop two medium threats instead of one big one.",
    ],
    mulligan: "Keep Karin, Hawk Summon and a Chidori. A fast start forces Kakashi to spend his chakra copying defensively.",
  },
  "uchiha-avenger|itachi-tsukuyomi": {
    summary: "Itachi strips your hand while you race, and the game swings on whether Tsukuyomi lands before you have deployed your cheap threats.",
    keys: [
      "Empty your hand quickly: Itachi's Leader only forces a discard at five or more cards, and Tsukuyomi is weak against a small hand.",
      "Hidan can't be defeated by damage from Jutsu, so Fire Style: Fireball Jutsu does nothing to him; save Chidori, which defeats outright.",
      "Deidara deals 3000 damage when defeated, so attack into it with Jugo rather than Karin or Hawk Summon.",
    ],
    mulligan: "Keep cheap threats over card draw: Hawk Summon, Karin and Suigetsu Hozuki apply pressure before Tsukuyomi.",
  },
  "uchiha-avenger|akatsuki-pain": {
    summary: "Almighty Push bounces your cheap Taka bodies, while your Lightning removal picks apart the Six Paths one at a time.",
    keys: [
      "Preta Path negates Jutsu that target Six Paths Characters: remove it first, or bait the counter with Fire Style: Fireball Jutsu.",
      "Don't overextend into Almighty Push; two Characters with cost 2 or less on the board is plenty.",
      "Animal Path keeps their curve flowing, so Chidori it on sight to slow the march to Nagato.",
    ],
    mulligan: "Mulligan for Chidori plus a 3-cost threat like Sasuke Uchiha — Taka Leader that survives Almighty Push.",
  },

  "uzumaki-sage|uchiha-avenger": {
    summary: "Rasengan trades with every Taka body and Minato shrugs off Lightning removal. Just don't fall behind before the Sage engine starts.",
    keys: [
      "Minato Namikaze returns to your hand instead of being defeated, which makes Chidori and Kirin poor trades for them.",
      "Kushina Uzumaki's Adamantine Chains stops Jugo from attacking or blocking through their Hunt for Itachi turn.",
      "Suigetsu Hozuki can't be defeated in battle by your 4000-power Characters, so burn it with Rasengan instead of attacking into it.",
    ],
    mulligan: "Keep Fukasaku & Shima or Shadow Clone Jutsu plus one Rasengan to answer Hawk Summon early.",
  },
  "uzumaki-sage|hyuga-gentle-fist": {
    summary: "Eight Trigrams Sixty-Four Palms can switch off your Leader on the key turn, but your bigger Characters outclass Hyuga's low power.",
    keys: [
      "Play around Eight Trigrams Sixty-Four Palms: cash in Sage Mode on turns when they are low on chakra.",
      "Gamabunta's bounce resets Hiashi Hyuga and buys a full turn of tempo.",
      "Rasengan answers Neji Hyuga before his attack locks you out of Jutsu.",
    ],
    mulligan: "Prioritize Fukasaku & Shima. The Byakugan Leader reveals your top card, so they will see Train at Mount Myoboku coming and race it.",
  },
  "uzumaki-sage|sand-gaara": {
    summary: "A grindy game. Gaara's walls blunt your attacks, but your card-advantage engine outlasts their Blockers as long as you don't feed Sand Coffin.",
    keys: [
      "Sand Coffin only defeats tapped Characters, so attack with Minato Namikaze, who returns to hand instead of being defeated.",
      "Kushina Uzumaki's Adamantine Chains is your clean answer to Shukaku: it can't block until the end of their next turn.",
      "Train at Mount Myoboku can tutor the missing Sage card; long games favor whoever draws more, and that is you once Sage Mode is live.",
    ],
    mulligan: "Keep the Sage engine: Fukasaku & Shima, Shadow Clone Jutsu and Naruto Uzumaki — Shadow Clone Army. Early aggression isn't needed.",
  },
  "uzumaki-sage|medical-ninja": {
    summary: "Medical heals your Rasengan damage, so lean on Sage Art: Massive Rasengan, which defeats outright, and win the card race.",
    keys: [
      "Mystical Palm Technique undoes Rasengan damage; only cast Rasengan when it kills.",
      "Sage Art: Massive Rasengan defeats Katsuyu, the card that blanks the rest of your Jutsu.",
      "Gamabunta bouncing Shizune or Sakura Haruno makes them pay to replay it and slows the heal loop.",
    ],
    mulligan: "Keep the Sage engine pieces. Medical Ninja is slow, so an engine hand beats a removal hand.",
  },
  "uzumaki-sage|leaf-jonin": {
    summary: "A midrange battle. Kakashi copies their best removal, while your Sage draw engine gives you the long game.",
    keys: [
      "Ibiki Morino takes a Jutsu from your hand; cast Rasengan early or keep enough copies to spare one.",
      "Kamui removes Minato Namikaze from the game, bypassing his return clause; bait it with Gamabunta first.",
      "Kurenai Yuhi stops your biggest attacker, so go wide with Kushina Uzumaki and Naruto Uzumaki — Shadow Clone Army.",
    ],
    mulligan: "Keep Fukasaku & Shima with a Rasengan. Leaf Jonin curves out well, so you need early interaction.",
  },
  "uzumaki-sage|itachi-tsukuyomi": {
    summary: "Your extra draws push you over five cards for Itachi's Leader discard, and Tsukuyomi tears the engine apart.",
    keys: [
      "End your turns with four cards or fewer: Itachi Uchiha — Akatsuki only forces a discard at five or more.",
      "Deploy Fukasaku & Shima and Kushina Uzumaki as soon as possible instead of holding them where Tsukuyomi can hit them.",
      "Zetsu reveals your hand, so cash in Train at Mount Myoboku immediately rather than sandbagging the tutor.",
    ],
    mulligan: "Mulligan aggressively for cheap plays: Naruto Uzumaki — Shadow Clone Army and Shadow Clone Jutsu let you empty your hand before discard matters.",
  },
  "uzumaki-sage|akatsuki-pain": {
    summary: "Almighty Push bounces your cheap Uzumaki bodies and stalls the Sage count, and every trade feeds the Deva Path's chakra.",
    keys: [
      "Almighty Push returns Characters with cost 2 or less, so develop Fukasaku & Shima and Kushina Uzumaki, which cost 3 or more, ahead of cheap bodies.",
      "Preta Path negates Rasengan aimed at Six Paths Characters; remove it in battle first.",
      "Planetary Devastation taps your board for a full turn; keep Minato Namikaze in hand to attack the turn after.",
    ],
    mulligan: "Prefer 3- and 4-cost Sage pieces over cheap bodies; a curve of 2-drops gets punished by Almighty Push.",
  },

  "hyuga-gentle-fist|uchiha-avenger": {
    summary: "A tempo battle. Your information lets you play around Kirin, but Chidori kills most of your Characters, so value every body.",
    keys: [
      "When the revealed top card is Kirin, spread out instead of committing two key Hyuga at once.",
      "Neji Hyuga's attack stops Substitution Jutsu, so the rest of your swing connects.",
      "Ko Hyuga is a cheap Blocker that soaks up Hawk Summon attacks.",
    ],
    mulligan: "Keep Hanabi Hyuga or Ko Hyuga plus Eight Trigrams Palm Rotation; you want efficient early trades.",
  },
  "hyuga-gentle-fist|uzumaki-sage": {
    summary: "Eight Trigrams Sixty-Four Palms turns off Sage Mode for a full turn cycle, but their bigger bodies outsize yours.",
    keys: [
      "Fire Eight Trigrams Sixty-Four Palms the turn they reach three Sage cards to deny the extra draw and the +2000.",
      "Hanabi Hyuga reorders their top three cards: push Gamabunta and Sage Art: Massive Rasengan to the back.",
      "Kushina Uzumaki's Adamantine Chains hits your best attacker, so spread threats across Neji Hyuga and Hinata Hyuga — Twin Lion Fists.",
    ],
    mulligan: "Keep cheap Hyuga and Eight Trigrams Sixty-Four Palms; the Leader lock is your plan.",
  },
  "hyuga-gentle-fist|sand-gaara": {
    summary: "Gentle Fist tempo dismantles the Kazekage: Neji's attack shuts off Sand Coffin and Shield of Shukaku, and Sixty-Four Palms removes Gaara's damage reduction.",
    keys: [
      "Attack with Neji Hyuga first every turn: their Jutsu, Sand Coffin included, are off for the rest of your attacks.",
      "Eight Trigrams Sixty-Four Palms shuts off Gaara's Leader, removing the 1000 damage reduction and the Sand bonus while defending.",
      "The revealed top card warns you about Shukaku; hold Eight Trigrams Palm Rotation and develop around it.",
    ],
    mulligan: "Keep Neji Hyuga and Eight Trigrams Sixty-Four Palms. Hanabi Hyuga is a fine opener to line up their draws.",
  },
  "hyuga-gentle-fist|medical-ninja": {
    summary: "Medical heals through your low-power attacks, so disrupt Tsunade with Sixty-Four Palms and pressure the Leader directly.",
    keys: [
      "Eight Trigrams Sixty-Four Palms stops Tsunade's end-of-turn heal and her Medical draw for a full cycle.",
      "Protect the Byakugan reveals their hand: spot Strength of a Hundred Seal before you commit a big attack.",
      "Katsuyu's protection doesn't stop attacks; swing with Hinata Hyuga — Twin Lion Fists while their top card is revealed.",
    ],
    mulligan: "Keep Hyuga bodies over counters; you need pressure before Field Hospital starts recycling their Characters.",
  },
  "hyuga-gentle-fist|leaf-jonin": {
    summary: "Kakashi's copy effect relies on his Leader ability, which Sixty-Four Palms switches off at the critical moment.",
    keys: [
      "Ibiki Morino targets Jutsu in your hand, so cast Eight Trigrams Sixty-Four Palms early rather than holding it.",
      "Lightning Blade defeats every Hyuga Character; bait it with Hanabi Hyuga before landing Hiashi Hyuga.",
      "Neji Hyuga's attack stops Kakashi from playing, and copying, Jutsu for the rest of your turn.",
    ],
    mulligan: "Keep Eight Trigrams Sixty-Four Palms and a cheap Hyuga to deny Kakashi his copy turn.",
  },
  "hyuga-gentle-fist|itachi-tsukuyomi": {
    summary: "Itachi's discard strips your counters, but cheap Hyuga develop before Tsukuyomi matters.",
    keys: [
      "Play out your hand: Eight Trigrams Palm Rotation is better spent than discarded to Itachi's Leader.",
      "Hidan can't be defeated by Jutsu damage, so beat it in battle with an attacking Hiashi Hyuga.",
      "Zetsu shows them your hand anyway; use Protect the Byakugan's reveal to plan around Amaterasu.",
    ],
    mulligan: "Keep a low curve: Hanabi Hyuga, Ko Hyuga and Hinata Hyuga — Twin Lion Fists.",
  },
  "hyuga-gentle-fist|akatsuki-pain": {
    summary: "Sixty-Four Palms cuts off Pain's chakra ramp, and seeing their top card lets you play around Almighty Push.",
    keys: [
      "Eight Trigrams Sixty-Four Palms stops the Deva Path Leader from gaining chakra, delaying Nagato and Planetary Devastation.",
      "Ko Hyuga survives Konan's Paper Shuriken but Hanabi Hyuga doesn't, so don't overload on 1000-power bodies.",
      "When the revealed top card is Almighty Push, hold back extra cheap Hyuga.",
    ],
    mulligan: "Keep Eight Trigrams Sixty-Four Palms plus Neji Hyuga or Hinata Hyuga — Twin Lion Fists, which sit above Almighty Push's range.",
  },

  "sand-gaara|uchiha-avenger": {
    summary: "Chidori picks off your Blockers efficiently and Kirin trades two-for-one; your outs are Shukaku and a long game.",
    keys: [
      "Shukaku cannot be defeated by Jutsu, so their entire removal suite misses it; plan your chakra around landing it.",
      "Sand Coffin punishes Jugo and Hawk Summon after they attack, so keep three chakra open on their turn.",
      "Baki's block deals 1000 damage to the attacker, which finishes off Karin.",
    ],
    mulligan: "Keep Matsuri and Ultimate Absolute Defense: Shield of Shukaku; surviving the early turns is the whole plan.",
  },
  "sand-gaara|uzumaki-sage": {
    summary: "A grindy game. Your Blockers absorb their attacks, but the Sage draw engine outlasts you if the game goes too long.",
    keys: [
      "Sand Coffin Fukasaku & Shima after it attacks to keep them below three Sage cards.",
      "Temari's bounce resets Naruto Uzumaki — Shadow Clone Army and costs them tempo.",
      "Kushina Uzumaki can lock Shukaku out of blocking; play Shukaku after Kushina is spent.",
    ],
    mulligan: "Keep Matsuri plus Sand Coffin; Shukaku and Defend Sunagakure are your late game.",
  },
  "sand-gaara|hyuga-gentle-fist": {
    summary: "Neji's attack shuts off Sand Coffin and Shield of Shukaku, and Sixty-Four Palms removes your Leader's damage reduction.",
    keys: [
      "Tap Neji Hyuga with Water Prison Jutsu or Darui, then Sand Coffin it on your own turn.",
      "Hinata Hyuga — Byakugan Heiress reveals your top card, so lead with Blockers like Matsuri and the information matters less.",
      "Shukaku is your best card here: Hyuga's low power rarely gets through a 9000-power Blocker.",
    ],
    mulligan: "Keep Sand Coffin with a tap effect and early Blockers like Matsuri.",
  },
  "sand-gaara|medical-ninja": {
    summary: "A slow game. Neither deck pressures much; Defend Sunagakure and Shukaku give you a clock while Tsunade heals.",
    keys: [
      "Katsuyu stops Sand Coffin from defeating the rest of their board, but Katsuyu itself is fair game once it attacks.",
      "Shukaku outclasses every Medical body; land it and attack every turn.",
      "Yashamaru restores 2000 power to your Leader when defeated, which helps complete Rescue the Kazekage.",
    ],
    mulligan: "Keep card draw and a steady curve; there is no early pressure to fear.",
  },
  "sand-gaara|leaf-jonin": {
    summary: "Kakashi copies Lightning Blade to clear two Blockers at once, but your defensive Leader blunts Jonin attacks.",
    keys: [
      "Kamui removes Shukaku from the game, which its Jutsu immunity doesn't stop; bait Kamui out before you land it.",
      "Anko Mitarashi attacks the turn she lands, so keep Matsuri back as a Blocker.",
      "Baki punishes Asuma Sarutobi's attack with 1000 damage on the block.",
    ],
    mulligan: "Keep Blockers and Sand Coffin; Ultimate Absolute Defense: Shield of Shukaku is strong against Anko and Asuma.",
  },
  "sand-gaara|itachi-tsukuyomi": {
    summary: "Itachi's discard hurts, but your defense lives on the board and Shukaku shrugs off Amaterasu.",
    keys: [
      "Shukaku cannot be defeated by Jutsu, so Amaterasu does nothing to it.",
      "Hidan can't be defeated by Jutsu damage, but Sand Coffin defeats it outright once it has attacked.",
      "Deploy Matsuri and Baki rather than holding them, keeping your hand below five cards for Itachi's Leader.",
    ],
    mulligan: "Keep Blockers and Sand Coffin; avoid hands that depend on holding counters.",
  },
  "sand-gaara|akatsuki-pain": {
    summary: "Shukaku is the Blocker that never dies, and Pain's sweepers struggle against a wall of sturdy Sand Characters.",
    keys: [
      "Shukaku can't be defeated by Jutsu and Almighty Push only bounces cost 2 or less, so it walls the Six Paths indefinitely.",
      "Konan's Paper Shuriken only kills Matsuri; Temari, Baki and Yashamaru survive it.",
      "Trade sparingly: the Deva Path Leader gains chakra whenever one of your Characters is defeated, so Sand Coffin their attackers instead.",
    ],
    mulligan: "Keep Matsuri, Ultimate Absolute Defense: Shield of Shukaku and Sand Coffin; you win the long game once Shukaku lands.",
  },

  "medical-ninja|uchiha-avenger": {
    summary: "Chidori and Kirin defeat rather than deal damage, so your healing has nothing to work with; Katsuyu is the key card.",
    keys: [
      "Katsuyu stops Jutsu from defeating your other Characters, blanking Chidori and Kirin across your board.",
      "Have Shizune search for Katsuyu or Strength of a Hundred Seal, not another cheap body.",
      "Tonton draws a card when defeated, so it is the ideal Chidori target to offer up.",
    ],
    mulligan: "Mulligan for Shizune; landing Katsuyu on time is how you win.",
  },
  "medical-ninja|uzumaki-sage": {
    summary: "Your healing undoes Rasengan damage, but Sage Art: Massive Rasengan and Gamabunta's bounce get around it.",
    keys: [
      "Mystical Palm Technique restores 3000 power, enough to save a Character after Rasengan.",
      "Katsuyu blanks Sage Art: Massive Rasengan against your other Characters.",
      "Field Hospital returns a defeated Character to your hand, grinding against their one-for-one removal.",
    ],
    mulligan: "Keep Shizune and Mystical Palm Technique; the game will go long.",
  },
  "medical-ninja|hyuga-gentle-fist": {
    summary: "Hyuga's low power struggles through your healing, but Sixty-Four Palms can switch off Tsunade's heal at a key moment.",
    keys: [
      "Tsunade's end-of-turn heal undoes Hyuga chip damage; only trade when you can finish the exchange.",
      "Strength of a Hundred Seal keeps your Leader from being defeated for a turn; hold it for their big Hinata Hyuga — Twin Lion Fists attack.",
      "Choji Akimichi gets +2000 power while defending, which outsizes every Hyuga attacker.",
    ],
    mulligan: "Keep Medical Characters for the Tsunade draw; three on the board early is ideal.",
  },
  "medical-ninja|sand-gaara": {
    summary: "A slow game. Gaara rarely pressures you, but Shukaku outsizes everything you have.",
    keys: [
      "Katsuyu protects your board from Sand Coffin, since it is a Jutsu.",
      "Strength of a Hundred Seal keeps your Leader safe through a Shukaku swing.",
      "Choji Akimichi's +2000 while defending holds off everything except Shukaku.",
    ],
    mulligan: "Keep Shizune and your draw engine; this matchup goes long.",
  },
  "medical-ninja|leaf-jonin": {
    summary: "Kakashi's copied removal tests your board, but your heals and Tsunade's draw keep pace.",
    keys: [
      "Ibiki Morino can strip Mystical Palm Technique from your hand, so play heals proactively.",
      "Lightning Blade defeats outright; keep Katsuyu protecting the board when you can.",
      "Kamui is their clean answer to Katsuyu, so don't play Katsuyu until Kamui is gone or they are low on chakra.",
    ],
    mulligan: "Keep Shizune, Sakura Haruno and a cheap draw engine.",
  },
  "medical-ninja|itachi-tsukuyomi": {
    summary: "A grindy game. Itachi's discard targets your hand while your heals undo their damage, and Tsunade's extra draw refills what you lose.",
    keys: [
      "Nawaki and Tonton replace themselves, which blunts Tsukuyomi's discard.",
      "Kisame Hoshigaki and Kakuzu outsize your Characters; Choji Akimichi holds the ground on defense.",
      "Amaterasu's defeat is permanent, so Field Hospital can't bring back whatever it hits.",
    ],
    mulligan: "Keep low-cost Medical bodies so you stay under five cards in hand.",
  },
  "medical-ninja|akatsuki-pain": {
    summary: "Your heals undo Konan's sweep, but Almighty Push bounces your cheap Medical bodies.",
    keys: [
      "Tsunade's end-of-turn heal and Mystical Palm Technique undo Konan's Paper Shuriken damage.",
      "Almighty Push returns Sakura Haruno, Shizune and Tonton, but replaying them gives you fresh on-play effects.",
      "Planetary Devastation taps your board; Strength of a Hundred Seal keeps your Leader safe through their swing turn.",
    ],
    mulligan: "Keep Shizune and a mix of 1- and 3-cost Characters to blunt Almighty Push.",
  },

  "leaf-jonin|uchiha-avenger": {
    summary: "Copying Lightning Blade gives you two-for-ones, but the Avenger's cheap threats come quickly.",
    keys: [
      "Copy Lightning Blade with Kakashi to clear two Taka bodies in one turn.",
      "Ibiki Morino can strip Kirin before they assemble their big turn.",
      "Kurenai Yuhi stops Jugo from attacking next turn.",
    ],
    mulligan: "Keep Ibiki Morino plus a removal Jutsu to slow the Taka curve.",
  },
  "leaf-jonin|uzumaki-sage": {
    summary: "Kamui handles Minato cleanly and Ibiki disrupts the Sage engine, but their card draw takes over in the late game.",
    keys: [
      "Kamui removes Minato Namikaze from the game, which his return-to-hand clause can't prevent.",
      "Ibiki Morino can take Sage Art: Massive Rasengan or Rasengan from their hand.",
      "Yamato's bounce resets Fukasaku & Shima, keeping them below three Sage cards.",
    ],
    mulligan: "Keep Ibiki Morino and a cheap curve; pressure them before Sage Mode comes online.",
  },
  "leaf-jonin|hyuga-gentle-fist": {
    summary: "Sixty-Four Palms can lock Kakashi's copy ability, so spread your value across Jonin bodies.",
    keys: [
      "Don't lean on copying while Eight Trigrams Sixty-Four Palms is available to them; Asuma Sarutobi and Anko Mitarashi deal steady damage.",
      "Lightning Blade kills any Hyuga Character; aim it at Neji Hyuga to avoid Jutsu lockouts.",
      "Asuma Sarutobi's 1000 damage on attack kills Hanabi Hyuga for free.",
    ],
    mulligan: "Keep Lightning Blade and Asuma Sarutobi.",
  },
  "leaf-jonin|sand-gaara": {
    summary: "Copied Lightning Blades clear Blockers, and Kamui is one of the few answers to Shukaku.",
    keys: [
      "Kamui removes Shukaku from the game, which its Jutsu immunity doesn't stop.",
      "Lightning Blade copied by Kakashi clears Matsuri and Baki in one turn.",
      "Sand Coffin punishes tapped attackers, so attack with Characters you are happy to lose, like Anko Mitarashi.",
    ],
    mulligan: "Keep Lightning Blade and a steady Jonin curve; Kamui can be drawn into later.",
  },
  "leaf-jonin|medical-ninja": {
    summary: "Lightning Blade and Kamui defeat or remove outright, so Tsunade's healing matters less; Katsuyu is the problem card.",
    keys: [
      "Kamui answers Katsuyu cleanly; hold it until Katsuyu lands.",
      "Ibiki Morino strips Strength of a Hundred Seal before their defensive turn.",
      "Copy Lightning Blade on Shizune and Sakura Haruno to stall their engine.",
    ],
    mulligan: "Keep Kamui or Ibiki Morino plus a curve of Jonin.",
  },
  "leaf-jonin|itachi-tsukuyomi": {
    summary: "Ibiki and Zetsu make it a battle of information; cast your Jutsu early before Tsukuyomi takes them.",
    keys: [
      "Cast Lightning Blade before Tsukuyomi can discard it; holding cards is a liability against Itachi.",
      "Hidan can't be defeated by damage from Jutsu, but Lightning Blade defeats outright and works on him.",
      "Kamui removes Kisame Hoshigaki before he drains your chakra in every battle.",
    ],
    mulligan: "Keep a curve over reactive cards and empty your hand fast.",
  },
  "leaf-jonin|akatsuki-pain": {
    summary: "Almighty Push hits Ibiki and your cheap support, but your midrange Jonin sit above its range.",
    keys: [
      "Asuma Sarutobi, Yamato and Anko Mitarashi all cost 3 or more, so Almighty Push doesn't touch them.",
      "Kamui removes Nagato from the game before it can bring back more Six Paths.",
      "Copy Lightning Blade to clear two Six Paths in one turn, but watch for Preta Path's counter.",
    ],
    mulligan: "Keep Kurenai Yuhi and 3-cost Jonin over 1-drops.",
  },

  "itachi-tsukuyomi|uchiha-avenger": {
    summary: "Tsukuyomi and your Leader strip their hand, but the Avenger empties it quickly with cheap threats.",
    keys: [
      "Zetsu reveals whether they hold Kirin; time Tsukuyomi for the turn before their Kirin setup.",
      "Hidan can't be defeated by damage from Jutsu, so Fire Style: Fireball Jutsu bounces off him.",
      "Kisame Hoshigaki drains a chakra in every battle, which delays their Kirin turn.",
    ],
    mulligan: "Keep Zetsu and Deidara: trade early, then discard their reload.",
  },
  "itachi-tsukuyomi|uzumaki-sage": {
    summary: "Their draw engine pushes them over five cards for your Leader discard, and Tsukuyomi breaks up Sage Mode before it starts.",
    keys: [
      "Itachi Uchiha — Akatsuki discards a card whenever they start your turn with five or more, which their extra draw makes routine.",
      "An early Tsukuyomi hits Fukasaku & Shima or Train at Mount Myoboku before they reach the board.",
      "Amaterasu permanently answers Gamabunta, which would otherwise bounce your Kisame Hoshigaki.",
    ],
    mulligan: "Keep Zetsu and Tsukuyomi; early discard is the whole plan.",
  },
  "itachi-tsukuyomi|hyuga-gentle-fist": {
    summary: "Hyuga's cheap threats arrive before discard bites, but your bodies outsize theirs.",
    keys: [
      "Kisame Hoshigaki and Kakuzu outsize every Hyuga Character in battle.",
      "Tsukuyomi takes Eight Trigrams Palm Rotation and Eight Trigrams Sixty-Four Palms out of their hand.",
      "Their Leader reveals your top card, so don't count on a surprise Amaterasu.",
    ],
    mulligan: "Keep Zetsu and a 3-cost body to hold the early board.",
  },
  "itachi-tsukuyomi|sand-gaara": {
    summary: "Shukaku ignores your Jutsu, but Gaara's hand empties slowly, so your discard hits harder than usual.",
    keys: [
      "Shukaku cannot be defeated by Jutsu, so Amaterasu won't help; strip Gaara's hand with Tsukuyomi before Shukaku lands.",
      "Susanoo's +5000 lets your Leader battle Shukaku, and defeating it completes Capture the Jinchuriki.",
      "Hidan resists Jutsu damage but not Sand Coffin; attack with Kisame Hoshigaki only when they are low on chakra.",
    ],
    mulligan: "Keep Tsukuyomi and Zetsu; Gaara relies on specific cards.",
  },
  "itachi-tsukuyomi|medical-ninja": {
    summary: "Amaterasu's permanent defeat shuts down Field Hospital, and your discard trims their heals.",
    keys: [
      "Amaterasu's permanent defeat stops Field Hospital from recovering the target.",
      "Zetsu reveals Strength of a Hundred Seal before you commit to an attack.",
      "Kisame Hoshigaki drains a chakra in every battle, slowing down Katsuyu.",
    ],
    mulligan: "Keep Zetsu and Tsukuyomi.",
  },
  "itachi-tsukuyomi|leaf-jonin": {
    summary: "Ibiki and Zetsu both look at hands; the deck that spends its Jutsu more efficiently wins.",
    keys: [
      "Kakashi copies the Jutsu he plays, so Tsukuyomi their hand to deny him copy targets.",
      "Lightning Blade defeats Hidan outright, so keep Hidan back when they have chakra open.",
      "Deidara's 3000 damage on defeat kills Kurenai Yuhi or Ibiki Morino.",
    ],
    mulligan: "Keep Zetsu and a body; deny Ibiki value by casting your Jutsu early.",
  },
  "itachi-tsukuyomi|akatsuki-pain": {
    summary: "Pain's sweepers hit your cheap bodies, while your discard targets their expensive finishers.",
    keys: [
      "An early Tsukuyomi can strip Nagato or Planetary Devastation before they are castable.",
      "Hidan and Kakuzu survive Konan's 1000-damage sweep.",
      "Almighty Push returns Zetsu to your hand; replay it to look at their hand again.",
    ],
    mulligan: "Keep Zetsu and Tsukuyomi.",
  },

  "akatsuki-pain|uchiha-avenger": {
    summary: "Almighty Push sweeps their cheap Taka board, but Chidori picks off Six Paths before the ramp starts.",
    keys: [
      "Almighty Push returns Karin, Hawk Summon and Suigetsu Hozuki in one cast.",
      "Preta Path negates Chidori targeting a Six Paths Character.",
      "Konan's 1000 damage to each opposing Character finishes off Karin.",
    ],
    mulligan: "Keep Animal Path and Almighty Push.",
  },
  "akatsuki-pain|uzumaki-sage": {
    summary: "Almighty Push resets their cheap Uzumaki bodies and stalls the Sage count, and every trade feeds your chakra ramp.",
    keys: [
      "Cast Almighty Push the turn before they reach three Sage cards to stall the engine.",
      "Preta Path negates Rasengan aimed at your Six Paths.",
      "Planetary Devastation keeps Gamabunta and Minato Namikaze tapped through your Nagato turn.",
    ],
    mulligan: "Keep Animal Path and Konan.",
  },
  "akatsuki-pain|hyuga-gentle-fist": {
    summary: "Sixty-Four Palms switches off your chakra ramp, and their view of your top card lets them play around Almighty Push.",
    keys: [
      "Konan's Paper Shuriken kills Hanabi Hyuga and softens Ko Hyuga for Asura Path.",
      "Expect Eight Trigrams Sixty-Four Palms on your Nagato turn; ramp a turn early with Invasion of Konoha.",
      "Water Prison Jutsu keeps Neji Hyuga tapped so his Jutsu lockout never triggers.",
    ],
    mulligan: "Keep Konan and Water Prison Jutsu.",
  },
  "akatsuki-pain|sand-gaara": {
    summary: "Shukaku is the Blocker that never dies, and Sand Coffin punishes every Six Paths attacker.",
    keys: [
      "Planetary Devastation taps Shukaku and their other Blockers, opening a lethal window.",
      "Almighty Push returns Matsuri and Yashamaru; time it right before an all-in attack.",
      "Don't feed Sand Coffin: attack with Preta Path or Animal Path, which Nagato can bring back.",
    ],
    mulligan: "Keep Animal Path and Invasion of Konoha to ramp toward Planetary Devastation.",
  },
  "akatsuki-pain|medical-ninja": {
    summary: "Their heals blunt Konan's damage, but Almighty Push bounces most Medical bodies for great value.",
    keys: [
      "Almighty Push returns Sakura Haruno, Shizune, Tonton and Nawaki.",
      "Katsuyu protects against Jutsu that defeat, but Almighty Push bounces instead, so it still works.",
      "Planetary Devastation keeps their board tapped while Nagato attacks.",
    ],
    mulligan: "Keep Almighty Push and Animal Path.",
  },
  "akatsuki-pain|leaf-jonin": {
    summary: "Jonin's 3-cost bodies dodge Almighty Push, so rely on Konan and battles to grind them down.",
    keys: [
      "Ibiki Morino is the only Jonin piece Almighty Push hits; their 3-cost Jonin stay put.",
      "Preta Path negates Lightning Blade targeting a Six Paths Character.",
      "Kamui removes Nagato from the game, so play Nagato after Kamui is used.",
    ],
    mulligan: "Keep Konan and Preta Path.",
  },
  "akatsuki-pain|itachi-tsukuyomi": {
    summary: "Their discard targets your expensive finishers, but your ramp lets you cast threats before Tsukuyomi finds them.",
    keys: [
      "Cast Nagato or Planetary Devastation as soon as you can; holding them invites Tsukuyomi.",
      "Deidara deals 3000 damage when defeated, so don't put Animal Path in front of it.",
      "Preta Path negates Amaterasu aimed at a Six Paths Character.",
    ],
    mulligan: "Keep Animal Path and Konan.",
  },
};

function guideKey(archetypeId: string, opponentId: string): string {
  return `${archetypeId}|${opponentId}`;
}

/** Every curated guide, in definition order. */
export const CURATED_GUIDES: readonly MatchupGuide[] = Object.entries(CURATED).map(([key, text]) => {
  const [archetypeId, opponentId] = key.split("|") as [string, string];
  return { archetypeId, opponentId, ...text, source: "curated" };
});

const CURATED_INDEX: ReadonlyMap<string, MatchupGuide> = new Map(
  CURATED_GUIDES.map((guide) => [guideKey(guide.archetypeId, guide.opponentId), guide]),
);

/** Rough tempo ranking used to decide who is the beatdown in generated guides. */
const SPEED: Record<Archetype["playstyle"], number> = { aggro: 4, tempo: 3, midrange: 2, combo: 2, control: 1 };

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const cardName = (id: string) => getCard(id)?.name ?? id;

function listNames(ids: readonly string[]): string {
  const names = ids.map(cardName);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** What the archetype's game plan builds toward: its most expensive signature Character (or card). */
function payoff(archetype: Archetype): string | undefined {
  let best: string | undefined;
  let bestRank = -1;
  for (const id of archetype.signatureCardIds) {
    const card = getCard(id);
    const rank = (card?.type === "character" ? 100 : 0) + (card?.cost ?? 0);
    if (rank > bestRank) {
      best = id;
      bestRank = rank;
    }
  }
  return best && cardName(best);
}

function opener(archetype: Archetype): string {
  return cardName(archetype.mulliganTargets[0] ?? "");
}

function generateGuide(self: Archetype, opponent: Archetype): MatchupGuide {
  const base = { archetypeId: self.id, opponentId: opponent.id, source: "generated" as const };
  const selfPayoff = payoff(self);
  const opponentPayoff = payoff(opponent);
  const keep = `Keep ${listNames(self.mulliganTargets)}`;

  if (self.id === opponent.id) {
    return {
      ...base,
      summary: selfPayoff
        ? `Mirror match: both players share the same plan, so the usual edge (${lowerFirst(self.strengths[0] ?? "")}) cancels out. Tempo, sequencing and who resolves ${selfPayoff} first decide it.`
        : "Rogue mirror: two off-meta lists rarely share much, so read their Leader on turn one and adapt to whatever they are doing.",
      keys: selfPayoff
        ? [
            `Race to ${selfPayoff}; the first copy to land usually dictates the rest of the game.`,
            `Their list shares your weak spot (${lowerFirst(self.weaknesses[0] ?? "")}); find ${opener(self)} early and make them expose it first.`,
          ]
        : [
            `Open on ${opener(self)} and save flexible answers until you have seen their first few plays.`,
            `Trade early with ${listNames(self.mulliganTargets.length > 1 ? self.mulliganTargets.slice(1) : self.mulliganTargets)}; between two untested lists, early tempo usually decides the game.`,
          ],
      mulligan: `${keep}; in a mirror, a smooth curve matters more than a greedy keep.`,
    };
  }

  if (self.id === ROGUE_ID || !selfPayoff) {
    return {
      ...base,
      summary: `Off-meta lists vary, so there is no settled plan here. Play around ${opponent.name}'s main edge (${lowerFirst(opponent.strengths[0] ?? "")}) and attack its weak spot (${lowerFirst(opponent.weaknesses[0] ?? "")}).`,
      keys: [
        `Have an answer ready for ${opponentPayoff ?? opener(opponent)}; it is the card ${opponent.shortName} builds toward.`,
        `Expect ${opener(opponent)} early, since their mulligans look for it.`,
      ],
      mulligan: `Keep your list's cheapest interaction; ${opponent.shortName} pilots know their plan, so you need to react early.`,
    };
  }

  if (opponent.id === ROGUE_ID || !opponentPayoff) {
    return {
      ...base,
      summary: `Rogue lists vary from event to event, so identify their Leader on turn one and stick to your own plan and its main edge (${lowerFirst(self.strengths[0] ?? "")}).`,
      keys: [
        `Build toward ${selfPayoff} as usual; most off-meta lists are less refined than ${self.shortName}.`,
        `Mulligan for ${opener(self)} and hold flexible answers until you have seen their first few plays.`,
      ],
      mulligan: `${keep}, as you would in any other matchup.`,
    };
  }

  const speed = SPEED[self.playstyle] - SPEED[opponent.playstyle];
  const summary =
    speed > 0
      ? `${self.name} is the faster deck, so you are the beatdown. ${opponent.name} wants a long game where its main edge (${lowerFirst(opponent.strengths[0] ?? "")}) takes over; close it out before then.`
      : speed < 0
        ? `${opponent.name} is the faster deck, so you are the control player. Survive the early turns, then let your main edge (${lowerFirst(self.strengths[0] ?? "")}) take over.`
        : `Neither deck is clearly faster: your ${self.playstyle} plan meets their ${opponent.playstyle} one head on, so card quality and sequencing decide most games.`;
  return {
    ...base,
    summary,
    keys: [
      `Build toward ${selfPayoff}; it is the clearest way to cash in your main edge (${lowerFirst(self.strengths[0] ?? "")}).`,
      `Press their weak spot (${lowerFirst(opponent.weaknesses[0] ?? "")}) and have an answer ready for ${opponentPayoff}.`,
      `Respect ${opener(opponent)} in the early turns; it is the card their mulligans look for.`,
    ],
    mulligan: speed < 0 ? `${keep}, favoring cheap plays that survive their early pressure.` : `${keep}; the early turns are on your terms.`,
  };
}

/**
 * The guide for playing `archetypeId` against `opponentId`: curated when one exists, otherwise
 * generated from both archetype definitions. Null when either archetype is unknown.
 */
export function getMatchupGuide(archetypeId: string, opponentId: string): MatchupGuide | null {
  const curated = CURATED_INDEX.get(guideKey(archetypeId, opponentId));
  if (curated) return curated;
  const self = ARCHETYPE_INDEX.get(archetypeId);
  const opponent = ARCHETYPE_INDEX.get(opponentId);
  return self && opponent ? generateGuide(self, opponent) : null;
}

/** Guides for `archetypeId` against every other charted archetype, in chart slot order. */
export function getMatchupGuidesFor(archetypeId: string): MatchupGuide[] {
  return CHARTED_ARCHETYPES.filter((a) => a.id !== archetypeId)
    .map((a) => getMatchupGuide(archetypeId, a.id))
    .filter((guide): guide is MatchupGuide => guide !== null);
}
