import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { transactionKeys } from "./transaction-keys";
import {
  firstDayOfMonth,
  lastDayOfMonth,
  type YearMonth,
} from "@/lib/format/year-month";

/**
 * Fetch all transactions for a given budget and month.
 *
 * Mirrors the select shape of useTransactions (joins item, category, person)
 * but ranges across an entire calendar month instead of a single day.
 *
 * Ordered by transaction_date ascending then created_at ascending so the
 * resulting list reads chronologically — important for the month view's
 * grouping by day in 3.6 and the trends aggregations in 3.5.
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
    enabled: Boolean(budgetId && yearMonth),
    queryFn: async () => {
      // Narrowed by `enabled`, but TS needs a guard.
      if (!budgetId || !yearMonth) return [];

      const start = firstDayOfMonth(yearMonth);
      const end = lastDayOfMonth(yearMonth);

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          id,
          transaction_date,
          amount,
          rate,
          qty,
          mode,
          notes,
          created_at,
          item_id,
          person_id,
          item:items (
            id,
            name,
            unit,
            category:categories ( id, name, tracks_person )
          ),
          person:people ( id, name )
          `,
        )
        .eq("budget_id", budgetId)
        .gte("transaction_date", start)
        .lte("transaction_date", end)
        .order("transaction_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}