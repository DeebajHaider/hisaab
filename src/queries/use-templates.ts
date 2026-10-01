import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";

export type Template = Database["public"]["Tables"]["transaction_templates"]["Row"];

// What we actually return: template + the item/category/person names needed
// to render it (as a quick-add button, or a row in the Manage list).
export type TemplateWithRelations = Template & {
  item: { id: string; name: string; unit: string | null } | null;
  category: { id: string; name: string; tracks_person: boolean } | null;
  person: { id: string; name: string } | null;
};

/**
 * Fetch all templates in a budget, with item/category/person joined for
 * display. budget_id is a direct column (like categories), so filtering is
 * a plain eq — no inner-join indirection needed the way items requires.
 */
export function useTemplates(
  budgetId: string | undefined,
  opts: { includeArchived?: boolean } = {},
) {
  return useQuery({
    queryKey: ["templates", budgetId, opts.includeArchived ?? false],
    enabled: !!budgetId,
    queryFn: async (): Promise<TemplateWithRelations[]> => {
      let query = supabase
        .from("transaction_templates")
        .select(`
          *,
          item:items(id, name, unit),
          category:categories(id, name, tracks_person),
          person:people(id, name)
        `)
        .eq("budget_id", budgetId!);

      if (!opts.includeArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query.order("sort_order", { ascending: true });
      if (error) throw error;

      return (data ?? []) as unknown as TemplateWithRelations[];
    },
  });
}
