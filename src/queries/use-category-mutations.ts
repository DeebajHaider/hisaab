import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface CreateCategoryInput {
  budgetId: string;
  name: string;
  tracksPerson?: boolean;
  color?: string | null;
}

/**
 * Create a new category in a budget.
 *
 * sort_order is computed server-side by counting existing categories
 * — new categories appear at the end of the list.
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      // Find the next sort_order. count: 'exact' tells Supabase to return
      // the total matching rows even when we don't fetch the data.
      const { count, error: countError } = await supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("budget_id", input.budgetId);

      if (countError) throw countError;

      const { error } = await supabase.from("categories").insert({
        budget_id: input.budgetId,
        name: input.name,
        tracks_person: input.tracksPerson ?? false,
        color: input.color ?? null,
        sort_order: count ?? 0,
      });

      // Note: not selecting the inserted row (see the comment in
      // use-create-budget.ts about RLS + RETURNING). Invalidation
      // refetches the list with the new row.
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["categories", variables.budgetId],
      });
    },
  });
}

interface UpdateCategoryInput {
  id: string;
  budgetId: string; // for cache invalidation
  patch: {
    name?: string;
    tracksPerson?: boolean;
    color?: string | null;
    sortOrder?: number;
  };
}

/**
 * Patch a category. Pass only the fields being changed.
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCategoryInput) => {
      // Translate camelCase keys to snake_case columns.
      // Doing this explicitly rather than spreading prevents accidental writes.
      const dbPatch: Record<string, unknown> = {};
      if (input.patch.name !== undefined) dbPatch.name = input.patch.name;
      if (input.patch.tracksPerson !== undefined) dbPatch.tracks_person = input.patch.tracksPerson;
      if (input.patch.color !== undefined) dbPatch.color = input.patch.color;
      if (input.patch.sortOrder !== undefined) dbPatch.sort_order = input.patch.sortOrder;

      const { error } = await supabase
        .from("categories")
        .update(dbPatch)
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["categories", variables.budgetId],
      });
      // Item display includes category name, so invalidate items too
      queryClient.invalidateQueries({
        queryKey: ["items", variables.budgetId],
      });
    },
  });
}

interface ArchiveCategoryInput {
  id: string;
  budgetId: string;
  // Pass false to un-archive
  archived?: boolean;
}

/**
 * Soft-delete (archive) or restore a category.
 * Items in the category are not auto-archived — but they'll be hidden
 * from default views once their parent category is hidden.
 */
export function useArchiveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ArchiveCategoryInput) => {
      const archived = input.archived ?? true;

      // Update the category itself
      const { error: catError } = await supabase
        .from("categories")
        .update({ is_archived: archived })
        .eq("id", input.id);
      if (catError) throw catError;

      // Cascade: when archiving, also archive all items in this category.
      // When un-archiving, do NOT cascade-restore items — the user may want
      // to restore items selectively.
      if (archived) {
        const { error: itemError } = await supabase
          .from("items")
          .update({ is_archived: true })
          .eq("category_id", input.id);
        if (itemError) throw itemError;
      }
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

