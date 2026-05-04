import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";

// The base item row from the schema
export type Item = Database["public"]["Tables"]["items"]["Row"];

// What we actually return: item + a tiny bit of category info for display.
// We narrow the join shape so TypeScript knows what fields are available.
export type ItemWithCategory = Item & {
  category: {
    id: string;
    name: string;
    budget_id: string;
    tracks_person: boolean;
  } | null;
};

/**
 * Fetch all items in a budget with their categories joined.
 *
 * Uses Supabase's "embedded resource" syntax: select("*, category:categories(...)")
 * pulls the item row plus a nested object with the chosen category fields.
 * Much faster than two round-trips.
 */
export function useItems(
  budgetId: string | undefined,
  opts: { includeArchived?: boolean } = {},
) {
  return useQuery({
    queryKey: ["items", budgetId, opts.includeArchived ?? false],
    enabled: !!budgetId,
    queryFn: async (): Promise<ItemWithCategory[]> => {
      let query = supabase
        .from("items")
        // The aliased-join syntax: "category:categories(id, name, ...)"
        // means "fetch items, and include a nested 'category' object with
        // those fields from the categories table."
        .select("*, category:categories!inner(id, name, budget_id, tracks_person)")
        // Filter on a joined column using the pattern category.budget_id.eq.X
        .eq("category.budget_id", budgetId!);

      if (!opts.includeArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query.order("sort_order", { ascending: true });
      if (error) throw error;

      // Cast through unknown because Supabase's generated types don't perfectly
      // capture custom join shapes — we know what we asked for.
      return (data ?? []) as unknown as ItemWithCategory[];
    },
  });
}