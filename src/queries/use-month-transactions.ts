import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { transactionKeys } from "./transaction-keys";
import {
  firstDayOfMonth,
  lastDayOfMonth,
  type YearMonth,
} from "@/lib/format/year-month";
import type { TransactionWithRelations } from "./use-transactions";

/**
 * Fetch all transactions in a budget across an entire calendar month,
 * with item, category, and (optional) person info joined.
 *
 * Mirrors useTransactions exactly except:
 *   - date filter is a range, not equality
 *   - cache key is byMonth, not byDay
 *   - additional secondary sort by date so the result reads chronologically
 */
export function useMonthTransactions(
  budgetId: string | undefined,
  yearMonth: YearMonth | undefined,
) {
  return useQuery({
    queryKey:
      budgetId && yearMonth
        ? transactionKeys.byMonth(budgetId, yearMonth)
        : ["transactions", "noop"],
    enabled: !!budgetId && !!yearMonth,
    queryFn: async (): Promise<TransactionWithRelations[]> => {
      const start = firstDayOfMonth(yearMonth!);
      const end = lastDayOfMonth(yearMonth!);

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          item:items(id, name, unit),
          category:categories(id, name, tracks_person),
          person:people(id, name)
        `)
        .eq("budget_id", budgetId!)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data ?? []) as unknown as TransactionWithRelations[];
    },
  });
}