import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";
import { toast } from "sonner";

interface CreateCategoryInput {
  budgetId: string;
  name: string;
  tracksPerson?: boolean;
  color?: string | null;
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
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

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["categories", variables.budgetId],
      });
    },
    onError: (error) => {
      toast.error("Couldn't create category.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

interface UpdateCategoryInput {
  id: string;
  budgetId: string;
  patch: {
    name?: string;
    tracksPerson?: boolean;
    color?: string | null;
    sortOrder?: number;
  };
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCategoryInput) => {
      const dbPatch: Database["public"]["Tables"]["categories"]["Update"] = {};
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
      queryClient.invalidateQueries({
        queryKey: ["items", variables.budgetId],
      });
    },
    onError: (error) => {
      toast.error("Couldn't update category.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

interface ArchiveCategoryInput {
  id: string;
  budgetId: string;
  archived?: boolean;
}

export function useArchiveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ArchiveCategoryInput) => {
      const archived = input.archived ?? true;

      const { error: catError } = await supabase
        .from("categories")
        .update({ is_archived: archived })
        .eq("id", input.id);
      if (catError) throw catError;

      // Cascade archive to items; don't cascade restore (user picks selectively).
      if (archived) {
        const { error: itemError } = await supabase
          .from("items")
          .update({ is_archived: true })
          .eq("category_id", input.id);
        if (itemError) throw itemError;
      }
    },
    onSuccess: (_, variables) => {
      // The same mutation handles both archive and restore — pick the right toast.
      toast.success(
        variables.archived === false ? "Category restored." : "Category archived.",
      );
      queryClient.invalidateQueries({
        queryKey: ["categories", variables.budgetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["items", variables.budgetId],
      });
    },
    onError: (error) => {
      toast.error("Couldn't update category.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

interface DeleteCategoryInput {
  id: string;
  budgetId: string;
}

/**
 * Hard-delete an archived category. Cascades through items to transactions
 * via the FK chain already wired in the schema. Invalidates transactions
 * and trends keys because historical data changes.
 */
export function useDeleteCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteCategoryInput) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { budgetId }) => {
      toast.success("Category permanently deleted.");
      qc.invalidateQueries({ queryKey: ["categories", budgetId] });
      qc.invalidateQueries({ queryKey: ["items", budgetId] });
      qc.invalidateQueries({ queryKey: ["transactions", budgetId] });
      qc.invalidateQueries({ queryKey: ["trends", budgetId] });
    },
    onError: (error) => {
      toast.error("Couldn't delete category.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}
