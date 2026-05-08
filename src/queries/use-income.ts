import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { incomeKeys } from "./income-keys";
import {
  firstDayOfMonth,
  lastDayOfMonth,
  type YearMonth,
} from "@/lib/format/year-month";
import type { Database } from "@/types/db";

export type IncomeEntry = Database["public"]["Tables"]["income_entries"]["Row"];

/**
 * Fetch all income entries in a budget for a given month, ordered by date
 * ascending then created_at ascending so the list reads chronologically.
 */
export function useIncome(
  budgetId: string | undefined,
  yearMonth: YearMonth | undefined,
) {
  return useQuery({
    queryKey:
      budgetId && yearMonth
        ? incomeKeys.byMonth(budgetId, yearMonth)
        : ["income", "noop"],
    enabled: !!budgetId && !!yearMonth,
    queryFn: async (): Promise<IncomeEntry[]> => {
      const start = firstDayOfMonth(yearMonth!);
      const end = lastDayOfMonth(yearMonth!);

      const { data, error } = await supabase
        .from("income_entries")
        .select("*")
        .eq("budget_id", budgetId!)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}