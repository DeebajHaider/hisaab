/**
 * Cache key factory for income_entries queries.
 *
 * Hierarchy mirrors transactionKeys:
 *   ["income"]                                 — invalidate everything
 *   ["income", budgetId]                       — all of one budget
 *   ["income", budgetId, "month", yearMonth]   — one month within a budget
 *
 * Order matters: budgetId before "month" lets a single byBudget invalidation
 * cascade to all month sub-keys.
 */
export const incomeKeys = {
  all: ["income"] as const,
  byBudget: (budgetId: string) => ["income", budgetId] as const,
  byMonth: (budgetId: string, yearMonth: string) =>
    ["income", budgetId, "month", yearMonth] as const,
};