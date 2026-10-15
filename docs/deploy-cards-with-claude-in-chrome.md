# Deploy Cards with Claude in Chrome

Launch target: the Cards app (card database, spoiler center, set checklists) on a free Vercel domain:
**https://narutomythoscards.vercel.app**

Be signed in to GitHub and Vercel, then paste the prompt below into Claude in Chrome.

No environment variables are required. Card data ships in `apps/cards/public/data/*.json` and is
validated during the build, so a bad scrape fails the deploy instead of breaking the live site.
In production the header only lists apps whose `NEXT_PUBLIC_*_URL` is set, so a Cards-only deploy
shows no dead links. Part 5 optionally links Cards and Learn to each other.

````text
You are helping me launch my Naruto Mythos TCG card database on Vercel. Work in my Chrome browser, where I am signed in to GitHub and Vercel. Go step by step and tell me what you did after each part.

FACTS
- GitHub repo: Specifxx/NarutoTCG, branch: main. It's a pnpm + Turborepo monorepo; only the Cards app is being deployed in this project.
- Vercel project name: narutomythoscards → production URL https://narutomythoscards.vercel.app
- Root Directory: apps/cards. Framework: Next.js. apps/cards/vercel.json already exists (turbo-ignore); don't change it.
- The site lives at the root: / (overview), /cards (database), /card/<id> (detail), /spoilers, /sets.
- No environment variables are required. The build validates apps/cards/public/data/*.json and fails with a list of bad records if the data is invalid.
- A separate Vercel project may already exist for the Learn app (learnnarutomythos). Do not modify it unless Part 5 tells you to.

SAFETY RULES
- Ask me before buying anything, upgrading a plan, or entering payment details. The Hobby (free) plan is enough.
- Never copy tokens or secrets into chat.
- If a screen differs from my description, follow the current UI and tell me.
- Stop and ask if something is ambiguous (several Vercel teams, an existing project with the same name, the name being taken).

PART 1: GitHub
1. Open github.com/Specifxx/NarutoTCG and confirm the default branch is main and that apps/cards exists on main. If apps/cards is missing, stop and tell me.

PART 2: Create the Vercel project
1. vercel.com → Add New… → Project → Import Git Repository → Specifxx/NarutoTCG. If the repo isn't listed, use "Adjust GitHub App Permissions" to give Vercel access to that repo only. (Importing the same repo again for a second project is expected.)
2. Project Name: narutomythoscards. If Vercel says it's taken, stop and ask me for another name.
3. Framework Preset: Next.js. Root Directory: click Edit → choose apps/cards. Keep "Include files outside the root directory in the Build Step" enabled; the app imports packages/ui and packages/types.
4. Leave the Build, Output and Install commands at their defaults (Vercel detects pnpm from pnpm-lock.yaml). Add no environment variables.
5. Click Deploy and wait. If the build fails, open the build log and quote the first error to me. If it says "public/data contains … invalid record(s)", copy the listed records — that is a data problem, not a Vercel problem — and stop.

PART 3: Project settings
1. Settings → Git → Production Branch: main.
2. Settings → Build and Deployment (or General) → Node.js Version: 22.x. If you changed it, go to Deployments → latest → Redeploy.
3. Settings → Domains: confirm narutomythoscards.vercel.app is listed and assigned to Production. If the project got a different *.vercel.app name, click Edit and change it to narutomythoscards.vercel.app if available; otherwise tell me the URL it has.
4. Settings → Deployment Protection: make sure Vercel Authentication is NOT required for Production, so the public can open the site. Leave preview protection as it is.

PART 4: Check the live site (desktop width, then narrow the window to phone width and repeat 2–4)
1. Open https://narutomythoscards.vercel.app; the Overview page should show a search box, stats and "Latest reveals".
2. Open /cards. Type "Leaf Village" in the search box: results should update as you type. Tick Rarity → "Parallel Rare": the tiles should switch to parallel-art versions. Toggle Grid/List. Copy the URL, open it in a new tab, and confirm the same filters are applied.
3. Open /card/ST01-002. Hover the big card: it should tilt with a shimmer. Confirm the page says "Available in Starter Deck 01 and Promo Pack 1", has a printings checklist and a "Related decks" section.
4. Open /spoilers (reveals grouped by date with "Revealed" badges and source links) and /sets/ST01 (tick two checkboxes, reload, and confirm they stay ticked).
5. Open a card art URL such as https://narutomythoscards.vercel.app/art/ST01-002/PR01/P-007/promo — it should be an SVG card image.
6. Confirm the header shows "NARUTO TCG" plus the Cards tabs (Overview, Card Database, Spoilers, Set Checklists) and no links to apps that aren't deployed.
Report anything that errors, shows a broken image, or looks broken.

PART 5 (optional — ask me first): link Cards and Learn in the shared header
Only if a Vercel project for Learn exists (e.g. learnnarutomythos):
1. In narutomythoscards → Settings → Environment Variables, add (Production and Preview):
   NEXT_PUBLIC_CARDS_URL = https://narutomythoscards.vercel.app
   NEXT_PUBLIC_LEARN_URL = https://learnnarutomythos.vercel.app/learn
2. In the Learn project → Settings → Environment Variables, add the same two variables.
3. Redeploy the latest production deployment of BOTH projects (these variables are read at build time).
4. Confirm each site's header now shows both Learn and Cards and that the links open the other site.

PART 6: Report back
Give me: the production URL, the latest deployment status, Node version, production branch, whether deployment protection is off for Production, the results of each Part 4 check, whether Part 5 was done, and anything that still needs me.
````

## Updating card data after launch

Scrape new reveals with the card-scraping prompt, then merge and validate locally before pushing to `main`
(Vercel redeploys automatically):

```bash
pnpm --filter @naruto-tcg/cards merge:cards scraped.json --dry-run
pnpm --filter @naruto-tcg/cards merge:cards scraped.json
pnpm --filter @naruto-tcg/cards validate:data
```

Pages re-render hourly, so date-driven badges ("NEW", release countdowns) stay current between deploys.
