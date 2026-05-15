/**
 * Cache key factory for trends queries (aggregations over date ranges).
 *
 * Conceptually separate from transactionKeys (which are per-day or per-month
 * fetches) — but both invalidate on the same triggers. Transaction mutations
 * invalidate trendsKeys.byBudget so charts refresh when data changes.
 *
 *   ['trends']                                              → all trends
 *   ['trends', budgetId]                                    → one budget
 *   ['trends', budgetId, 'monthly', from, to]               → range
 *   ['trends', budgetId, 'earliest']                        → earliest month
 */
export const trendsKeys = {
  all: ["trends"] as const,
  byBudget: (budgetId: string) => ["trends", budgetId] as const,
  monthlyTotals: (budgetId: string, from: string, to: string) =>
    ["trends", budgetId, "monthly", from, to] as const,
  monthlyCategoryTotals: (budgetId: string, from: string, to: string) =>
    ["trends", budgetId, "monthly-by-category", from, to] as const,
  earliest: (budgetId: string) =>
    ["trends", budgetId, "earliest"] as const,
};