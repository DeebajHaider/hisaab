import type { YearMonth } from "@/lib/format/year-month";

export interface AggregateByMonthInput {
  date: string; // yyyy-mm-dd
  amount: number;
}

export interface MonthlyTotal {
  yearMonth: YearMonth;
  total: number;
}

/**
 * Group transactions by their yearMonth (YYYY-MM, derived from the date
 * field) and return total spending per month, sorted chronologically.
 *
 * Returns only months that actually have data. Zero-filling missing months
 * is the responsibility of fillMonthGaps — keeping this helper sparse-only
 * lets it stay simple and reusable for callers that don't want zero-fill
 * (e.g., the category comparison chart in 3.6).
 *
 * Float-safe: internal sums are in integer minor units (paisa for PKR)
 * to avoid IEEE 754 drift, then converted back at the boundary.
 */
export function aggregateByMonth(
  transactions: AggregateByMonthInput[],
): MonthlyTotal[] {
  const buckets = new Map<YearMonth, number>();

  for (const t of transactions) {
    // yyyy-mm-dd → yyyy-mm (first 7 chars). Same approach as currentYearMonth
    // taking slice(0, 7) from today's ISO date.
    const ym = t.date.slice(0, 7);
    const paisa = Math.round(t.amount * 100);
    buckets.set(ym, (buckets.get(ym) ?? 0) + paisa);
  }

  return Array.from(buckets.entries())
    .map(([yearMonth, paisa]) => ({ yearMonth, total: paisa / 100 }))
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}