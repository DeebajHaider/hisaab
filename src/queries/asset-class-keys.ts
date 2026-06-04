// Cache keys for asset classes. Same convention as peopleKeys:
// the includeArchived flag is part of the key so archived/active views cache
// separately, while allForPortfolio is the prefix used for invalidation
// (it matches both the true and false variants).
export const assetClassKeys = {
  allForPortfolio: (portfolioId: string) => ["asset-classes", portfolioId] as const,
  byPortfolio: (portfolioId: string, includeArchived: boolean) =>
    ["asset-classes", portfolioId, includeArchived] as const,
};
