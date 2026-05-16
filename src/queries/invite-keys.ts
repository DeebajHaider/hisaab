// Cache key factory for budget_invites.
// Mirrors the [resource, budgetId, ...keys] hierarchy used elsewhere so
// invalidation at the byBudget level cascades to all sub-queries.

export const inviteKeys = {
  all: ["invites"] as const,
  byBudget: (budgetId: string) => ["invites", budgetId] as const,
  byToken: (token: string) => ["invites", "token", token] as const,
};

