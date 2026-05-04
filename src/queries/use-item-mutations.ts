import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface CreateItemInput {
  budgetId: string;        // for cache invalidation
  categoryId: string;
  name: string;
  unit?: string | null;
  defaultRate?: number | null;
  defaultMode?: "lump" | "rate_qty";
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateItemInput) => {
      // Sort order: end of the items list within this category
      const { count, error: countError } = await supabase
        .from("items")
        .select("id", { count: "exact", head: true })
        .eq("category_id", input.categoryId);

      if (countError) throw countError;

      const { error } = await supabase.from("items").insert({
        category_id: input.categoryId,
        name: input.name,
        unit: input.unit ?? null,
        default_rate: input.defaultRate ?? null,
        default_mode: input.defaultMode ?? "lump",
        sort_order: count ?? 0,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["items", variables.budgetId],
      });
    },
  });
}

interface UpdateItemInput {
  id: string;
  budgetId: string;
  patch: {
    name?: string;
    categoryId?: string;       // can move an item between categories
    unit?: string | null;
    defaultRate?: number | null;
    defaultMode?: "lump" | "rate_qty";
    sortOrder?: number;
  };
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateItemInput) => {
      const dbPatch: Record<string, unknown> = {};
      if (input.patch.name !== undefined) dbPatch.name = input.patch.name;
      if (input.patch.categoryId !== undefined) dbPatch.category_id = input.patch.categoryId;
      if (input.patch.unit !== undefined) dbPatch.unit = input.patch.unit;
      if (input.patch.defaultRate !== undefined) dbPatch.default_rate = input.patch.defaultRate;
      if (input.patch.defaultMode !== undefined) dbPatch.default_mode = input.patch.defaultMode;
      if (input.patch.sortOrder !== undefined) dbPatch.sort_order = input.patch.sortOrder;

      const { error } = await supabase
        .from("items")
        .update(dbPatch)
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["items", variables.budgetId],
      });
    },
  });
}

interface ArchiveItemInput {
  id: string;
  budgetId: string;
  archived?: boolean;
}

export function useArchiveItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ArchiveItemInput) => {
      const { error } = await supabase
        .from("items")
        .update({ is_archived: input.archived ?? true })
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["items", variables.budgetId],
      });
    },
  });
}