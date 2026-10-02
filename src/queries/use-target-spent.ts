import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { roundToCents } from "@/lib/calculations/day-totals";
import type { Target } from "./use-targets";

/**
 * Sum of every transaction matching a target's trackers (category in
 * category_ids OR item in item_ids) within its date range. One query per
 * target, called from each TargetCard — React Query parallelizes these
 * naturally, same pattern as the per-row transaction-count query in
 * manage.tsx's PermanentDeleteDialog.
 */
export function useTargetSpent(budgetId: string | undefined, target: Target) {
  return useQuery({
    queryKey: ["target-spent", target.id],
    enabled: !!budgetId,
    queryFn: async (): Promise<number> => {
      let query = supabase
        .from("transactions")
        .select("amount")
        .eq("budget_id", budgetId!)
        .gte("date", target.start_date)
        .lte("date", target.end_date);

      const categoryIds = target.category_ids;
      const itemIds = target.item_ids;

      if (categoryIds.length > 0 && itemIds.length > 0) {
        query = query.or(
          `category_id.in.(${categoryIds.join(",")}),item_id.in.(${itemIds.join(",")})`,
        );
      } else if (categoryIds.length > 0) {
        query = query.in("category_id", categoryIds);
      } else {
        query = query.in("item_id", itemIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      return roundToCents((data ?? []).reduce((sum, t) => sum + t.amount, 0));
    },
  });
}
