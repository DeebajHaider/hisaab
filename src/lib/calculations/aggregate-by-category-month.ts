import type { YearMonth } from "@/lib/format/year-month";

export interface AggregateByCategoryMonthInput {
  date: string; // yyyy-mm-dd
  amount: number;
  category: { name: string } | null;
}

/**
 * One row per month, with category names as dynamic keys and totals as
 * values. The shape Recharts expects for multi-series line and stacked
 * bar charts. Months with zero spend in a particular category just omit
 * that key — fillCategoryGaps backfills zeros for the chart.
 */
export interface CategoryMonthRow {
  yearMonth: YearMonth;
  [categoryName: string]: number | string;
}

export interface AggregateResult {
  rows: CategoryMonthRow[];
  /** All category names that appear, sorted by total spend descending. */
  categories: string[];
}

/**
 * Aggregate transactions into a Recharts-friendly shape: one row per
 * month, with each category appearing as a dynamic numeric key.
 *
 * Also returns the full set of categories sorted by their total spend
 * across the input — used downstream by defaultSelectedCategories and
 * by the legend ordering in the composition chart.
 *
 * Float-safe via paisa-based integer arithmetic (matches the patterns
 * in aggregateByMonth and calculateMonthSummary).
 */
export function aggregateByCategoryAndMonth(
  transactions: AggregateByCategoryMonthInput[],
): AggregateResult {
  // Two-level bucket: month -> category -> paisa
  const buckets = new Map<YearMonth, Map<string, number>>();
  // Track category totals across the whole range for ranking
  const categoryTotals = new Map<string, number>();

  for (const t of transactions) {
    if (!t.category) continue;
    const ym = t.date.slice(0, 7);
    const paisa = Math.round(t.amount * 100);

    if (!buckets.has(ym)) buckets.set(ym, new Map());
    const monthBucket = buckets.get(ym)!;
    monthBucket.set(
      t.category.name,
      (monthBucket.get(t.category.name) ?? 0) + paisa,
    );

    categoryTotals.set(
      t.category.name,
      (categoryTotals.get(t.category.name) ?? 0) + paisa,
    );
  }

  // Build chronologically-sorted rows.
  const rows: CategoryMonthRow[] = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearMonth, monthBucket]) => {
      const row: CategoryMonthRow = { yearMonth };
      for (const [name, paisa] of monthBucket) {
        row[name] = paisa / 100;
      }
      return row;
    });

  // Categories ranked by total spend descending, alphabetical tie-break.
  const categories = Array.from(categoryTotals.entries())
    .sort(([nameA, totA], [nameB, totB]) => {
      if (totB !== totA) return totB - totA;
      return nameA.localeCompare(nameB);
    })
    .map(([name]) => name);

  return { rows, categories };
}
