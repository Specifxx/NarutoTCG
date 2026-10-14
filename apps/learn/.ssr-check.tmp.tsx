import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { ProgressProvider } from "@/lib/progress";
import KeywordsPage from "@/app/keywords/page";

const html = renderToString(createElement(ProgressProvider, null, createElement(KeywordsPage)));
console.log("length", html.length);
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
console.log("ids", ids.length, "dupes", JSON.stringify(dupes));
for (const needle of ['id="ambush"', 'id="powerup"', 'id="exhaust"', 'id="glossary-search"', "Keywords &amp; ", "Not an official keyword", "aria-pressed", 'role="status"']) {
  console.log(needle, html.includes(needle));
}
console.log("li count", (html.match(/<li[^>]*id="/g) ?? []).length);
