import { calculatePercentContribution } from "./percent-contribution";

/**
 * The minimum subset of a transaction needed for a category breakdown.
 * Mirrors the shape of MonthSummaryInput minus the person fields, since
 * breakdowns don't care about per-person tracking.
 */
export interface CategoryBreakdownInput {
  amount: number;
  category: {
    name: string;
  } | null;
}

export interface CategoryBreakdownRow {
  categoryName: string;
  total: number;
  /** Percent of overall spend, rounded to 2 decimals. */
  percent: number;
}

/**
 * Aggregate transactions by category, returning rows sorted descending by
 * total (alphabetical tie-break). Each row includes its share of overall
 * spend as a percentage.
 *
 * Pure and float-safe: bucketing is done in integer cents to avoid IEEE 754
 * drift, then converted back to dollars at the boundary. Same pattern as
 * calculateMonthSummary.
 */
export function getCategoryBreakdown(
  transactions: CategoryBreakdownInput[],
): CategoryBreakdownRow[] {
  // Bucket by category name in cents.
  const cents = new Map<string, number>();
  let totalCents = 0;

  for (const t of transactions) {
    if (!t.category) continue;
    const tCents = Math.round(t.amount * 100);
    cents.set(t.category.name, (cents.get(t.category.name) ?? 0) + tCents);
    totalCents += tCents;
  }

  const totalDollars = totalCents / 100;

  return Array.from(cents.entries())
    .map(([categoryName, c]) => ({
      categoryName,
      total: c / 100,
      percent: calculatePercentContribution(c / 100, totalDollars),
    }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.categoryName.localeCompare(b.categoryName);
    });
}