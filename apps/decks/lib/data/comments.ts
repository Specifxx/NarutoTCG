import type { NarutoCard } from "@naruto-tcg/types";
import { getArchetype, ROGUE_ID } from "@/lib/data/archetypes";
import { getCard } from "@/lib/data/cards";
import { parseDeckId, type DeckComment, type DeckSummary } from "@/lib/decks/types";
import { EVENT_TIER_LABEL } from "@/lib/format";
import { createRng, hashSeed, randInt, shuffle } from "@/lib/random";
import { ordinal, placementLabel } from "@/lib/tournament/standings";

/**
 * Seed comment threads (fictional handles). Community decks carry curated threads; tournament
 * decks that finished top 4 get a deterministic thread generated from templates. Comments are
 * spaced out after the deck's date and always land before {@link SEED_COMMENTS_BEFORE}.
 */

export const SEED_COMMENTS_BEFORE = "2026-10-14T00:00:00Z";

/** Stands in for the deck's author in curated threads. */
const OP = "@op";
const HOUR = 3_600_000;
const GENERATED_MAX_PLACEMENT = 4;
const IMPORTED_PREFIX = "local-";

/** [index of the parent comment or null, author handle, body, hours after the previous comment, votes]. */
type SeedComment = [parent: number | null, author: string, body: string, hours: number, votes: number];

interface Draft {
  parent: number | null;
  author: string;
  body: string;
  hours: number;
  votes: number;
}

