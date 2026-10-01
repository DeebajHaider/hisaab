/**
 * Cache key factories for transaction queries.
 *
 * Hierarchy (matters for partial invalidation):
 *   ['transactions']                          → all transaction queries
 *   ['transactions', budgetId]                → all transactions in a budget
 *   ['transactions', budgetId, 'day', date]   → one day's transactions
 *   ['transactions', budgetId, 'month', ym]   → one month's transactions
 *   ['transactions', budgetId, 'ledger', ...] → filtered ledger view
 *
 * Invalidating a parent key invalidates all children automatically because
 * TanStack Query does prefix-matching by default.
 *
 * Always use these factories instead of inline arrays — keeps invalidation
 * patterns consistent across mutations.
 */
export const transactionKeys = {
  all: ["transactions"] as const,

  byBudget: (budgetId: string) => ["transactions", budgetId] as const,

  byDay: (budgetId: string, date: string) =>
    ["transactions", budgetId, "day", date] as const,

  byMonth: (budgetId: string, yearMonth: string) =>
    ["transactions", budgetId, "month", yearMonth] as const,

  ledger: (
    budgetId: string,
    from: string,
    to: string,
    categoryIds: string[],
    itemIds: string[],
  ) =>
    [
      "transactions",
      budgetId,
      "ledger",
      from,
      to,
      [...categoryIds].sort(),
      [...itemIds].sort(),
    ] as const,
};