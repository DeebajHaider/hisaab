// Cache key factory for budget_members.
// Mirrors the [resource, budgetId, ...keys] hierarchy used elsewhere
// so byBudget invalidation cascades correctly.

export const memberKeys = {
  all: ["members"] as const,
  byBudget: (budgetId: string) => ["members", budgetId] as const,
};

