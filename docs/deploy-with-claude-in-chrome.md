# Deploy Learn with Claude in Chrome

Launch target: the Learn app only, on a free Vercel domain:
**https://learnnarutomythos.vercel.app/learn**

Be signed in to GitHub, Vercel and (optionally) Google Search Console, then paste the prompt below into Claude in Chrome.

No environment variables are needed. On Vercel the app reads its own production domain
(`VERCEL_PROJECT_PRODUCTION_URL`) for link previews and the sitemap, and in production the header
only lists apps whose `NEXT_PUBLIC_*_URL` is set, so a Learn-only deploy shows no dead links.

````text
You are helping me launch my Naruto Mythos TCG learning site on Vercel. Work in my Chrome browser, where I am signed in to GitHub and Vercel. Go step by step and tell me what you did after each part.

FACTS
- GitHub repo: Specifxx/NarutoTCG, branch: main. It's a pnpm + Turborepo monorepo; only the Learn app is being deployed.
- Vercel project name: learnnarutomythos  → production URL https://learnnarutomythos.vercel.app
- Root Directory: apps/learn. Framework: Next.js. apps/learn/vercel.json already exists (turbo-ignore); don't change it.
- The app uses basePath "/learn": https://learnnarutomythos.vercel.app/ redirects to https://learnnarutomythos.vercel.app/learn
- No environment variables are required.

SAFETY RULES
- Ask me before buying anything, upgrading a plan, or entering payment details. The Hobby (free) plan is enough.
- Never copy tokens or secrets into chat.
- If a screen differs from my description, follow the current UI and tell me.
- Stop and ask if something is ambiguous (several Vercel teams, an existing project with the same name, the name being taken).

PART 1: GitHub
1. Open github.com/Specifxx/NarutoTCG → Settings → General → Default branch. If it isn't "main", switch it to main and confirm.

PART 2: Create the Vercel project
1. vercel.com → Add New… → Project → Import Git Repository → Specifxx/NarutoTCG. If the repo isn't listed, use "Adjust GitHub App Permissions" to give Vercel access to that repo only.
2. Project Name: learnnarutomythos. If Vercel says it's taken, stop and ask me for another name.
3. Framework Preset: Next.js. Root Directory: click Edit → choose apps/learn. Keep "Include files outside the root directory in the Build Step" enabled; the app imports packages/ui and packages/types.
4. Leave the Build, Output and Install commands at their defaults (Vercel detects pnpm from pnpm-lock.yaml). Add no environment variables.
5. Click Deploy and wait. If the build fails, open the build log, quote the first error to me, and stop.

PART 3: Project settings
1. Settings → Git → Production Branch: main.
2. Settings → Build and Deployment (or General) → Node.js Version: 22.x. If you changed it, go to Deployments → latest → Redeploy.
3. Settings → Domains: confirm learnnarutomythos.vercel.app is listed and assigned to Production. If the project got a different *.vercel.app name, click Edit on it and change it to learnnarutomythos.vercel.app if available; otherwise tell me the URL it has.
4. Settings → Deployment Protection: make sure Vercel Authentication is NOT required for Production, so the public (and Reddit) can open the site. Leave preview protection as it is.
5. If you changed the domain or protection after the first deploy, redeploy the latest production deployment once, so link previews use the final URL.

PART 4: Check the live site
1. Open https://learnnarutomythos.vercel.app; it should land on /learn (the Dojo page).
2. Open /learn/how-to-play, one lesson (e.g. /learn/how-to-play/charging-chakra?stage=train), /learn/puzzles and /learn/keywords. Report anything that errors or looks broken.
3. Confirm the header shows only "NARUTO TCG" plus the Learn tabs (Dojo, How to Play, Lethal Puzzles, Keywords), with no Simulator, Decks, Compare or Events links.
4. View source of https://learnnarutomythos.vercel.app/learn and confirm og:image starts with https://learnnarutomythos.vercel.app/learn/opengraph-image. Open that image URL; it should be a 1200×630 banner reading "Learn to play Naruto Mythos TCG".
5. Paste https://learnnarutomythos.vercel.app/learn into a link-preview checker (e.g. opengraph.xyz) and confirm the title, description and image appear.
6. Open https://learnnarutomythos.vercel.app/learn/sitemap.xml and confirm the URLs use learnnarutomythos.vercel.app.

PART 5 (optional): Google Search Console
1. search.google.com/search-console → Add property → URL prefix → https://learnnarutomythos.vercel.app/learn/
   (Domain properties need DNS access, which a vercel.app address doesn't give you.)
2. Choose the "HTML tag" verification method and copy ONLY the value inside content="…".
   In Vercel → learnnarutomythos → Settings → Environment Variables, add GOOGLE_SITE_VERIFICATION = that value (Production), then Deployments → latest production → Redeploy.
   When the redeploy is live, view source of https://learnnarutomythos.vercel.app/learn to confirm <meta name="google-site-verification" …> is present, then click Verify in Search Console.
3. After verification: Sitemaps → submit https://learnnarutomythos.vercel.app/learn/sitemap.xml, then URL Inspection → https://learnnarutomythos.vercel.app/learn → Request indexing.

PART 6: Report back
Give me: the production URL, the latest deployment status, Node version, production branch, whether deployment protection is off for Production, the results of each Part 4 check, and anything that still needs me.
````

## Later: the other apps

When Events, Decks, Simulator or Compare are ready, give each its own Vercel project (Root Directory `apps/<name>`),
then set `NEXT_PUBLIC_LEARN_URL`, `NEXT_PUBLIC_EVENTS_URL`, `NEXT_PUBLIC_DECKS_URL`, `NEXT_PUBLIC_SIMULATOR_URL`
and `NEXT_PUBLIC_COMPARE_URL` on every project. Each app appears in the shared header once its variable is set.