const CURATED_THREADS: Record<string, SeedComment[]> = {
  "almighty-push-control": [
    [null, "kunai_kid", "Is two Planetary Devastation enough? I keep wanting a third for the Gaara matchup.", 5, 24],
    [0, OP, "I tried three and the hands with two six-drops were unplayable. Against Gaara I'd rather add Water Prison Jutsu to keep Shukaku tapped.", 3, 31],
    [0, "deva_dan", "Same experience. The third copy is a trap unless you're also on a fourth Invasion of Konoha.", 6, 9],
    [null, "leafwatcher", "Almighty Push on your own Animal Path to search again is such a cute line. Never thought about it until this write-up.", 20, 17],
    [3, "rasen-ryo", "Playing Sage into this is miserable. Every Shadow Clone Army I play just goes back to hand.", 14, 12],
  ],
  "masked-man-pain": [
    [null, "rainvillage_rio", "Obito in Pain feels obvious in hindsight. Unblockable plus a discard is exactly what the deck was missing against Blockers.", 9, 19],
    [0, OP, "That was the whole idea. Gaara players used to sit behind Shukaku forever; now they have to race.", 4, 22],
    [null, "anbu-ash", "Why only one Planetary Devastation? Feels low for a control deck.", 30, 7],
    [2, OP, "This version is closer to midrange. Obito ends games before you need a second one, and drawing two six-drops early is how Pain loses.", 2, 15],
  ],
  "kazekage-wall": [
    [null, "mistwalker", "Darui over a third Shukaku is spicy. Is the tap really better than another finisher?", 7, 26],
    [0, OP, "Darui lets you Sand Coffin on your own turn. Shukaku number three was mostly rotting in hand against Avenger.", 2, 34],
    [1, "byakugone", "As a Hyuga player I'm not thrilled about this. Neji getting tapped and Sand Coffined before he can attack is rough.", 11, 18],
    [null, "deva_dan", "Pain player here. This matchup is a nightmare for us. Shukaku just sits there and Almighty Push does nothing to it.", 40, 21],
    [3, "paperbomb_pat", "Planetary Devastation into an all-in swing is your only out, and even then Shield of Shukaku blanks the Leader attack.", 5, 8],
  ],
  "budget-sand-fortress": [
    [null, "hokage_hopeful", "Built this for about the price of one Shukaku and went 3-1 at my first store event. Thank you!", 12, 28],
    [0, OP, "That's amazing to hear! The Allied Shinobi Medic plus Yashamaru turn for Rescue the Kazekage is the one to practice.", 3, 14],
    [null, "toadoil", "Would you add Shukaku back in if someone owns them, or keep the card advantage plan?", 26, 9],
    [2, OP, "One or two Shukaku in place of Escort the Bridge Builder is a straight upgrade. Everything else stays the same.", 4, 16],
  ],
  "myoboku-value-sage": [
    [null, "rasen-ryo", "Summoning Jutsu finding Fukasaku & Shima is the line nobody talks about. Turns the engine on so much more consistently.", 6, 38],
    [0, "ramen_ronin", "Wait, Fukasaku & Shima counts as a Summon? That changes everything for me.", 3, 11],
    [1, OP, "Yep, it has the Summon trait and costs 3, so Summoning Jutsu can grab it. Then it searches out a Sage card when played.", 1, 27],
    [null, "chakra-cat", "How do you play against Itachi? I lose every time to the Leader discard.", 50, 13],
    [3, OP, "Play out your hand and end your turn with four cards or fewer. Hold Shadow Clone Jutsu until you can use the cards right away.", 4, 20],
    [3, "scroll_hoarder", "Itachi player here: please keep holding your cards.", 9, 33],
  ],
  "kurama-link-aggro": [
    [null, "wind-style-wren", "The Kurama Link Mode pump on every Uzumaki card is much stronger than it reads. Lost twice to this on the simulator.", 8, 16],
    [null, "deva_dan", "Feels like Almighty Push ruins your day though. Half the curve costs 2 or less.", 22, 9],
    [1, OP, "It does. That's why Kushina and Minato stay in hand until Push is gone. You can't play this deck on autopilot.", 2, 12],
  ],
  "kirin-storm": [
    [null, "jonin_jules", "Retrieve the Forbidden Scroll in Avenger is a great find. Chidori into Kirin always completes it.", 4, 22],
    [null, "sandstorm-sol", "Can confirm this list is a nightmare for Gaara. Chidori on Matsuri every turn and I never got to Shukaku.", 30, 29],
    [1, OP, "Thanks Soren! If Shukaku does land, just race it. Kirin can't touch it, so don't even try.", 3, 18],
    [null, "toadoil", "Sage gives this deck real trouble. Minato going back to hand every time I Chidori it is so annoying.", 70, 10],
    [3, OP, "Sage is the worst common matchup for us. Spend Chidori on Fukasaku & Shima instead and keep them off three Sage cards.", 5, 14],
  ],
  "kotoamatsukami-taka": [
    [null, "anbu-ash", "Shisui stealing a Blocker for the turn is nuts against Gaara. Just walked straight past Matsuri.", 10, 13],
    [0, "mistwalker", "Feels bad from the Gaara side. Shield of Shukaku is the only thing that saves you.", 6, 8],
    [null, "hokage_hopeful", "Is Mind Transmission Jutsu better than Transformation Jutsu here?", 20, 6],
    [2, OP, "In this list, yes. Seeing their hand tells you whether Kirin runs into a counter, and it still draws a card.", 2, 11],
  ],
  "budget-byakugan": [
    [null, "leafwatcher", "Twin Lion Fists with the Byakugan Heiress Leader always gets the bonus, right? Since the top card is always revealed.", 5, 21],
    [0, OP, "Exactly. The Leader keeps their top card revealed all game, so Twin Lion Fists attacks for 6000 once you add the Leader's +1000.", 2, 30],
    [null, "mistwalker", "Gaara player here. Neji attacking first and turning off Sand Coffin is the most frustrating thing in this format.", 26, 18],
    [2, "byakugone", "That's the dream turn: Neji, then Sixty-Four Palms, then swing with everything.", 4, 12],
  ],
  "branch-prodigy-lock": [
    [null, "byakugone", "One-chakra Sixty-Four Palms is absurd. I don't know how this isn't the default Leader yet.", 6, 25],
    [0, OP, "You lose the permanent reveal, which hurts Twin Lion Fists. That's why I cut it to two. I still think it's the stronger Leader now.", 3, 19],
    [null, "deva_dan", "Mind Transmission telling you when Almighty Push is coming is so annoying from the other side.", 30, 10],
  ],
  "slug-princess-stall": [
    [null, "ramen_ronin", "Katsuyu making the rest of the board immune to Jutsu is so much better than it looks. Rasengan players hate this card.", 8, 17],
    [null, "kunai_kid", "Tried this against Avenger and got wrecked. Chidori defeats, so the heals do nothing.", 24, 12],
    [1, OP, "Yeah, that's the deck's worst matchup. Shizune for Katsuyu as early as you can, and offer Tonton as the Chidori target so you at least draw a card.", 3, 15],
    [1, "chakra-cat", "Kirin on Katsuyu is the play from the Avenger side. Katsuyu doesn't protect itself.", 5, 9],
  ],
  "copy-ninja-toolbox": [
    [null, "hokage_hopeful", "Started with this list last month. Good call telling new players to learn the copy timing first.", 9, 14],
    [0, OP, "Glad it helped! Copying Lightning Blade is the first thing to practice: two removal effects in one turn is a great deal.", 4, 12],
    [null, "toadoil", "Kamui answering Minato is such a good tip. Sage players never expect it.", 40, 8],
  ],
  "tsukuyomi-discard-lock": [
    [null, "scroll_hoarder", "Zetsu into Tsukuyomi on the next turn is my favorite sequence in the game. You know exactly what you might take.", 6, 23],
    [0, "rasen-ryo", "Tsukuyomi is random though, right? You don't actually choose.", 4, 9],
    [1, OP, "Right, it's two at random. Zetsu tells you whether to cast it now or wait a turn for them to reach five cards.", 2, 18],
    [null, "kunai_kid", "Lee players keep beating me with this. Any tips?", 50, 7],
    [3, OP, "It's the bad matchup. They empty their hand too fast for the discard to matter, so keep Deidara and Hidan back and trade.", 3, 11],
  ],
  "icha-icha-toad-flood": [
    [null, "wind-style-wren", "Gamakichi plus the Leader discount on Gamahiro is so cute. A 5000-power body for one chakra.", 7, 12],
    [null, "deva_dan", "Konan and Almighty Push say hi.", 18, 15],
    [1, OP, "Yeah, Pain is the worst matchup. Hold Gamakichi and Gamatatsu until Push is spent.", 2, 13],
  ],
  "edo-tensei-curse-mark": [
    [null, "senbon-sam", "Edo Tensei on Manda is a wild line. Manda's on-play defeat triggers Sakon & Ukon again.", 9, 16],
    [0, OP, "That's the combo! Then Seek Immortality gets back whatever you lost. It's slow, but it grinds through everything.", 3, 14],
    [null, "ramen_ronin", "Feels like Medical just can't deal with Kimimaro. My Blockers all cost 3 or less.", 30, 8],
  ],
  "gateless-lee-rush": [
    [null, "jonin_jules", "Thank you for pointing out the Gate of Death thing. I had two copies in my list and they rotted in my hand every game.", 4, 41],
    [0, "kunai_kid", "Same here. Five chakra is a lot when the whole plan is to win by turn five.", 3, 22],
    [null, "scroll_hoarder", "As an Itachi player I'm begging Lee players to slow down.", 28, 19],
    [2, OP, "Never! Emptying your hand early is the whole plan against Itachi.", 2, 16],
    [null, "mistwalker", "Gaara is still a wall for this though. Sand Coffin on every attacker.", 40, 9],
  ],
  "hundred-puppets-recursion": [
    [null, "anbu-ash", "Sasori's Leader ability makes blocking with Puppets free. Hiruko blocking with +2000 is a real wall.", 12, 9],
    [null, "jonin_jules", "Lightning Blade feels useless against this. Everything just comes back.", 30, 11],
    [1, OP, "That's the idea! Save Kamui for Chiyo, though: removing it from the game actually sticks.", 4, 13],
  ],
  "eight-tails-allied-forces": [
    [null, "chakra-cat", "Killer B blanking Chidori and Rasengan on every big body is a real meta call right now.", 6, 18],
    [0, "rasen-ryo", "Massive Rasengan still hits them though, it costs 4.", 3, 6],
    [1, OP, "Right, so bait it with Choji Akimichi first. Same with Kirin from Avenger.", 2, 9],
    [null, "wind-style-wren", "Allied Shinobi Forces HQ actually completes in this list. Cloud, Mist and Leaf on board most games.", 20, 7],
  ],
};

