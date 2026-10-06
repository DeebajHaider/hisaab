import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

function reportError(title: string) {
  return (error: unknown) =>
    toast.error(title, {
      description: error instanceof Error ? error.message : "Unknown error.",
      duration: 6000,
    });
}

interface CreateInput {
  budgetId: string;
  source: string;
  amount: number;
  notes?: string | null;
}

export function useCreateIncomeTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInput) => {
      const { count, error: countError } = await supabase
        .from("income_templates")
        .select("id", { count: "exact", head: true })
        .eq("budget_id", input.budgetId);
      if (countError) throw countError;

      const { error } = await supabase.from("income_templates").insert({
        budget_id: input.budgetId,
        source: input.source,
        amount: input.amount,
        notes: input.notes ?? null,
        sort_order: count ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      toast.success("Income template created.");
      queryClient.invalidateQueries({ queryKey: ["income-templates", v.budgetId] });
    },
    onError: reportError("Couldn't create income template."),
  });
}

interface UpdateInput {
  id: string;
  budgetId: string;
  patch: { source?: string; amount?: number; notes?: string | null };
}

export function useUpdateIncomeTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: UpdateInput) => {
      const { error } = await supabase.from("income_templates").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      toast.success("Income template updated.");
      queryClient.invalidateQueries({ queryKey: ["income-templates", v.budgetId] });
    },
    onError: reportError("Couldn't update income template."),
  });
}

interface ArchiveInput {
  id: string;
  budgetId: string;
  archived?: boolean;
}

export function useArchiveIncomeTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, archived }: ArchiveInput) => {
      const { error } = await supabase
        .from("income_templates")
        .update({ is_archived: archived ?? true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      toast.success(v.archived === false ? "Template restored." : "Template archived.");
      queryClient.invalidateQueries({ queryKey: ["income-templates", v.budgetId] });
    },
    onError: reportError("Couldn't update income template."),
  });
}
