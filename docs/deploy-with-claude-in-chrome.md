# Deploy with Claude in Chrome

Paste the prompt below into Claude in Chrome. Replace `YOURDOMAIN.com` first, and be signed in to GitHub, Vercel, your domain registrar and Google Search Console.

````text
You are helping me launch my Naruto TCG fan site. Work in my Chrome browser, where I am signed in to GitHub, Vercel, my domain registrar, and Google Search Console. Go step by step. After each part, tell me what you did and what you saw.

FACTS
- GitHub repo: Specifxx/NarutoTCG. Deploy from branch: main.
- Monorepo: pnpm + Turborepo, Next.js 15. Each app is its own Vercel project. Every app has an apps/<name>/vercel.json with "ignoreCommand": "npx turbo-ignore", so unchanged apps skip rebuilding.
- My domain: YOURDOMAIN.com
- Apps and where they live:
  | Vercel project      | Root Directory   | Domain                     |
  | naruto-tcg-learn    | apps/learn       | YOURDOMAIN.com (+ www)     |
  | naruto-tcg-events   | apps/events      | events.YOURDOMAIN.com      |
  | naruto-tcg-decks    | apps/decks       | decks.YOURDOMAIN.com       |
  | naruto-tcg-sim      | apps/simulator   | play.YOURDOMAIN.com        |
  | naruto-tcg-compare  | apps/compare     | compare.YOURDOMAIN.com     |
- The Learn app uses basePath "/learn" and redirects "/" to "/learn", so the live address is https://YOURDOMAIN.com/learn.
- Environment variables. Set ALL of these on EVERY project, for Production and Preview. The shared header in every app reads them at build time:
  NEXT_PUBLIC_LEARN_URL     = https://YOURDOMAIN.com/learn
  NEXT_PUBLIC_EVENTS_URL    = https://events.YOURDOMAIN.com
  NEXT_PUBLIC_DECKS_URL     = https://decks.YOURDOMAIN.com
  NEXT_PUBLIC_SIMULATOR_URL = https://play.YOURDOMAIN.com
  NEXT_PUBLIC_COMPARE_URL   = https://compare.YOURDOMAIN.com

SAFETY RULES
- Ask me before buying anything, upgrading a plan, or entering payment details.
- Before you change or delete any existing DNS record, show it to me and ask. Only add records unless I approve otherwise. Leave email records (MX, SPF/TXT, DKIM, DMARC) alone.
- Never copy tokens, secrets or recovery codes into chat.
- If a screen looks different from what I describe, follow what the current UI says and tell me.
- Stop and ask if anything is ambiguous, such as several Vercel teams, or an existing project with the same name.

PART 1: GitHub
1. Open github.com/Specifxx/NarutoTCG → Settings → General → Default branch. If it isn't "main", switch it to main and confirm.
2. Check that the Vercel GitHub App can access this repo: Settings → GitHub Apps / Integrations. If it's missing, Vercel will offer to install it in Part 2.

PART 2: Vercel projects (repeat for each row in the table, starting with Learn)
1. vercel.com → Add New… → Project → Import Specifxx/NarutoTCG.
2. Project name: as in the table. Framework preset: Next.js. Root Directory: as in the table. Keep "Include files outside the root directory" ON; the apps import packages/ui and packages/types.
3. Leave Install, Build and Output commands at their defaults. Vercel detects pnpm from pnpm-lock.yaml.
4. Add the five environment variables above (Production + Preview) before the first deploy.
5. Deploy and wait for it to finish. If the build fails, open the build log, quote the first error to me, and stop.
6. Project → Settings → Git: Production Branch = main.
7. Settings → General → Node.js Version: 22.x. If you change it, redeploy.

PART 3: Domains
1. naruto-tcg-learn → Settings → Domains: add YOURDOMAIN.com and www.YOURDOMAIN.com. Make www redirect to the apex (308).
2. Add each subdomain to its own project: events., decks., play., compare.
3. For every domain, copy the exact DNS record Vercel asks for (type, name, value). Usually that's an A record for the apex and a CNAME for subdomains, but use the values Vercel shows.
4. Open my registrar's DNS settings for YOURDOMAIN.com and add those records, following the SAFETY RULES. If the registrar has a conflicting record (e.g. a parked-page A record or a www CNAME), ask before replacing it.
5. Back in Vercel, wait until every domain shows "Valid Configuration" and an issued SSL certificate. DNS can take minutes to hours, so check back.
6. If you set the environment variables before the domains were live, redeploy every project once (Deployments → latest → Redeploy) so the header links and social previews use the real URLs.

PART 4: Check the live site
1. Open https://YOURDOMAIN.com: it should redirect to /learn and show the Dojo page.
2. Visit /learn/how-to-play, /learn/puzzles, /learn/keywords and one lesson. Report any page that errors or looks broken.
3. Click every header link (Simulator, Decks, Compare, Events, Learn) and confirm each opens the right domain, not localhost.
4. View the page source of https://YOURDOMAIN.com/learn and confirm og:image starts with https://YOURDOMAIN.com/learn/opengraph-image. Open that image URL and confirm it loads (1200×630).
5. Paste https://YOURDOMAIN.com/learn into a link-preview checker such as opengraph.xyz and confirm the title, description and image show.

PART 5: Google Search Console
1. search.google.com/search-console → Add property → Domain → YOURDOMAIN.com.
2. Add the TXT verification record at my registrar (it's an addition, so no approval is needed unless it conflicts), then click Verify. Retry later if DNS hasn't propagated.
3. Sitemaps → submit: https://YOURDOMAIN.com/learn/sitemap.xml
4. URL Inspection → https://YOURDOMAIN.com/learn → Request indexing.

PART 6: Report back
Give me a checklist of every project with: its deployment URL, domain status, Node version, production branch, and whether all 5 env vars are set. List anything you skipped, anything that needs me, and anything still waiting on DNS.
````
