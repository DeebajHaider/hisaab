import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { trendsKeys } from "./trends-keys";
import {
  firstDayOfMonth,
  lastDayOfMonth,
  type YearMonth,
} from "@/lib/format/year-month";
import { pivotCategoryTotals } from "@/lib/calculations/pivot-category-totals";

/**
 * Fetch monthly spending totals broken down by category via server-side
 * aggregation, returning Recharts-wide rows for the comparison and
 * composition charts.
 *
 * The SQL function aggregates to narrow rows (one per yearMonth × category);
 * pivotCategoryTotals() reshapes them into the wide format Recharts expects,
 * with one key per category name.
 */
export function useMonthlyCategoryTotals(
  budgetId: string | undefined,
  from: YearMonth | undefined,
  to: YearMonth | undefined,
) {
  return useQuery({
    queryKey:
      budgetId && from && to
        ? trendsKeys.monthlyCategoryTotals(budgetId, from, to)
        : ["trends", "noop"],
    enabled: !!budgetId && !!from && !!to,
    queryFn: async () => {
      const start = firstDayOfMonth(from!);
      const end = lastDayOfMonth(to!);

      const { data, error } = await supabase.rpc(
        "budget_monthly_category_totals",
        {
          b_id: budgetId!,
          start_date: start,
          end_date: end,
        },
      );

      if (error) throw error;

      return pivotCategoryTotals(
        (data ?? []).map((row) => ({
          yearMonth: row.year_month,
          categoryId: row.category_id,
          categoryName: row.category_name,
          total: Number(row.total),
        })),
      );
    },
  });
}
