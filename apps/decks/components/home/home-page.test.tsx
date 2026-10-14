import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import NotFound from "@/app/not-found";
import HomePage from "@/app/page";
import { getSeedSnapshot } from "@/lib/data/meta";
import { SEED_TOURNAMENTS } from "@/lib/data/tournaments";
import { formatDate } from "@/lib/format";

const ids = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const hrefs = (html: string) => new Set([...html.matchAll(/\shref="([^"]+)"/g)].map((m) => m[1]!.replace(/&amp;/g, "&")));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("overview page", () => {
  it("renders every section without React warnings or duplicate ids", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const html = renderToStaticMarkup(<HomePage />);
    expect(errors).not.toHaveBeenCalled();

    const all = ids(html);
    expect(new Set(all).size).toBe(all.length);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain("Competitive meta");
    expect(html).toContain(`Meta as of`);
    expect(html).toContain(formatDate(getSeedSnapshot().dateRange!.to));
  });

  it("links the calls to action, the latest events and the methodology", () => {
    const links = hrefs(renderToStaticMarkup(<HomePage />));
    for (const href of ["/meta", "/decks", "/tournaments/import", "/tournaments", "/meta#methodology", "/decks?placement=winner"]) {
      expect(links, href).toContain(href);
    }
    for (const event of SEED_TOURNAMENTS.slice(0, 4)) expect(links).toContain(`/tournaments/${event.id}`);
    expect(links).not.toContain(`/tournaments/${SEED_TOURNAMENTS[4]!.id}`);
    expect([...links].filter((href) => href.startsWith("/templates/"))).toHaveLength(6);
    expect([...links].filter((href) => href.startsWith("/deck/")).length).toBeGreaterThanOrEqual(6);
  });
});

describe("404 page", () => {
  it("offers the main sections and the overview", () => {
    const html = renderToStaticMarkup(<NotFound />);
    const links = hrefs(html);
    for (const href of ["/meta", "/decks", "/tournaments", "/"]) expect(links).toContain(href);
    expect(html).toContain("<main");
  });
});
