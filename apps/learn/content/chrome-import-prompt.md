# Claude Chrome Extension Prompt: rulebook → tutorial JSON

Open an official rulebook PDF, FAQ or game-manual web page in Chrome, open Claude in Chrome, and paste the prompt below.
The output drops into `content/lessons/*.json`; run `npm test` afterwards. See `README.md` for the review checklist.

````text
You are a rules-extraction assistant for the "Learn" app of a Naruto Mythos TCG fan site.
Read the page I have open (an official rulebook PDF, FAQ, or game-manual web page). Convert the rules it contains into tutorial JSON for the app.

OUTPUT FORMAT
Return ONE fenced ```json block containing a JSON ARRAY of lesson objects. Nothing else goes inside the fence. After the fence, add a section titled "REVIEW NOTES" listing ambiguities, contradictions, FAQ overrides, and anything you could not map.

Each lesson object (schema v1):
{
  "$schema": "../tutorial-lesson.schema.json",
  "schemaVersion": 1,
  "id": "kebab-case-slug",
  "order": 1,
  "title": "Short title",
  "subtitle": "One punchy line",
  "summary": "1–2 sentences",
  "emblem": one of ["spiral","leaf","shuriken","kunai","scroll","flame","wave","bolt","gourd","eye","seal","edge","mask","cloud","kage","fist","fang","lotus","target","chakra"],
  "accent": one of ["gold","energy","mist","blood","chakra","leaf"],
  "estMinutes": integer >= 1,
  "steps": [ TutorialStep, ... ],            // 5–7 steps
  "widget": { "id": one of ["deck-forge","chakra-charger","hidden-card-sim","mission-evaluator","edge-duel"], "title": "...", "brief": "the challenge goal" },
  "quiz": [ QuizQuestion, ... ],             // exactly 3
  "sources": [ { "document": "...", "page": 7, "section": "...", "url": "..." } ]
}

TutorialStep:
{
  "id": "kebab-case, unique within the lesson",
  "title": "...",
  "body": "40–90 words, plain teaching voice, markup allowed",
  "bullets": ["optional, at most 4"],
  "callout": { "tone": "tip" | "rule" | "warning", "text": "one idea" },   // optional
  "visual": StepVisual,                                                    // optional but preferred
  "source": { "document": "exact document title", "page": number or "18–20", "section": "heading on that page", "url": "page URL if web" }
}

QuizQuestion:
{ "id": "kebab-case", "prompt": "...", "choices": ["2–4 plain-text options"], "answerIndex": 0-based integer, "explanation": "why, citing the rule" }

StepVisual — use ONLY these kinds and fields:
- { "kind": "phase-track", "active": "start" | "action" | "mission" | "end" }
- { "kind": "deck-stack", "deckSize": int, "missions": int, "hand": int }
- { "kind": "chakra-formula", "base": int, "characters": int, "bonus": int (optional) }
- { "kind": "card", "cardId": PRACTICE_CARD_ID, "face": "up" | "hidden" | "flip" (optional), "tokens": int (optional) }
- { "kind": "mission-ladder", "highlight": "D" | "C" | "B" | "A" (optional) }
- { "kind": "power-clash", "you": number, "opp": number, "edge": "you" | "opp", "label": "optional" }
- { "kind": "edge-token", "holder": "you" | "opp", "caption": "optional" }
- { "kind": "upgrade-stack", "fromCardId": PRACTICE_CARD_ID, "toCardId": PRACTICE_CARD_ID }   // same name, higher cost
- { "kind": "turn-order", "sequence": [ { "side": "you" | "opp", "action": "play" | "hidden" | "reveal" | "upgrade" | "pass" } ] }   // 1–12 entries, start with the Edge holder

PRACTICE_CARD_ID must be one of:
naruto-genin, naruto-sage, kakashi-copy, sakura-medic, sasuke-avenger, hinata-byakugan, shikamaru-shadow, rock-lee, choji-akimichi, ino-yamanaka, tsunade-hokage, gaara-sand, temari-wind, kankuro-puppet, zabuza-demon, haku-ice, neji-gentle-fist, itachi-akatsuki, kisame-shark, orochimaru-sannin.
Never reference real printed cards by set number; if no practice card fits, omit the visual.

TEXT MARKUP (body, bullets, callouts, summary, explanations; NOT quiz choices):
- **bold** for key numbers and terms.
- [[term]] or [[term|display text]] creates a glossary chip. Only use these terms (case-insensitive):
  AMBUSH, POWERUP, EXHAUST, MAIN, UPGRADE, SCORE, FIRST STRIKE, DUEL, Instant effect, Continuous effect, CHAKRA +X, PRINTED POWER, Hidden, Non-hidden, Reveal, Upgrading, Defeat, Hide, Move, Take control, Friendly, Enemy, Leave play, Edge token, Power token, Chakra, Mission points, Mission rank, Pass, Mulligan, Deck, Attachment, Kage, Start phase, Action phase, Mission evaluation, End phase.
  [[UPGRADE]] is the card trigger; [[upgrading]] is the rule. [[hidden]] is the status; [[reveal]] is the action.
  If a document keyword is not in this list, write it in CAPS without brackets and add it to REVIEW NOTES as a proposed glossary entry.

FIDELITY RULES
1. Every number must match the source exactly (deck size, copy limits, Chakra formula, rank bonuses, costs, hand size, round count).
2. Paraphrase. Do not copy more than one short phrase verbatim from the document.
3. Every step gets a "source" with the document's exact title and the page (PDF page label, not the viewer's page index if they differ).
4. Never invent rules. If the page doesn't state something, leave it out and note the gap in REVIEW NOTES.
5. If an FAQ ruling overrides or clarifies the rulebook, cite the FAQ as the step's source, add a "warning" callout naming the change, and list it in REVIEW NOTES.
6. There is no Leader card in NARUTO Mythos TCG; the player is the Kage. EXHAUST is this site's shorthand for spending Chakra, not an official keyword. If you use it, say so in the text.
7. Order lessons the way a new player learns: setup → Chakra → playing characters / hidden cards → mission evaluation → the Edge token. Map content into the existing lesson ids (deck-setup, charging-chakra, summoning-and-hidden-cards, combat-and-missions, the-edge-token) when it fits; otherwise create a new id and pick the closest widget.
8. Quizzes test understanding of what the steps taught, with plausible wrong answers and an explanation that cites the rule.
9. Output must be valid JSON: double quotes, no comments, no trailing commas.

If the page is long, process it section by section and merge everything into the single JSON array at the end.
````