const COMMENTERS = [
  "kunai_kid",
  "leafwatcher",
  "rasen-ryo",
  "scroll_hoarder",
  "anbu-ash",
  "mistwalker",
  "paperbomb_pat",
  "senbon-sam",
  "chakra-cat",
  "ramen_ronin",
  "byakugone",
  "toadoil",
  "hokage_hopeful",
  "wind-style-wren",
  "rainvillage_rio",
  "jonin_jules",
] as const;

interface ThreadContext {
  pilot: string;
  event: string;
  finish: string;
  archetype: string;
  tier: string;
  /** "a Regional Championship", "an Online Open". */
  tierWithArticle: string;
  /** At least three card names; repeats when the deck has fewer highlights. */
  cards: [string, string, string];
  /** An opening-hand card: the first mulligan target in the list, else its cheapest Character. */
  keep: string;
  /** Two highlight cards in ascending cost for "X into Y" lines; null when every highlight costs the same. */
  curve: [string, string] | null;
}

type Template = (c: ThreadContext) => string;

/** Opening comments, each paired with the pilot's answer. */
const OPENERS: ReadonlyArray<[comment: Template, pilotReply: Template]> = [
  [
    (c) => `Congrats on the ${c.finish} at ${c.event}, ${c.pilot}! ${c.cards[0]} looked unbeatable on the day.`,
    (c) => `Thanks! ${c.cards[0]} did a lot of the heavy lifting in the later rounds.`,
  ],
  [
    (c) => `How did you settle on the ${c.cards[1]} count? It feels like the whole list is built around it.`,
    (c) => `I tested a copy fewer and kept missing it. The list leans on ${c.cards[1]} more than it looks.`,
  ],
  [
    (c) => `Copied this for my local store championship. Any mulligan advice for a first-time ${c.archetype} player?`,
    (c) => `Keep ${c.keep} or a cheap opener. Never keep a hand with nothing to do in the first two turns.`,
  ],
  [
    (c) =>
      c.curve
        ? `${c.curve[0]} into ${c.curve[1]} is such a clean sequence. Great list, ${c.pilot}.`
        : `${c.cards[0]} does so much work in this list. Great list, ${c.pilot}.`,
    (c) => (c.curve ? "Thanks! That turn won me a lot of games." : "Thanks! It won me a lot of games."),
  ],
  [
    (c) => `Nice to see ${c.archetype} putting up a result at ${c.tierWithArticle}. Was ${c.cards[2]} a meta call?`,
    (c) => `Partly. ${c.cards[2]} lines up well against what I expected to face, so it stayed in.`,
  ],
  [
    (c) => `Which matchup worried you most going into ${c.event}? This list looks solid everywhere.`,
    (c) => `The mirror, honestly. Whoever lands ${c.cards[0]} first usually takes it.`,
  ],
];

