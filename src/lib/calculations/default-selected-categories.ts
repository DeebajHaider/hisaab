const THRESHOLD_PERCENT = 5;
const MAX_DEFAULT = 8;
const FALLBACK_COUNT = 5;

interface RankedCategory {
  name: string;
  total: number;
}

/**
 * Pick a reasonable default selection of categories for the comparison
 * chart. Goal: useful out of the box without overwhelming the user.
 *
 * Algorithm:
 *   1. Filter to categories whose share of total spend is >= 5%
 *   2. If zero hit the threshold (extreme dominance case), fall back to
 *      top 5 by total spend
 *   3. Otherwise take up to top 8 from the threshold-passers
 *
 * Input must already be sorted by total descending (e.g. the `categories`
 * field on aggregateByCategoryAndMonth's result, paired with totals).
 */
export function defaultSelectedCategories(
  ranked: RankedCategory[],
  totalSpend: number,
): string[] {
  if (ranked.length === 0 || totalSpend <= 0) return [];

  const threshold = (totalSpend * THRESHOLD_PERCENT) / 100;
  const aboveThreshold = ranked.filter((c) => c.total >= threshold);

  if (aboveThreshold.length === 0) {
    return ranked.slice(0, FALLBACK_COUNT).map((c) => c.name);
  }

  return aboveThreshold.slice(0, MAX_DEFAULT).map((c) => c.name);
}
