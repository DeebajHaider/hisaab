import type { YearMonth } from "@/lib/format/year-month";
import type {
  AggregateResult,
  CategoryMonthRow,
} from "./aggregate-by-category-month";

export type CategoryMonthTotalsRow = {
  yearMonth: string;
  categoryId: string;
  categoryName: string;
  total: number;
};

/**
 * Accepts narrow rows from the budget_monthly_category_totals RPC and
 * produces the same AggregateResult shape as aggregateByCategoryAndMonth.
 *
 * The SQL function handles aggregation (sum per yearMonth × category).
 * This function handles the reshape only:
 *   - pivot narrow rows → one wide CategoryMonthRow per yearMonth
 *   - rank categories by summing totals across months
 *
 * Float-safety note: row totals arrive as JavaScript numbers, already
 * precisely summed by Postgres numeric arithmetic. The cross-month
 * ranking sum may carry small floating-point error, but ordering is
 * unaffected at any realistic amount.
 */
export function pivotCategoryTotals(
  rows: CategoryMonthTotalsRow[],
): AggregateResult {
  const monthMap = new Map<YearMonth, CategoryMonthRow>();
  const categoryTotals = new Map<string, number>();

  for (const row of rows) {
    if (!monthMap.has(row.yearMonth)) {
      monthMap.set(row.yearMonth, { yearMonth: row.yearMonth });
    }
    monthMap.get(row.yearMonth)![row.categoryName] = row.total;

    categoryTotals.set(
      row.categoryName,
      (categoryTotals.get(row.categoryName) ?? 0) + row.total,
    );
  }

  // Rows arrive ORDER BY year_month from the RPC; Map preserves insertion order.
  const resultRows = Array.from(monthMap.values());

  // Mirrors the sort in aggregateByCategoryAndMonth so downstream consumers
  // (defaultSelectedCategories, legend ordering) behave identically.
  const categories = Array.from(categoryTotals.entries())
    .sort(([nameA, totA], [nameB, totB]) => {
      if (totB !== totA) return totB - totA;
      return nameA.localeCompare(nameB);
    })
    .map(([name]) => name);

  return { rows: resultRows, categories };
}
