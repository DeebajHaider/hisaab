import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";

export type IncomeTemplate = Database["public"]["Tables"]["income_templates"]["Row"];

/** A budget's income templates, in the order they were arranged. */
export function useIncomeTemplates(
  budgetId: string | undefined,
  opts: { includeArchived?: boolean } = {},
) {
  return useQuery({
    queryKey: ["income-templates", budgetId, opts.includeArchived ?? false],
    enabled: !!budgetId,
    queryFn: async (): Promise<IncomeTemplate[]> => {
      let query = supabase.from("income_templates").select("*").eq("budget_id", budgetId!);
      if (!opts.includeArchived) query = query.eq("is_archived", false);

      const { data, error } = await query.order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
