import { describe, it, expect } from "vitest";
import { defaultSelectedCategories } from "./default-selected-categories";

describe("defaultSelectedCategories", () => {
  it("returns empty array for empty input", () => {
    expect(defaultSelectedCategories([], 1000)).toEqual([]);
  });

  it("returns top 5 when no category hits the 5% threshold", () => {
    // 11 categories of roughly equal small share where one dominates
    const ranked = [
      { name: "Big", total: 9900 },
      { name: "A", total: 10 },
      { name: "B", total: 10 },
      { name: "C", total: 10 },
      { name: "D", total: 10 },
      { name: "E", total: 10 },
      { name: "F", total: 10 },
      { name: "G", total: 10 },
      { name: "H", total: 10 },
      { name: "I", total: 10 },
      { name: "J", total: 10 },
    ];
    // Big is 99%. Others all <0.1%. None of the small ones hit 5%.
    // But Big does — so 1 hits threshold. Top 5 fallback only kicks in
    // when ZERO hit it. So this is "1 hits threshold" case.
    expect(defaultSelectedCategories(ranked, 10010)).toEqual(["Big"]);
  });

  it("falls back to top 5 when literally zero hit the threshold", () => {
    // 30 tiny equal categories — none reach 5%
    const ranked = Array.from({ length: 30 }, (_, i) => ({
      name: `Cat${String(i).padStart(2, "0")}`,
      total: 100,
    }));
    const total = 3000;
    const result = defaultSelectedCategories(ranked, total);
    expect(result).toHaveLength(5);
    // Top 5 by total — since all equal, tie-break by alphabetical from rank
    expect(result).toEqual(["Cat00", "Cat01", "Cat02", "Cat03", "Cat04"]);
  });

  it("returns all categories that meet the 5% threshold (1-8 case)", () => {
    const ranked = [
      { name: "A", total: 400 },  // 40%
      { name: "B", total: 300 },  // 30%
      { name: "C", total: 200 },  // 20%
      { name: "D", total: 50 },   // 5%
      { name: "E", total: 30 },   // 3%
      { name: "F", total: 20 },   // 2%
    ];
    expect(defaultSelectedCategories(ranked, 1000)).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
  });

  it("caps at top 8 when more than 8 hit the threshold", () => {
    // 12 categories each ~8.3% (above 5% threshold)
    const ranked = Array.from({ length: 12 }, (_, i) => ({
      name: `Cat${String.fromCharCode(65 + i)}`,
      total: 100,
    }));
    const result = defaultSelectedCategories(ranked, 1200);
    expect(result).toHaveLength(8);
    expect(result).toEqual(["CatA", "CatB", "CatC", "CatD", "CatE", "CatF", "CatG", "CatH"]);
  });

  it("returns empty when total is zero", () => {
    const ranked = [{ name: "A", total: 0 }];
    expect(defaultSelectedCategories(ranked, 0)).toEqual([]);
  });
});

