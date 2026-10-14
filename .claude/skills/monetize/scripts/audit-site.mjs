#!/usr/bin/env node
// Crawler's-eye audit for AdSense and affiliate readiness.
// Fetches raw HTML without running JavaScript, the way review crawlers first see a page.
//
// Usage: node audit-site.mjs <baseUrl> [--crawl N] [--min-words N] [--pages /about,/contact,...]
//   --crawl N      also audit up to N URLs from sitemap.xml (default 50, 0 to skip)
//   --min-words N  indexable pages below this are flagged as thin (default 300)
//   --pages LIST   required trust pages (default /about,/contact,/privacy,/terms,/affiliate-disclosure)
// Exits 1 if any FAIL.

const args = process.argv.slice(2);
const base = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a) && a.includes("://"));
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
if (!base) {
  console.error("Usage: node audit-site.mjs <baseUrl> [--crawl N] [--min-words N] [--pages /a,/b]");
  process.exit(2);
}
const origin = new URL(base).origin;
const crawlLimit = Number(opt("crawl", 50));
const minWords = Number(opt("min-words", 300));
const requiredPages = opt("pages", "/about,/contact,/privacy,/terms,/affiliate-disclosure").split(",").filter(Boolean);

const results = { PASS: 0, WARN: 0, FAIL: 0 };
const report = (level, msg) => {
  results[level]++;
  console.log(`${level.padEnd(4)}  ${msg}`);
};

