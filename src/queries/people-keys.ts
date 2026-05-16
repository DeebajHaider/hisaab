// Cache key factory for people.
// Mirrors the [resource, budgetId, ...keys] hierarchy used elsewhere
// so byBudget invalidation cascades to all sub-queries (active/archived).

export const peopleKeys = {
  all: ["people"] as const,
  byBudget: (budgetId: string) => ["people", budgetId] as const,
  byBudgetWithArchived: (budgetId: string, includeArchived: boolean) =>
    ["people", budgetId, includeArchived] as const,
};
