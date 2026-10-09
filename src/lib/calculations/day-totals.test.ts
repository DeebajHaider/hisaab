import {
  calculateDayTotal,
  groupTransactionsByCategory,
} from "./day-totals";
import type { TransactionWithRelations } from "@/queries/use-transactions";

// Minimal transaction fixture
function makeTransaction(
  overrides: Partial<TransactionWithRelations> & { id: string; amount: number },
): TransactionWithRelations {
  return {
    budget_id: "budget-1",
    category_id: overrides.category_id ?? "cat-1",
    item_id: "item-1",
    person_id: null,
    date: "2026-05-05",
    rate: null,
    qty: null,
    notes: null,
    tags: [],
    created_by: "user-1",
    created_at: "2026-05-05T10:00:00Z",
    item: { id: "item-1", name: "Item", unit: null },
    category: {
      id: overrides.category_id ?? "cat-1",
      name: "Default Category",
      tracks_person: false,
    },
    person: null,
    ...overrides,
  };
}

describe("calculateDayTotal", () => {
  it("returns 0 for empty transactions", () => {
    expect(calculateDayTotal([])).toBe(0);
  });

  it("sums amounts across transactions", () => {
    const txs = [
      makeTransaction({ id: "1", amount: 100 }),
      makeTransaction({ id: "2", amount: 250 }),
      makeTransaction({ id: "3", amount: 50.5 }),
    ];
    expect(calculateDayTotal(txs)).toBe(400.5);
  });

  it("handles fractional amounts without floating-point drift", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in raw JS — we want 0.3
    const txs = [
      makeTransaction({ id: "1", amount: 0.1 }),
      makeTransaction({ id: "2", amount: 0.2 }),
    ];
    expect(calculateDayTotal(txs)).toBe(0.3);
  });
});

describe("groupTransactionsByCategory", () => {
  it("returns empty array for no transactions", () => {
    expect(groupTransactionsByCategory([])).toEqual([]);
  });

  it("groups transactions under their categories", () => {
    const txs = [
      makeTransaction({
        id: "1",
        amount: 100,
        category_id: "groc",
        category: { id: "groc", name: "Groceries", tracks_person: false },
      }),
      makeTransaction({
        id: "2",
        amount: 50,
        category_id: "groc",
        category: { id: "groc", name: "Groceries", tracks_person: false },
      }),
      makeTransaction({
        id: "3",
        amount: 200,
        category_id: "veh",
        category: { id: "veh", name: "Vehicle", tracks_person: false },
      }),
    ];

    const result = groupTransactionsByCategory(txs);
    expect(result).toHaveLength(2);

    const groceries = result.find((g) => g.category.id === "groc");
    expect(groceries?.transactions).toHaveLength(2);
    expect(groceries?.subtotal).toBe(150);

    const vehicle = result.find((g) => g.category.id === "veh");
    expect(vehicle?.transactions).toHaveLength(1);
    expect(vehicle?.subtotal).toBe(200);
  });

  it("preserves transaction order within a category", () => {
    const txs = [
      makeTransaction({ id: "1", amount: 1, category_id: "g" }),
      makeTransaction({ id: "2", amount: 2, category_id: "g" }),
      makeTransaction({ id: "3", amount: 3, category_id: "g" }),
    ];
    const result = groupTransactionsByCategory(txs);
    expect(result[0].transactions.map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("orders categories alphabetically by name", () => {
    const txs = [
      makeTransaction({
        id: "1",
        amount: 1,
        category_id: "z",
        category: { id: "z", name: "Zucchini", tracks_person: false },
      }),
      makeTransaction({
        id: "2",
        amount: 1,
        category_id: "a",
        category: { id: "a", name: "Apple", tracks_person: false },
      }),
    ];
    const result = groupTransactionsByCategory(txs);
    expect(result.map((g) => g.category.name)).toEqual(["Apple", "Zucchini"]);
  });

  it("drops transactions with null category (defensive)", () => {
    // A transaction's category should never be null in practice (the FK enforces
    // it), but the join could return null in edge cases (RLS, deletion races).
    // Better to drop it from the grouping than crash.
    const txs = [
      makeTransaction({ id: "1", amount: 100 }),
      makeTransaction({ id: "2", amount: 50, category: null }),
    ];
    const result = groupTransactionsByCategory(txs);
    expect(result.flatMap((g) => g.transactions.map((t) => t.id))).toEqual(["1"]);
  });
});