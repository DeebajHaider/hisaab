/**
 * Cache key factory for savings_entries queries.
 * Mirrors incomeKeys exactly — same hierarchy and invalidation semantics.
 */
export const savingsKeys = {
  all: ["savings"] as const,
  byBudget: (budgetId: string) => ["savings", budgetId] as const,
  byMonth: (budgetId: string, yearMonth: string) =>
    ["savings", budgetId, "month", yearMonth] as const,
};