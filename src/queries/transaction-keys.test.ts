import { transactionKeys } from "./transaction-keys";

describe("transactionKeys", () => {
  describe("all", () => {
    it("returns the root key for invalidating all transaction queries", () => {
      expect(transactionKeys.all).toEqual(["transactions"]);
    });
  });

  describe("byBudget", () => {
    it("returns a key scoped to a budget, suitable for partial invalidation", () => {
      expect(transactionKeys.byBudget("budget-1")).toEqual([
        "transactions",
        "budget-1",
      ]);
    });
  });

  describe("byDay", () => {
    it("returns a key scoped to a budget and date", () => {
      expect(transactionKeys.byDay("budget-1", "2026-05-05")).toEqual([
        "transactions",
        "budget-1",
        "day",
        "2026-05-05",
      ]);
    });
  });

  describe("byMonth", () => {
    it("returns a key scoped to a budget and month", () => {
      expect(transactionKeys.byMonth("budget-1", "2026-05")).toEqual([
        "transactions",
        "budget-1",
        "month",
        "2026-05",
      ]);
    });
  });

  describe("hierarchy / partial invalidation", () => {
    it("byDay starts with byBudget so invalidating budget invalidates day", () => {
      // TanStack Query treats arrays as hierarchical: invalidating ['transactions', 'b1']
      // also invalidates ['transactions', 'b1', 'day', '...'] because the prefix matches.
      // This test documents the expected hierarchy.
      const budget = transactionKeys.byBudget("budget-1");
      const day = transactionKeys.byDay("budget-1", "2026-05-05");
      expect(day.slice(0, budget.length)).toEqual(budget);
    });

    it("byMonth starts with byBudget", () => {
      const budget = transactionKeys.byBudget("budget-1");
      const month = transactionKeys.byMonth("budget-1", "2026-05");
      expect(month.slice(0, budget.length)).toEqual(budget);
    });
  });
});