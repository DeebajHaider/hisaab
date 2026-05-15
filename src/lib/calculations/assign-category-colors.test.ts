import { describe, it, expect } from "vitest";
import { assignCategoryColors, CHART_COLOR_COUNT } from "./assign-category-colors";

describe("assignCategoryColors", () => {
  it("returns a map with one entry per input category", () => {
    const result = assignCategoryColors(["A", "B", "C"]);
    expect(Object.keys(result)).toHaveLength(3);
  });

  it("returns valid CSS variable references for each category", () => {
    const result = assignCategoryColors(["Groceries"]);
    expect(result.Groceries).toMatch(/^var\(--chart-\d+\)$/);
  });

  it("is deterministic — same input gives same output", () => {
    const r1 = assignCategoryColors(["A", "B", "C"]);
    const r2 = assignCategoryColors(["A", "B", "C"]);
    expect(r1).toEqual(r2);
  });

  it("gives the same category the same color regardless of position in input", () => {
    const r1 = assignCategoryColors(["Groceries", "Bills"]);
    const r2 = assignCategoryColors(["Bills", "Groceries"]);
    expect(r1.Groceries).toBe(r2.Groceries);
    expect(r1.Bills).toBe(r2.Bills);
  });

  it("returns empty object for empty input", () => {
    expect(assignCategoryColors([])).toEqual({});
  });

  it("uses chart palette slots within the defined range", () => {
    const result = assignCategoryColors([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
    ]);
    for (const color of Object.values(result)) {
      const match = color.match(/^var\(--chart-(\d+)\)$/);
      expect(match).not.toBeNull();
      const slot = Number(match![1]);
      expect(slot).toBeGreaterThanOrEqual(1);
      expect(slot).toBeLessThanOrEqual(CHART_COLOR_COUNT);
    }
  });
});

