import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface RecentItemUsage {
  itemId: string;
  lastUsedAt: string;  // ISO timestamp
  useCount: number;
}

/**
 * Aggregate item usage from recent transactions.
 *
 * Used by the entry form for two purposes:
 *  1. Show recent items at the top of an empty search dropdown
 *  2. Boost search ranking for recently-used items
 *
 * Window is configurable but defaults to 30 days. We aggregate client-side
 * because PostgREST doesn't expose an aggregation API directly. For typical
 * volumes (a few hundred transactions/month) this is fine.
 */
export function useRecentItems(
  budgetId: string | undefined,
  opts: { days?: number } = {},
) {
  const days = opts.days ?? 30;

  return useQuery({
    queryKey: ["recent-items", budgetId, days],
    enabled: !!budgetId,
    queryFn: async (): Promise<RecentItemUsage[]> => {
      // Compute the cutoff date in the user's local timezone, then send as ISO date.
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffISO = cutoff.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("transactions")
        .select("item_id, created_at")
        .eq("budget_id", budgetId!)
        .gte("date", cutoffISO)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Aggregate: for each item_id, track the most recent created_at and the count.
      const byItem = new Map<string, RecentItemUsage>();
      for (const row of data ?? []) {
        const existing = byItem.get(row.item_id);
        if (existing) {
          existing.useCount++;
        } else {
          byItem.set(row.item_id, {
            itemId: row.item_id,
            lastUsedAt: row.created_at,
            useCount: 1,
          });
        }
      }

      // Sort by recency (most recent first). Since we ordered the query
      // by created_at desc, the FIRST occurrence of each item is its most
      // recent — already captured above.
      return Array.from(byItem.values()).sort((a, b) =>
        b.lastUsedAt.localeCompare(a.lastUsedAt),
      );
    },
  });
}