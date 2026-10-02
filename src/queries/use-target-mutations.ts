import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";
import { toast } from "sonner";

interface CreateTargetInput {
  budgetId: string;
  name: string;
  targetAmount: number;
  startDate: string;
  endDate: string;
  categoryIds: string[];
  itemIds: string[];
}

export function useCreateTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTargetInput) => {
      const { error } = await supabase.from("targets").insert({
        budget_id: input.budgetId,
        name: input.name,
        target_amount: input.targetAmount,
        start_date: input.startDate,
        end_date: input.endDate,
        category_ids: input.categoryIds,
        item_ids: input.itemIds,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success("Target created.");
      queryClient.invalidateQueries({ queryKey: ["targets", variables.budgetId] });
    },
    onError: (error) => {
      toast.error("Couldn't create target.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

interface UpdateTargetInput {
  id: string;
  budgetId: string;
  patch: {
    name?: string;
    targetAmount?: number;
    startDate?: string;
    endDate?: string;
    categoryIds?: string[];
    itemIds?: string[];
  };
}

export function useUpdateTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTargetInput) => {
      const dbPatch: Database["public"]["Tables"]["targets"]["Update"] = {};
      if (input.patch.name !== undefined) dbPatch.name = input.patch.name;
      if (input.patch.targetAmount !== undefined) dbPatch.target_amount = input.patch.targetAmount;
      if (input.patch.startDate !== undefined) dbPatch.start_date = input.patch.startDate;
      if (input.patch.endDate !== undefined) dbPatch.end_date = input.patch.endDate;
      if (input.patch.categoryIds !== undefined) dbPatch.category_ids = input.patch.categoryIds;
      if (input.patch.itemIds !== undefined) dbPatch.item_ids = input.patch.itemIds;

      const { error } = await supabase.from("targets").update(dbPatch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success("Target updated.");
      queryClient.invalidateQueries({ queryKey: ["targets", variables.budgetId] });
      // Tracked categories/items or the date range may have changed —
      // what "spent" means for this target needs recomputing.
      queryClient.invalidateQueries({ queryKey: ["target-spent", variables.id] });
    },
    onError: (error) => {
      toast.error("Couldn't update target.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

interface DeleteTargetInput {
  id: string;
  budgetId: string;
}

export function useDeleteTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteTargetInput) => {
      const { error } = await supabase.from("targets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success("Target deleted.");
      queryClient.invalidateQueries({ queryKey: ["targets", variables.budgetId] });
    },
    onError: (error) => {
      toast.error("Couldn't delete target.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}
