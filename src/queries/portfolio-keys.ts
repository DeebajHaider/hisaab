// Cache keys for portfolio data. Same [resource, ...ids] convention as the
// budget-side factories, so prefix invalidation cascades the same way.
export const portfolioKeys = {
  all: ["portfolios"] as const,
  detail: (portfolioId: string) => ["portfolios", portfolioId] as const,
};