import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ---------- Rename ----------

interface UpdateBudgetInput {
  id: string;
  name: string;
}

/**
 * Rename a budget. Invalidating ["budgets"] refreshes both the budgets
 * list and the single-budget query in BudgetLayout, so the sidebar name
 * updates immediately without a page reload.
 */
export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: UpdateBudgetInput) => {
      const { error } = await supabase
        .from("budgets")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Budget renamed.");
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: (error) => {
      toast.error("Couldn't rename budget.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

// ---------- Delete ----------

interface DeleteBudgetInput {
  id: string;
}

/**
 * Hard-delete a budget. All child data (categories, items, transactions,
 * income, savings, people, members, invites) cascades via FK constraints.
 * Navigation to /app happens in the component after the promise resolves.
 */
export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: DeleteBudgetInput) => {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: (error) => {
      toast.error("Couldn't delete budget.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}