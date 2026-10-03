import { newId } from "@/lib/uuid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";
import { toast } from "sonner";
import { invalidateTransactionData } from "./invalidate-transactions";

interface CreateItemInput {
  budgetId: string;
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
      const { count, error: countError } = await supabase
        .from("items")
        .select("id", { count: "exact", head: true })
        .eq("category_id", input.categoryId);

      if (countError) throw countError;

      // Generated client-side so callers learn the new id without reading
      // the row back (inserts here deliberately don't use .select()).
      const id = newId();
      const { error } = await supabase.from("items").insert({
        id,
        category_id: input.categoryId,
        name: input.name,
        unit: input.unit ?? null,
        default_rate: input.defaultRate ?? null,
        default_mode: input.defaultMode ?? "lump",
        sort_order: count ?? 0,
      });

      if (error) throw error;
      return id;
    },
    // Returned so mutateAsync resolves only once the items list includes
    // the new row — callers can select it immediately.
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["items", variables.budgetId],
      }),
    onError: (error) => {
      toast.error("Couldn't create item.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

interface UpdateItemInput {
  id: string;
  budgetId: string;
  patch: {
    name?: string;
    categoryId?: string;
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
      const dbPatch: Database["public"]["Tables"]["items"]["Update"] = {};
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
      // Templates join item name for display — stale otherwise after a rename.
      queryClient.invalidateQueries({
        queryKey: ["templates", variables.budgetId],
      });
      // Targets resolve tracked item names client-side against this list too.
      queryClient.invalidateQueries({
        queryKey: ["targets", variables.budgetId],
      });
    },
    onError: (error) => {
      toast.error("Couldn't update item.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
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
      toast.success(
        variables.archived === false ? "Item restored." : "Item archived.",
      );
      queryClient.invalidateQueries({
        queryKey: ["items", variables.budgetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["templates", variables.budgetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["targets", variables.budgetId],
      });
    },
    onError: (error) => {
      toast.error("Couldn't update item.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

interface DeleteItemInput {
  id: string;
  budgetId: string;
}

/**
 * Hard-delete an archived item. Cascades to transactions via FK.
 * Invalidates transactions and trends because historical data changes.
 */
export function useDeleteItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteItemInput) => {
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { budgetId }) => {
      toast.success("Item permanently deleted.");
      qc.invalidateQueries({ queryKey: ["items", budgetId] });
      invalidateTransactionData(qc, budgetId);
    },
    onError: (error) => {
      toast.error("Couldn't delete item.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}