const CROWD_REPLIES: readonly Template[] = [
  (c) => `+1. ${c.cards[0]} is still underrated in my area.`,
  (c) => `Watching ${c.pilot} play this was a clinic.`,
  (c) => `${c.cards[1]} has been great for me too since I picked this deck up.`,
  (c) => `Saving this one for the next ${c.tier}.`,
];

function commentId(deckId: string, n: number): string {
  return `${deckId}#c${n}`;
}

/** Turns drafts into comments, compressing the timeline when it would run past the cutoff. */
function buildThread(deck: DeckSummary, drafts: Draft[]): DeckComment[] {
  const start = Date.parse(`${deck.createdAt.slice(0, 10)}T00:00:00Z`);
  const window = Date.parse(SEED_COMMENTS_BEFORE) - start;
  const total = drafts.reduce((sum, draft) => sum + draft.hours, 0) * HOUR;
  if (!(window > 0) || total === 0) return [];
  const scale = Math.min(1, (window * 0.95) / total);
  let elapsed = 0;
  return drafts.map((draft, index) => {
    elapsed += draft.hours * HOUR * scale;
    return {
      id: commentId(deck.id, index + 1),
      deckId: deck.id,
      parentId: draft.parent === null ? null : commentId(deck.id, draft.parent + 1),
      author: draft.author,
      body: draft.body,
      createdAt: new Date(Math.floor((start + elapsed) / 1000) * 1000).toISOString().replace(".000Z", "Z"),
      votes: draft.votes,
    };
  });
}

