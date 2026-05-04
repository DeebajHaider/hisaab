import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";

export type Category = Database["public"]["Tables"]["categories"]["Row"];

/**
 * Fetch categories for a budget, sorted by sort_order.
 * Excludes archived categories by default.
 */
export function useCategories(
  budgetId: string | undefined,
  opts: { includeArchived?: boolean } = {},
) {
  return useQuery({
    queryKey: ["categories", budgetId, opts.includeArchived ?? false],
    enabled: !!budgetId,
    queryFn: async (): Promise<Category[]> => {
      let query = supabase
        .from("categories")
        .select("*")
        .eq("budget_id", budgetId!);

      if (!opts.includeArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query.order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
