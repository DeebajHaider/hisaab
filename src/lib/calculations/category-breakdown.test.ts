import { describe, it, expect } from "vitest";
import {
  getCategoryBreakdown,
  type CategoryBreakdownInput,
} from "./category-breakdown";

// Test data builder — keeps tests readable.
function tx(overrides: Partial<CategoryBreakdownInput> = {}): CategoryBreakdownInput {
  return {
    amount: 100,
    category: { name: "Groceries" },
    ...overrides,
  };
}

describe("getCategoryBreakdown", () => {
  it("groups transactions by category and sums amounts", () => {
    const result = getCategoryBreakdown([
      tx({ amount: 100, category: { name: "Groceries" } }),
      tx({ amount: 50, category: { name: "Groceries" } }),
      tx({ amount: 200, category: { name: "Bills" } }),
    ]);

    expect(result).toEqual([
      { categoryName: "Bills", total: 200, percent: 57.14 },
      { categoryName: "Groceries", total: 150, percent: 42.86 },
    ]);
  });

  it("returns an empty array when there are no transactions", () => {
    expect(getCategoryBreakdown([])).toEqual([]);
  });

  it("sorts descending by total", () => {
    const result = getCategoryBreakdown([
      tx({ amount: 50, category: { name: "Small" } }),
      tx({ amount: 500, category: { name: "Large" } }),
      tx({ amount: 100, category: { name: "Medium" } }),
    ]);

    expect(result.map((r) => r.categoryName)).toEqual([
      "Large",
      "Medium",
      "Small",
    ]);
  });

  it("breaks ties on total by sorting alphabetically by name", () => {
    const result = getCategoryBreakdown([
      tx({ amount: 100, category: { name: "Zebra" } }),
      tx({ amount: 100, category: { name: "Apple" } }),
    ]);

    expect(result.map((r) => r.categoryName)).toEqual(["Apple", "Zebra"]);
  });

  it("ignores transactions with no category", () => {
    const result = getCategoryBreakdown([
      tx({ amount: 50, category: null }),
      tx({ amount: 100, category: { name: "Groceries" } }),
    ]);

    expect(result).toEqual([
      { categoryName: "Groceries", total: 100, percent: 100 },
    ]);
  });

  it("computes percentages that sum to roughly 100%", () => {
    // With rounding at 2 decimals, percentages may not sum to exactly 100,
    // but should be within rounding tolerance.
    const result = getCategoryBreakdown([
      tx({ amount: 33.33, category: { name: "A" } }),
      tx({ amount: 33.33, category: { name: "B" } }),
      tx({ amount: 33.34, category: { name: "C" } }),
    ]);

    const sum = result.reduce((s, r) => s + r.percent, 0);
    expect(sum).toBeGreaterThan(99.99);
    expect(sum).toBeLessThan(100.01);
  });

  it("handles floating-point amounts without precision drift", () => {
    // Classic 0.1 + 0.2 trap — must not produce 0.30000000000000004.
    const result = getCategoryBreakdown([
      tx({ amount: 0.1, category: { name: "A" } }),
      tx({ amount: 0.2, category: { name: "A" } }),
    ]);

    expect(result[0].total).toBe(0.3);
  });
});
