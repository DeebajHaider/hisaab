import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ImportPlan } from "@/lib/import/template-import";

interface ImportInput {
  budgetId: string;
  plan: ImportPlan;
}

interface ImportResult {
  categoriesInserted: number;
  itemsInserted: number;
}

/**
 * Bulk-insert categories then items from a validated import plan.
 *
 * Caveats:
 * - We don't wrap this in a transaction. If the second insert fails, the first
 *   is left committed. For our use case (small imports, low contention), this
 *   is acceptable and the user can re-run after fixing the issue.
 * - sort_order is assigned based on position in the arrays, plus the count of
 *   existing categories/items so a re-import doesn't conflict with prior ones.
 */
export function useImportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ budgetId, plan }: ImportInput): Promise<ImportResult> => {
      // 1. Find current sort_order baseline so we append, not collide
      const { count: existingCategoryCount, error: countError } = await supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("budget_id", budgetId);

      if (countError) throw countError;
      const categoryBase = existingCategoryCount ?? 0;

      // 2. Insert categories. Use .select() to get back IDs because we need them
      //    to map items to categories.
      //
      //    Note: this is the one place we DO need .select() despite the RLS
      //    quirk we hit earlier. Categories use the standard editor policy
      //    rather than the budget-trigger pattern, so .select() works fine here.
      const categoryRows = plan.categories.map((cat, idx) => ({
        budget_id: budgetId,
        name: cat.name,
        tracks_person: cat.tracks_person,
        sort_order: categoryBase + idx,
      }));

      const { data: insertedCategories, error: catError } = await supabase
        .from("categories")
        .insert(categoryRows)
        .select("id, name");

      if (catError) throw catError;
      if (!insertedCategories) throw new Error("No categories returned after insert");

      // 3. Build a name → id map. We rely on the insert returning rows in input order
      //    (which Supabase does for bulk inserts).
      const categoryIdByName = new Map<string, string>();
      insertedCategories.forEach((cat) => {
        categoryIdByName.set(cat.name, cat.id);
      });

      // 4. Insert items, computing per-category sort_order
      const itemSortOrderByCategory = new Map<string, number>();
      const itemRows = plan.items.map((item) => {
        const categoryId = categoryIdByName.get(item.category_name);
        if (!categoryId) {
          // This would be a bug in our plan-building, not a runtime issue
          throw new Error(`Category not found in import plan: ${item.category_name}`);
        }

        const sortOrder = itemSortOrderByCategory.get(categoryId) ?? 0;
        itemSortOrderByCategory.set(categoryId, sortOrder + 1);

        return {
          category_id: categoryId,
          name: item.name,
          unit: item.unit,
          default_rate: item.default_rate,
          default_mode: item.default_mode,
          sort_order: sortOrder,
        };
      });

      const { error: itemError } = await supabase.from("items").insert(itemRows);
      if (itemError) throw itemError;

      return {
        categoriesInserted: insertedCategories.length,
        itemsInserted: itemRows.length,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["categories", variables.budgetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["items", variables.budgetId],
      });
    },
  });
}