// Cache key for a single holding's value history. Keyed by holding id so each
// holding's series caches independently.
export const holdingHistoryKeys = {
  forHolding: (holdingId: string) => ["holding-history", holdingId] as const,
};
