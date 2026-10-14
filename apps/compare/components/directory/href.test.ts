import { describe, expect, it } from "vitest";
import { homeHref, parseDirectorySearch } from "./href";

const canonical = (search: string) => {
  const { query, movers } = parseDirectorySearch(search);
  return homeHref(query, movers);
};

describe("parseDirectorySearch", () => {
  it("round-trips canonical directory URLs", () => {
    for (const href of ["/", "/?rarity=parallel,promo", "/?q=kakashi&set=NTG01&sort=price-asc&page=2&movers=30d"]) {
      expect(canonical(href.slice(1))).toBe(href);
    }
  });

  it("normalizes the URL the way the page does", () => {
    expect(canonical("?set=ntg01&set=NTG02&rarity=bogus&q=%20kakashi%20&page=0&movers=90d&utm_source=x")).toBe(
      "/?q=kakashi&set=NTG01,NTG02",
    );
  });

  it("treats an empty search as the default directory", () => {
    expect(parseDirectorySearch("")).toEqual(parseDirectorySearch("?"));
    expect(canonical("")).toBe("/");
  });
});
