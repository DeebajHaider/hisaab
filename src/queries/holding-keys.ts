export const holdingKeys = {
  allForPortfolio: (portfolioId: string) => ["holdings", portfolioId] as const,
  byPortfolio: (portfolioId: string, includeArchived: boolean) =>
    ["holdings", portfolioId, includeArchived] as const,
};

