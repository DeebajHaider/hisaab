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
  categoriesSkipped: number;
  itemsSkipped: number;
  categoriesRestored: number;
  itemsRestored: number;
}

/**
 * Bulk-import a plan into a budget, additively, restoring archived rows where
 * names match.
 *
 * Merge semantics:
 * - Categories matched by name (case-insensitive, trimmed):
 *   - Active match → reuse, leave settings untouched (skip count++)
 *   - Archived match → un-archive, leave settings untouched (restored count++)
 *   - No match → create new (insert count++)
 * - Items matched by (category, name) within a category:
 *   - Same three-way logic: skip / restore / create
 * - Result is idempotent: re-running the same plan inserts nothing new and
 *   doesn't re-archive anything.
 *
 * Caveats:
 * - Not transactional. If items insert fails after categories succeed, the
 *   categories stay restored or created.
 */
export function useImportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ budgetId, plan }: ImportInput): Promise<ImportResult> => {
      // 1. Load existing categories AND items, including archived ones.
      const { data: existingCategories, error: catFetchError } = await supabase
        .from("categories")
        .select("id, name, is_archived")
        .eq("budget_id", budgetId);
      if (catFetchError) throw catFetchError;

      const { data: existingItems, error: itemFetchError } = await supabase
        .from("items")
        .select(
          "id, name, category_id, is_archived, category:categories!inner(budget_id)",
        )
        .eq("category.budget_id", budgetId);
      if (itemFetchError) throw itemFetchError;

      const norm = (s: string) => s.trim().toLowerCase();

      // Map of category name → existing record (active or archived).
      // If both exist with the same name (which can happen since deletion
      // doesn't enforce name uniqueness), prefer active over archived.
      const existingCategoryByName = new Map<
        string,
        { id: string; is_archived: boolean }
      >();
      (existingCategories ?? []).forEach((cat) => {
        const key = norm(cat.name);
        const current = existingCategoryByName.get(key);
        if (!current || (current.is_archived && !cat.is_archived)) {
          existingCategoryByName.set(key, {
            id: cat.id,
            is_archived: cat.is_archived,
          });
        }
      });

      // Map of (categoryId, normalizedItemName) → item record.
      // Same active-preferred dedup as above for the rare case of duplicates.
      const existingItemMap = new Map<
        string,
        { id: string; is_archived: boolean }
      >();
      (existingItems ?? []).forEach((item) => {
        const key = `${item.category_id}::${norm(item.name)}`;
        const current = existingItemMap.get(key);
        if (!current || (current.is_archived && !item.is_archived)) {
          existingItemMap.set(key, {
            id: item.id,
            is_archived: item.is_archived,
          });
        }
      });

      // 2. Walk plan categories: classify each as skip/restore/insert.
      const categoriesToInsert: Array<{
        budget_id: string;
        name: string;
        tracks_person: boolean;
        sort_order: number;
      }> = [];
      const categoryIdsToRestore: string[] = [];
      let categoriesSkipped = 0;

      // Find baseline sort_order — count of active categories
      const activeCategoryCount = (existingCategories ?? []).filter(
        (c) => !c.is_archived,
      ).length;
      let nextSortOrder = activeCategoryCount;

      for (const planCat of plan.categories) {
        const existing = existingCategoryByName.get(norm(planCat.name));
        if (!existing) {
          categoriesToInsert.push({
            budget_id: budgetId,
            name: planCat.name,
            tracks_person: planCat.tracks_person,
            sort_order: nextSortOrder++,
          });
        } else if (existing.is_archived) {
          categoryIdsToRestore.push(existing.id);
          // Note: we DON'T update tracks_person on restore. User's last setting wins.
        } else {
          categoriesSkipped++;
        }
      }

      // 3. Restore archived categories (un-archive).
      if (categoryIdsToRestore.length > 0) {
        const { error } = await supabase
          .from("categories")
          .update({ is_archived: false })
          .in("id", categoryIdsToRestore);
        if (error) throw error;
      }

      // 4. Insert new categories, get IDs back.
      const newCategories: Array<{ id: string; name: string }> = [];
      if (categoriesToInsert.length > 0) {
        const { data: inserted, error } = await supabase
          .from("categories")
          .insert(categoriesToInsert)
          .select("id, name");
        if (error) throw error;
        if (!inserted) throw new Error("No categories returned after insert");
        newCategories.push(...inserted);
      }

      // 5. Build a unified name → id map for items to reference.
      // Includes existing categories (active OR newly-restored) and newly-inserted ones.
      const allCategoryIdsByName = new Map<string, string>();
      existingCategoryByName.forEach((info, name) => {
        allCategoryIdsByName.set(name, info.id);
      });
      newCategories.forEach((cat) => {
        allCategoryIdsByName.set(norm(cat.name), cat.id);
      });

      // 6. Walk plan items: classify each as skip/restore/insert.
      const itemsToInsert: Array<{
        category_id: string;
        name: string;
        unit: string | null;
        default_rate: number | null;
        default_mode: "lump" | "rate_qty";
        sort_order: number;
      }> = [];
      const itemIdsToRestore: string[] = [];
      let itemsSkipped = 0;

      // Per-category sort_order baselines: count of active items per category
      const activeItemCountByCategory = new Map<string, number>();
      (existingItems ?? []).forEach((item) => {
        if (!item.is_archived) {
          const c = activeItemCountByCategory.get(item.category_id) ?? 0;
          activeItemCountByCategory.set(item.category_id, c + 1);
        }
      });
      const itemSortOrderByCategory = new Map<string, number>();

      for (const planItem of plan.items) {
        const categoryId = allCategoryIdsByName.get(norm(planItem.category_name));
        if (!categoryId) {
          throw new Error(
            `Internal: category not found for item ${planItem.name}`,
          );
        }

        const itemKey = `${categoryId}::${norm(planItem.name)}`;
        const existing = existingItemMap.get(itemKey);

        if (!existing) {
          // New item
          const baseSortOrder =
            itemSortOrderByCategory.get(categoryId) ??
            activeItemCountByCategory.get(categoryId) ??
            0;
          itemSortOrderByCategory.set(categoryId, baseSortOrder + 1);

          itemsToInsert.push({
            category_id: categoryId,
            name: planItem.name,
            unit: planItem.unit,
            default_rate: planItem.default_rate,
            default_mode: planItem.default_mode,
            sort_order: baseSortOrder,
          });
          // Mark in our local map so within-plan duplicates are caught
          existingItemMap.set(itemKey, { id: "pending", is_archived: false });
        } else if (existing.is_archived) {
          itemIdsToRestore.push(existing.id);
          // Update local map so the item counts as "active" for the rest of this run
          existingItemMap.set(itemKey, { id: existing.id, is_archived: false });
        } else {
          itemsSkipped++;
        }
      }

      // 7. Restore archived items.
      if (itemIdsToRestore.length > 0) {
        const { error } = await supabase
          .from("items")
          .update({ is_archived: false })
          .in("id", itemIdsToRestore);
        if (error) throw error;
      }

      // 8. Insert new items.
      if (itemsToInsert.length > 0) {
        const { error } = await supabase.from("items").insert(itemsToInsert);
        if (error) throw error;
      }

      return {
        categoriesInserted: categoriesToInsert.length,
        itemsInserted: itemsToInsert.length,
        categoriesSkipped,
        itemsSkipped,
        categoriesRestored: categoryIdsToRestore.length,
        itemsRestored: itemIdsToRestore.length,
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