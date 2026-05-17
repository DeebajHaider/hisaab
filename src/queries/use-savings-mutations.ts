import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { savingsKeys } from "./savings-keys";
import type { Database } from "@/types/db";

interface CreateSavingsInput {
  budgetId: string;
  name: string;
  amount: number;
  date: string;
  notes?: string | null;
}

export function useCreateSavings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSavingsInput) => {
      const { error } = await supabase.from("savings_entries").insert({
        budget_id: input.budgetId,
        name: input.name,
        amount: input.amount,
        date: input.date,
        notes: input.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: savingsKeys.byBudget(variables.budgetId),
      });
    },
  });
}

interface UpdateSavingsInput {
  id: string;
  budgetId: string;
  patch: {
    name?: string;
    amount?: number;
    date?: string;
    notes?: string | null;
  };
}

export function useUpdateSavings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateSavingsInput) => {
      const dbPatch: Database["public"]["Tables"]["savings_entries"]["Update"] = {};
      if (input.patch.name !== undefined) dbPatch.name = input.patch.name;
      if (input.patch.amount !== undefined) dbPatch.amount = input.patch.amount;
      if (input.patch.date !== undefined) dbPatch.date = input.patch.date;
      if (input.patch.notes !== undefined) dbPatch.notes = input.patch.notes;

      const { error } = await supabase
        .from("savings_entries")
        .update(dbPatch)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: savingsKeys.byBudget(variables.budgetId),
      });
    },
  });
}

interface DeleteSavingsInput {
  id: string;
  budgetId: string;
}

export function useDeleteSavings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeleteSavingsInput) => {
      const { error } = await supabase
        .from("savings_entries")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: savingsKeys.byBudget(variables.budgetId),
      });
    },
  });
}