function threadContext(deck: DeckSummary, tournament: NonNullable<DeckSummary["tournament"]>): ThreadContext {
  const archetype = getArchetype(deck.archetypeId);
  const targets = (archetype?.mulliganTargets ?? []).filter((id) => deck.cardIds.includes(id));
  const highlights = [...new Set([...deck.keyCardIds, ...targets])].flatMap((id) => getCard(id) ?? []);
  const names = highlights.map((card) => card.name);
  if (names.length === 0) names.push(deck.name);
  const cost = (card: NarutoCard) => card.cost ?? 0;
  const byCost = highlights.slice().sort((a, b) => cost(a) - cost(b));
  const next = byCost.find((card) => cost(card) > cost(byCost[0]!));
  const cheapestCharacter = deck.cardIds
    .flatMap((id) => getCard(id) ?? [])
    .filter((card) => card.type === "character")
    .sort((a, b) => cost(a) - cost(b))[0];
  const keep = getCard(targets[0] ?? "") ?? cheapestCharacter;

  const tier = EVENT_TIER_LABEL[tournament.tier];
  const { placement, topCutSize } = tournament;
  const finish =
    placement === 1
      ? "win"
      : placement === 2 && topCutSize > 0
        ? "finals run"
        : placement <= topCutSize
          ? `${placementLabel(placement, topCutSize)} finish`
          : `${ordinal(placement)}-place finish`;
  return {
    pilot: deck.author.name.split(" ")[0] || deck.author.name,
    event: tournament.name.split(" — ")[0]!,
    finish,
    archetype: archetype && archetype.id !== ROGUE_ID ? archetype.shortName : deck.name,
    tier,
    tierWithArticle: `${/^[aeiou]/i.test(tier) ? "an" : "a"} ${tier}`,
    cards: [names[0]!, names[1 % names.length]!, names[2 % names.length]!],
    keep: keep?.name ?? names[0]!,
    curve: next ? [byCost[0]!.name, next.name] : null,
  };
}

function generateThread(deck: DeckSummary, tournament: NonNullable<DeckSummary["tournament"]>): Draft[] {
  const rng = createRng(hashSeed(deck.id));
  const context = threadContext(deck, tournament);
  const crowd = shuffle(rng, COMMENTERS);
  const crowdReplies = shuffle(rng, CROWD_REPLIES);
  const openers = shuffle(rng, OPENERS).slice(0, randInt(rng, 1, 4));
  const drafts: Draft[] = [];
  let nextCommenter = 0;
  let nextReply = 0;
  for (const [comment, pilotReply] of openers) {
    const parent = drafts.length;
    drafts.push({ parent: null, author: crowd[nextCommenter++ % crowd.length]!, body: comment(context), hours: randInt(rng, 2, 30), votes: randInt(rng, 0, 14) });
    const replies = randInt(rng, 0, 2);
    for (let i = 0; i < replies; i++) {
      const byPilot = i === 0 && rng() < 0.6;
      drafts.push({
        parent,
        author: byPilot ? deck.author.handle : crowd[nextCommenter++ % crowd.length]!,
        body: byPilot ? pilotReply(context) : crowdReplies[nextReply++ % crowdReplies.length]!(context),
        hours: randInt(rng, 1, 8),
        votes: randInt(rng, 0, 8),
      });
    }
  }
  return drafts;
}

/**
 * Seed comments for a deck, oldest first. Parents always precede their replies. Imported
 * events and decks outside the top 4 have none.
 */
export function getSeedComments(deck: DeckSummary): DeckComment[] {
  if (deck.source === "community") {
    const parsed = parseDeckId(deck.id);
    const thread = parsed?.kind === "community" ? CURATED_THREADS[parsed.slug] : undefined;
    if (!thread) return [];
    return buildThread(
      deck,
      thread.map(([parent, author, body, hours, votes]) => ({ parent, author: author === OP ? deck.author.handle : author, body, hours, votes })),
    );
  }
  const tournament = deck.tournament;
  if (!tournament || tournament.placement > GENERATED_MAX_PLACEMENT || tournament.id.startsWith(IMPORTED_PREFIX)) return [];
  return buildThread(deck, generateThread(deck, tournament));
}
