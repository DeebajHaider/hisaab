import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";

export type Target = Database["public"]["Tables"]["targets"]["Row"];

/**
 * Fetch all targets in a budget. No embedded join — category_ids/item_ids
 * are plain Postgres arrays, which Supabase's embedded-resource syntax
 * doesn't support. Names are resolved client-side against the categories/
 * items lists the Targets page already loads for the form dialog's pickers.
 */
export function useTargets(budgetId: string | undefined) {
  return useQuery({
    queryKey: ["targets", budgetId],
    enabled: !!budgetId,
    queryFn: async (): Promise<Target[]> => {
      const { data, error } = await supabase
        .from("targets")
        .select("*")
        .eq("budget_id", budgetId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
