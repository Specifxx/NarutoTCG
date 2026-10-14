import { describe, expect, it } from "vitest";
import { duplicateHeaders, firstValue, mappedPreview, requirementLabel, unusedHeaders } from "./mapping";

const file = {
  kind: "pairings" as const,
  mapping: { round: "Rd", table: null, player1: "A", player2: "B", result: "Score", winner: null, stage: null },
  previewRows: [
    { Rd: "1", A: "Ann", B: "", Score: "", Extra: "x" },
    { Rd: "1", A: "Bo", B: "Cy", Score: "2-1", Extra: "y" },
  ],
};

describe("mapping helpers", () => {
  it("labels required fields and alternatives", () => {
    expect(requirementLabel("standings", "player")).toBe("Required");
    expect(requirementLabel("standings", "archetype")).toBeNull();
    expect(requirementLabel("pairings", "result")).toBe("Required (or Winner)");
    expect(requirementLabel("decklists", "cardId")).toBe("Required (or Card)");
  });

  it("finds duplicate and unused headers", () => {
    expect(duplicateHeaders({ a: "X", b: "X", c: "Y", d: null })).toEqual(["X"]);
    expect(unusedHeaders(["Rd", "A", "B", "Score", "Extra"], file.mapping)).toEqual(["Extra"]);
  });

  it("previews rows as mapped", () => {
    expect(firstValue(file, "result")).toBe("2-1");
    expect(firstValue(file, "winner")).toBe("");
    const preview = mappedPreview(file);
    expect(preview.fields.map((f) => f.key)).toEqual(["round", "player1", "player2", "result"]);
    expect(preview.rows).toEqual([
      ["1", "Ann", "", ""],
      ["1", "Bo", "Cy", "2-1"],
    ]);
  });
});
