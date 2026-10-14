import { describe, expect, it } from "vitest";
import { pageItems } from "./page-items";

describe("pageItems", () => {
  it("returns a single page when there is only one", () => {
    expect(pageItems(1, 1)).toEqual([1]);
  });

  it("lists every page when nothing would be hidden", () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
    expect(pageItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("shows a lone skipped page instead of a gap", () => {
    expect(pageItems(1, 4)).toEqual([1, 2, 3, 4]);
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(pageItems(1, 5)).toEqual([1, 2, "gap", 5]);
  });

  it("collapses longer runs on either side of the current page", () => {
    expect(pageItems(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
    expect(pageItems(12, 12)).toEqual([1, "gap", 11, 12]);
    expect(pageItems(1, 12)).toEqual([1, 2, "gap", 12]);
  });
});
