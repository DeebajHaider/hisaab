import { pivotCategoryTotals } from "./pivot-category-totals";

describe("pivotCategoryTotals", () => {
  it("returns empty rows and categories for no input", () => {
    expect(pivotCategoryTotals([])).toEqual({ rows: [], categories: [] });
  });

  it("produces one row per unique yearMonth", () => {
    const rows = [
      { yearMonth: "2024-01", categoryId: "a", categoryName: "Groceries", total: 15000 },
      { yearMonth: "2024-01", categoryId: "b", categoryName: "Transport", total: 8000 },
      { yearMonth: "2024-02", categoryId: "a", categoryName: "Groceries", total: 12000 },
    ];
    expect(pivotCategoryTotals(rows).rows).toHaveLength(2);
  });

  it("places each category total under its name as a key in the row", () => {
    const rows = [
      { yearMonth: "2024-01", categoryId: "a", categoryName: "Groceries", total: 15000 },
      { yearMonth: "2024-01", categoryId: "b", categoryName: "Transport", total: 8000 },
    ];
    expect(pivotCategoryTotals(rows).rows).toEqual([
      { yearMonth: "2024-01", Groceries: 15000, Transport: 8000 },
    ]);
  });

  it("leaves keys absent for months where a category has no spend", () => {
    // January has both categories; February has only Groceries.
    // February's row must not carry a Transport key — the chart connects
    // through the gap, which is the documented Phase 3 behaviour.
    const rows = [
      { yearMonth: "2024-01", categoryId: "a", categoryName: "Groceries", total: 15000 },
      { yearMonth: "2024-01", categoryId: "b", categoryName: "Transport", total: 8000 },
      { yearMonth: "2024-02", categoryId: "a", categoryName: "Groceries", total: 12000 },
    ];
    const { rows: resultRows } = pivotCategoryTotals(rows);
    expect(resultRows[1]).toEqual({ yearMonth: "2024-02", Groceries: 12000 });
    expect(resultRows[1]).not.toHaveProperty("Transport");
  });

  it("preserves the yearMonth ordering from the input", () => {
    // The RPC returns ORDER BY year_month; Map insertion order is stable.
    const rows = [
      { yearMonth: "2024-01", categoryId: "a", categoryName: "Groceries", total: 15000 },
      { yearMonth: "2024-02", categoryId: "a", categoryName: "Groceries", total: 12000 },
      { yearMonth: "2024-03", categoryId: "a", categoryName: "Groceries", total: 13000 },
    ];
    expect(pivotCategoryTotals(rows).rows.map((r) => r["yearMonth"])).toEqual([
      "2024-01",
      "2024-02",
      "2024-03",
    ]);
  });

  it("returns categories sorted by total spend descending", () => {
    const rows = [
      { yearMonth: "2024-01", categoryId: "a", categoryName: "Groceries", total: 15000 },
      { yearMonth: "2024-01", categoryId: "b", categoryName: "Transport", total: 8000 },
      { yearMonth: "2024-02", categoryId: "c", categoryName: "Utilities", total: 20000 },
    ];
    // Utilities: 20000, Groceries: 15000, Transport: 8000
    expect(pivotCategoryTotals(rows).categories).toEqual([
      "Utilities",
      "Groceries",
      "Transport",
    ]);
  });

  it("uses alphabetical order as a tie-break for equal category totals", () => {
    const rows = [
      { yearMonth: "2024-01", categoryId: "a", categoryName: "Groceries", total: 10000 },
      { yearMonth: "2024-01", categoryId: "b", categoryName: "Apparel", total: 10000 },
    ];
    expect(pivotCategoryTotals(rows).categories).toEqual(["Apparel", "Groceries"]);
  });
});