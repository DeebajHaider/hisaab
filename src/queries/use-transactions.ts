import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { transactionKeys } from "./transaction-keys";
import type { Database } from "@/types/db";

// Base row from schema
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

// Display-ready transaction with item + category + person nested.
// We narrow the join shape so TypeScript knows what fields exist.
export type TransactionWithRelations = Transaction & {
  item: {
    id: string;
    name: string;
    unit: string | null;
  } | null;
  category: {
    id: string;
    name: string;
    tracks_person: boolean;
  } | null;
  person: {
    id: string;
    name: string;
  } | null;
};

/**
 * Fetch all transactions in a budget for a specific date, with item, category,
 * and (optional) person info joined.
 *
 * date is a yyyy-mm-dd string.
 */
export function useTransactions(
  budgetId: string | undefined,
  date: string | undefined,
) {
  return useQuery({
    queryKey: budgetId && date ? transactionKeys.byDay(budgetId, date) : ["transactions", "noop"],
    enabled: !!budgetId && !!date,
    queryFn: async (): Promise<TransactionWithRelations[]> => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          item:items(id, name, unit),
          category:categories(id, name, tracks_person),
          person:people(id, name)
        `)
        .eq("budget_id", budgetId!)
        .eq("date", date!)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Cast through unknown for the same reason as useItems — Supabase's
      // type inference doesn't perfectly capture custom join shapes.
      return (data ?? []) as unknown as TransactionWithRelations[];
    },
  });
}