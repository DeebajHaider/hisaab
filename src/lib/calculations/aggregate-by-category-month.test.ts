import { describe, it, expect } from "vitest";
import {
  aggregateByCategoryAndMonth,
  type AggregateByCategoryMonthInput,
} from "./aggregate-by-category-month";

function tx(
  overrides: Partial<AggregateByCategoryMonthInput> = {},
): AggregateByCategoryMonthInput {
  return {
    date: "2026-05-15",
    amount: 100,
    category: { name: "Groceries" },
    ...overrides,
  };
}

describe("aggregateByCategoryAndMonth", () => {
  it("returns empty rows and empty categories for empty input", () => {
    expect(aggregateByCategoryAndMonth([])).toEqual({
      rows: [],
      categories: [],
    });
  });

  it("groups by month and category, producing Recharts-ready rows", () => {
    const result = aggregateByCategoryAndMonth([
      tx({ date: "2026-05-10", amount: 100, category: { name: "Groceries" } }),
      tx({ date: "2026-05-22", amount: 50, category: { name: "Bills" } }),
      tx({ date: "2026-06-01", amount: 200, category: { name: "Groceries" } }),
    ]);

    expect(result.rows).toEqual([
      { yearMonth: "2026-05", Groceries: 100, Bills: 50 },
      { yearMonth: "2026-06", Groceries: 200 },
    ]);
    // Categories list reflects all that appear, sorted by total descending
    expect(result.categories).toEqual(["Groceries", "Bills"]);
  });

  it("sorts rows chronologically regardless of input order", () => {
    const result = aggregateByCategoryAndMonth([
      tx({ date: "2026-06-01", category: { name: "A" } }),
      tx({ date: "2026-04-15", category: { name: "A" } }),
      tx({ date: "2026-05-15", category: { name: "A" } }),
    ]);
    expect(result.rows.map((r) => r.yearMonth)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
    ]);
  });

  it("ranks categories by total spend descending, alphabetical tie-break", () => {
    const result = aggregateByCategoryAndMonth([
      tx({ amount: 100, category: { name: "Zebra" } }),
      tx({ amount: 100, category: { name: "Apple" } }),
      tx({ amount: 300, category: { name: "Middle" } }),
    ]);
    expect(result.categories).toEqual(["Middle", "Apple", "Zebra"]);
  });

  it("ignores transactions with no category", () => {
    const result = aggregateByCategoryAndMonth([
      tx({ amount: 50, category: null }),
      tx({ amount: 100, category: { name: "Groceries" } }),
    ]);
    expect(result.categories).toEqual(["Groceries"]);
    expect(result.rows).toEqual([{ yearMonth: "2026-05", Groceries: 100 }]);
  });

  it("is float-safe via paisa-based arithmetic", () => {
    const result = aggregateByCategoryAndMonth([
      tx({ date: "2026-05-10", amount: 0.1, category: { name: "A" } }),
      tx({ date: "2026-05-11", amount: 0.2, category: { name: "A" } }),
    ]);
    expect(result.rows).toEqual([{ yearMonth: "2026-05", A: 0.3 }]);
  });

  it("rows do not include category keys for months with zero spend in that category", () => {
    // Groceries in May, Bills in June. May's row should not have Bills: 0
    // and June's row should not have Groceries: 0. Zero-fill is the chart
    // component's responsibility per the 3.5 pattern.
    const result = aggregateByCategoryAndMonth([
      tx({ date: "2026-05-10", category: { name: "Groceries" } }),
      tx({ date: "2026-06-10", category: { name: "Bills" } }),
    ]);
    expect(result.rows).toEqual([
      { yearMonth: "2026-05", Groceries: 100 },
      { yearMonth: "2026-06", Bills: 100 },
    ]);
  });
});