async function get(path) {
  const url = new URL(path, origin).href;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; naruto-tcg-audit/1.0)" },
      signal: AbortSignal.timeout(20000),
    });
    return { url, status: res.status, headers: res.headers, body: await res.text() };
  } catch (e) {
    return { url, status: 0, headers: new Headers(), body: "", error: e.message };
  }
}

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function visibleText(html) {
  return decode(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|template|head)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/g, " "),
  )
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const wordCount = (text) => (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;

function attr(attrs, name) {
  const m = attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? decode(m[1] ?? m[2] ?? m[3]) : undefined;
}
const anchors = (html) => [...html.matchAll(/<a\b([^>]*)>/gi)].map((m) => ({ href: attr(m[1], "href"), rel: attr(m[1], "rel") || "" }));

function metaContent(html, name) {
  for (const m of html.matchAll(/<meta\b([^>]*)>/gi)) {
    if ((attr(m[1], "name") || "").toLowerCase() === name) return attr(m[1], "content") || "";
  }
  return undefined;
}
const titleOf = (html) => decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
const isNoindex = (page) =>
  /noindex/i.test(metaContent(page.body, "robots") || "") || /noindex/i.test(page.headers.get("x-robots-tag") || "");

// Classify outbound store links: tracked affiliate links vs store links that earn nothing.
function classifyLink(href) {
  let u;
  try {
    u = new URL(href, origin);
  } catch {
    return null;
  }
  if (u.origin === origin || !/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase();
  const q = u.searchParams;
  if (/(^|\.)(pxf\.io|sjv\.io|ojrq\.net|evyy\.net)$/.test(host)) return { merchant: "impact", tracked: true };
  if (/(^|\.)ebay\.[a-z.]+$/.test(host)) return { merchant: "ebay", tracked: q.has("campid") && q.get("mkcid") === "1" };
  if (/(^|\.)tcgplayer\.com$/.test(host)) return { merchant: "tcgplayer", tracked: false };
  if (/(^|\.)cardnexus\.com$/.test(host)) return { merchant: "cardnexus", tracked: false };
  if (/(^|\.)amazon\.[a-z.]+$/.test(host)) return { merchant: "amazon", tracked: q.has("tag") };
  if (host === "amzn.to") return { merchant: "amazon", tracked: true };
  return null;
}

function auditPage(page, label, { required = false, min = minWords } = {}) {
  if (page.status !== 200) {
    report(required ? "FAIL" : "WARN", `${label}: HTTP ${page.status || page.error}`);
    return null;
  }
  const text = visibleText(page.body);
  const words = wordCount(text);
  const noindex = isNoindex(page);
  const links = anchors(page.body);
  const issues = [];

  if (!titleOf(page.body)) issues.push(["FAIL", "missing <title>"]);
  if (!noindex && !metaContent(page.body, "description")) issues.push(["WARN", "missing meta description"]);
  if (/lorem ipsum/i.test(text)) issues.push(["FAIL", "contains lorem ipsum"]);
  if (/\bcoming soon\b/i.test(text) && !noindex) issues.push(["FAIL", 'indexable page says "coming soon"']);
  if (!noindex && words < min) issues.push(["WARN", `thin: ${words} words in server HTML (min ${min}); enrich or noindex`]);

  let affiliate = 0;
  for (const { href, rel } of links) {
    if (!href) continue;
    const c = classifyLink(href);
    if (!c) continue;
    if (!c.tracked) issues.push(["WARN", `untracked ${c.merchant} link earns nothing: ${href.slice(0, 90)}`]);
    else {
      affiliate++;
      if (!/\bsponsored\b/i.test(rel)) issues.push(["FAIL", `affiliate link missing rel="sponsored": ${href.slice(0, 90)}`]);
    }
  }
  if (affiliate > 0 && !/commission|affiliate/i.test(text)) {
    issues.push(["FAIL", `${affiliate} affiliate link(s) but no disclosure text ("commission"/"affiliate") on the page`]);
  }

  if (issues.length === 0) report("PASS", `${label}: ${words} words${noindex ? ", noindex" : ""}${affiliate ? `, ${affiliate} affiliate links OK` : ""}`);
  for (const [level, msg] of dedupe(issues)) report(level, `${label}: ${msg}`);
  return { words, noindex, links, text, title: titleOf(page.body) };
}

function dedupe(issues) {
  const seen = new Map();
  for (const [level, msg] of issues) {
    const key = level + msg.replace(/: .*$/, "");
    const prev = seen.get(key);
    seen.set(key, prev ? [level, prev[1], prev[2] + 1] : [level, msg, 1]);
  }
  return [...seen.values()].map(([level, msg, n]) => [level, n > 1 ? `${msg} (+${n - 1} more like this)` : msg]);
}

async function sitemapUrls(path, depth = 0) {
  const res = await get(path);
  if (res.status !== 200) return { ok: false, urls: [] };
  const locs = [...res.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decode(m[1]));
  if (/<sitemapindex/i.test(res.body) && depth < 2) {
    const nested = await Promise.all(locs.map((l) => sitemapUrls(l, depth + 1)));
    return { ok: true, urls: nested.flatMap((n) => n.urls) };
  }
  return { ok: true, urls: locs };
}

console.log(`Auditing ${origin} (raw HTML, no JavaScript)\n`);

// robots.txt
const robots = await get("/robots.txt");
let sitemapPath = "/sitemap.xml";
if (robots.status !== 200) report("WARN", "robots.txt missing");
else {
  const groups = robots.body.split(/\n(?=\s*user-agent:)/i);
  const blocksAll = groups.some(
    (g) => /user-agent:\s*(\*|mediapartners-google|googlebot)\s*$/im.test(g) && /^\s*disallow:\s*\/\s*$/im.test(g),
  );
  if (blocksAll) report("FAIL", "robots.txt disallows the whole site for Google or *");
  const sm = robots.body.match(/^\s*sitemap:\s*(\S+)/im);
  if (sm) sitemapPath = sm[1];
  else report("WARN", "robots.txt has no Sitemap: line");
  if (!blocksAll && sm) report("PASS", "robots.txt allows crawling and lists a sitemap");
}

// sitemap
const sitemap = await sitemapUrls(sitemapPath);
const sameOrigin = sitemap.urls.filter((u) => {
  try {
    return new URL(u).origin === origin;
  } catch {
    return false;
  }
});
if (!sitemap.ok) report("FAIL", `sitemap not found at ${sitemapPath}`);
else if (sitemap.urls.length === 0) report("FAIL", "sitemap has no URLs");
else {
  report("PASS", `sitemap lists ${sitemap.urls.length} URLs`);
  if (sameOrigin.length < sitemap.urls.length) {
    report("WARN", `${sitemap.urls.length - sameOrigin.length} sitemap URLs point at another origin (check canonical domain)`);
  }
}

// ads.txt
const adsTxt = await get("/ads.txt");
if (adsTxt.status === 200 && /google\.com\s*,\s*pub-\d+\s*,\s*DIRECT/i.test(adsTxt.body)) report("PASS", "ads.txt has a Google DIRECT line");
else report("WARN", "ads.txt missing or has no google.com DIRECT line (needed once you apply for AdSense)");

// homepage
console.log("");
const home = await get("/");
const homeInfo = auditPage(home, "homepage", { required: true });
if (homeInfo) {
  if (homeInfo.noindex) report("FAIL", "homepage is noindex");
  if (homeInfo.words < 600) report("WARN", `homepage has ${homeInfo.words} words in server HTML; aim for 600+ with article excerpts`);
  const internal = new Set(
    homeInfo.links
      .map((l) => {
        try {
          const u = new URL(l.href, origin);
          return u.origin === origin ? u.pathname : null;
        } catch {
          return null;
        }
      })
      .filter((p) => p && p !== "/"),
  );
  if (internal.size < 10) report("WARN", `homepage links to only ${internal.size} internal pages; surface articles and tools`);
  else report("PASS", `homepage links to ${internal.size} internal pages`);
  for (const p of requiredPages) {
    if (![...internal].some((i) => i.replace(/\/$/, "") === p)) report("WARN", `homepage does not link to ${p} (put it in the footer)`);
  }
  if (metaContent(home.body, "google-adsense-account")) report("PASS", "AdSense verification meta tag present in server HTML");
  else report("WARN", "no google-adsense-account meta tag (add when applying)");
}

// trust pages
console.log("");
for (const p of requiredPages) {
  const page = await get(p);
  // Contact, about and disclosure pages can be short; privacy and terms cannot.
  const info = auditPage(page, p, { required: true, min: /privacy|terms/.test(p) ? 250 : 80 });
  if (info && p.includes("privacy")) {
    for (const term of ["cookie", "Google", "advertis", "affiliate"]) {
      if (!new RegExp(term, "i").test(info.text)) report("WARN", `${p}: never mentions "${term}"`);
    }
  }
}

// sitemap crawl
if (crawlLimit > 0 && sameOrigin.length) {
  const sample = sameOrigin.slice(0, crawlLimit);
  console.log(`\nCrawling ${sample.length} of ${sameOrigin.length} sitemap URLs`);
  const titles = new Map();
  let thin = 0;
  let indexable = 0;
  for (const url of sample) {
    const page = await get(url);
    const info = auditPage(page, new URL(url).pathname);
    if (!info) continue;
    if (info.noindex) report("WARN", `${new URL(url).pathname}: listed in sitemap but noindex`);
    else {
      indexable++;
      if (info.words < minWords) thin++;
      titles.set(info.title, [...(titles.get(info.title) || []), new URL(url).pathname]);
    }
  }
  for (const [title, paths] of titles) {
    if (paths.length > 1) report("WARN", `duplicate <title> "${title.slice(0, 60)}" on ${paths.length} pages, e.g. ${paths.slice(0, 3).join(", ")}`);
  }
  if (indexable && thin / indexable > 0.3) {
    report("FAIL", `${thin}/${indexable} indexable pages are thin (<${minWords} words): high risk of "low value content" rejection`);
  }
}

console.log(`\n${results.PASS} pass, ${results.WARN} warn, ${results.FAIL} fail`);
process.exit(results.FAIL ? 1 : 0);
